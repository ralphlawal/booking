const crypto = require('crypto');
const db = require('../config/database');

const MONEY = (value) => Math.round((Number(value) || 0) * 100) / 100;
const VALID_ITEM_TYPES = new Set(['service', 'product', 'package', 'membership']);
const MANUAL_METHODS = new Set(['cash', 'bank_transfer', 'other']);

function unavailable(res, err) {
  if (err?.code === '42P01' || /does not exist/i.test(err?.message || '')) {
    return res.status(503).json({ error: 'Business operations are not available until migration 038 has been applied.' });
  }
  return null;
}

async function loadCatalogItem(businessId, item) {
  const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
  if (!VALID_ITEM_TYPES.has(item.type)) {
    const error = new Error(`Unsupported checkout item type: ${item.type}`); error.status = 400; throw error;
  }
  const queries = {
    service: ['SELECT id, name, price FROM services WHERE id=$1 AND business_id=$2 AND is_active=TRUE', 'service'],
    product: ['SELECT id, name, price, stock_quantity FROM products WHERE id=$1 AND business_id=$2 AND is_active=TRUE', 'product'],
    package: ['SELECT id, name, price, session_count, valid_days FROM service_packages WHERE id=$1 AND business_id=$2 AND is_active=TRUE', 'package'],
    membership: ['SELECT id, name, price, interval, interval_count FROM membership_plans WHERE id=$1 AND business_id=$2 AND is_active=TRUE', 'membership'],
  };
  const [sql, itemType] = queries[item.type];
  const { rows } = await db.query(sql, [item.id, businessId]);
  const row = rows[0];
  if (!row) { const error = new Error(`${item.type} is unavailable`); error.status = 404; throw error; }
  if (itemType === 'product' && Number(row.stock_quantity) < quantity) {
    const error = new Error(`${row.name} has only ${row.stock_quantity} in stock`); error.status = 409; throw error;
  }
  const unitPrice = MONEY(row.price);
  return { item_type: itemType, reference_id: row.id, name: row.name, quantity, unit_price: unitPrice, line_total: MONEY(unitPrice * quantity), catalog: itemType === 'package' ? { session_count: row.session_count, valid_days: row.valid_days } : itemType === 'membership' ? { interval: row.interval, interval_count: row.interval_count } : undefined };
}

async function quoteCheckout(businessId, { items, promo_code, tip = 0 }) {
  if (!Array.isArray(items) || !items.length) { const error = new Error('At least one checkout item is required'); error.status = 400; throw error; }
  const lines = [];
  for (const item of items) lines.push(await loadCatalogItem(businessId, item));
  const subtotal = MONEY(lines.reduce((sum, line) => sum + line.line_total, 0));
  let discount = 0;
  let promoCode = null;
  if (promo_code?.trim()) {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await db.query(
      `SELECT * FROM promo_codes WHERE business_id=$1 AND UPPER(code)=UPPER($2) AND is_active=TRUE
       AND (valid_from IS NULL OR valid_from <= $3) AND (valid_until IS NULL OR valid_until >= $3)
       AND (max_uses IS NULL OR uses_count < max_uses)`, [businessId, promo_code.trim(), today]
    );
    const promo = rows[0];
    if (!promo) { const error = new Error('Invalid or expired promo code'); error.status = 400; throw error; }
    if (subtotal < Number(promo.min_order_amount || 0)) { const error = new Error('Order does not meet this promotion’s minimum'); error.status = 400; throw error; }
    discount = promo.type === 'percent' ? MONEY(subtotal * Number(promo.value) / 100) : Math.min(MONEY(promo.value), subtotal);
    promoCode = promo.code;
  }
  const { rows: taxRows } = await db.query('SELECT tax_name, rate, inclusive FROM business_tax_settings WHERE business_id=$1', [businessId]);
  const tax = taxRows[0] || { tax_name: 'Tax', rate: 0, inclusive: false };
  const netAfterDiscount = MONEY(subtotal - discount);
  const taxTotal = tax.inclusive ? MONEY(netAfterDiscount - (netAfterDiscount / (1 + Number(tax.rate) / 100))) : MONEY(netAfterDiscount * Number(tax.rate) / 100);
  const safeTip = Math.max(0, MONEY(tip));
  return { lines, subtotal, discount_total: discount, promo_code: promoCode, tax: { name: tax.tax_name, rate: Number(tax.rate), inclusive: !!tax.inclusive, amount: taxTotal }, tip_total: safeTip, total: MONEY(netAfterDiscount + (tax.inclusive ? 0 : taxTotal) + safeTip) };
}

exports.quote = async (req, res) => {
  try { res.json(await quoteCheckout(req.business.id, req.body)); }
  catch (err) { if (!unavailable(res, err)) res.status(err.status || 500).json({ error: err.message || 'Unable to calculate checkout' }); }
};
exports.quoteCheckout = quoteCheckout;

exports.listProducts = async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT p.*, CASE WHEN stock_quantity <= low_stock_threshold THEN TRUE ELSE FALSE END AS low_stock FROM products p WHERE business_id=$1 ORDER BY category NULLS LAST, name`, [req.business.id]);
    res.json(rows);
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to load products' }); }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, sku, description, price, cost = 0, stock_quantity = 0, low_stock_threshold = 0, supplier, category } = req.body;
    if (!name?.trim() || price === undefined) return res.status(400).json({ error: 'name and price are required' });
    if (Number(price) < 0 || Number(cost) < 0 || Number(stock_quantity) < 0) return res.status(400).json({ error: 'Price, cost, and stock must be non-negative' });
    const { rows } = await db.query(`INSERT INTO products (id,business_id,name,sku,description,price,cost,stock_quantity,low_stock_threshold,supplier,category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [crypto.randomUUID(), req.business.id, name.trim(), sku?.trim() || null, description?.trim() || null, MONEY(price), MONEY(cost), parseInt(stock_quantity, 10) || 0, Math.max(0, parseInt(low_stock_threshold, 10) || 0), supplier?.trim() || null, category?.trim() || null]);
    if (Number(stock_quantity) > 0) await db.query(`INSERT INTO inventory_movements (id,business_id,product_id,type,quantity,unit_cost,note,created_by) VALUES ($1,$2,$3,'stock_in',$4,$5,'Initial stock',$6)`, [crypto.randomUUID(), req.business.id, rows[0].id, parseInt(stock_quantity, 10), MONEY(cost), req.user?.id || null]);
    res.status(201).json(rows[0]);
  } catch (err) { if (!unavailable(res, err)) res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'SKU already exists for this business' : 'Unable to create product' }); }
};

exports.updateProduct = async (req, res) => {
  try {
    const allowed = ['name','sku','description','price','cost','low_stock_threshold','supplier','category','is_active'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(changes).length) return res.status(400).json({ error: 'No editable product fields supplied' });
    const columns = Object.keys(changes);
    const values = columns.map(key => ['price','cost'].includes(key) ? MONEY(changes[key]) : changes[key]);
    const set = columns.map((key, i) => `${key}=$${i + 3}`).join(', ');
    const { rows } = await db.query(`UPDATE products SET ${set}, updated_at=NOW() WHERE id=$1 AND business_id=$2 RETURNING *`, [req.params.id, req.business.id, ...values]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { if (!unavailable(res, err)) res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'SKU already exists for this business' : 'Unable to update product' }); }
};

exports.adjustStock = async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity, 10);
    const type = req.body.type;
    if (!Number.isInteger(quantity) || quantity === 0 || !['stock_in','stock_out','adjustment','return'].includes(type)) return res.status(400).json({ error: 'A non-zero quantity and valid adjustment type are required' });
    const delta = type === 'stock_out' ? -Math.abs(quantity) : quantity;
    const { rows } = await db.query(`UPDATE products SET stock_quantity=stock_quantity+$3, updated_at=NOW() WHERE id=$1 AND business_id=$2 AND stock_quantity+$3 >= 0 RETURNING *`, [req.params.id, req.business.id, delta]);
    if (!rows[0]) return res.status(409).json({ error: 'Product not found or stock cannot go below zero' });
    await db.query(`INSERT INTO inventory_movements (id,business_id,product_id,type,quantity,unit_cost,note,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [crypto.randomUUID(), req.business.id, rows[0].id, type, delta, req.body.unit_cost == null ? null : MONEY(req.body.unit_cost), req.body.note?.trim() || null, req.user?.id || null]);
    res.json(rows[0]);
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to adjust inventory' }); }
};

exports.inventoryMovements = async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT im.*, p.name AS product_name, p.sku FROM inventory_movements im JOIN products p ON p.id=im.product_id WHERE im.business_id=$1 ${req.query.product_id ? 'AND im.product_id=$2' : ''} ORDER BY im.created_at DESC LIMIT 250`, req.query.product_id ? [req.business.id, req.query.product_id] : [req.business.id]);
    res.json(rows);
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to load inventory movements' }); }
};

exports.createPosSale = async (req, res) => {
  try {
    const { items, promo_code, tip, customer_id, currency = 'gbp', payment_method = 'cash', note } = req.body;
    if (!MANUAL_METHODS.has(payment_method)) return res.status(422).json({ error: 'Card-present POS is not configured. Record cash, bank transfer, or other manual payment only.' });
    const quote = await quoteCheckout(req.business.id, { items, promo_code, tip });
    if (quote.lines.some(line => ['package', 'membership'].includes(line.item_type)) && !customer_id) {
      return res.status(400).json({ error: 'A customer is required when selling a package or membership' });
    }
    if (customer_id) {
      const { rows: customers } = await db.query('SELECT id FROM customers WHERE id=$1 AND business_id=$2', [customer_id, req.business.id]);
      if (!customers[0]) return res.status(404).json({ error: 'Customer not found' });
    }
    const orderId = crypto.randomUUID();
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const { rows } = await db.query(`INSERT INTO orders (id,business_id,customer_id,order_number,channel,status,currency,subtotal,discount_total,tax_total,tip_total,total,paid_total,note) VALUES ($1,$2,$3,$4,'pos','paid',$5,$6,$7,$8,$9,$10,$10,$11) RETURNING *`, [orderId, req.business.id, customer_id || null, orderNumber, String(currency).toLowerCase(), quote.subtotal, quote.discount_total, quote.tax.amount, quote.tip_total, quote.total, note?.trim() || null]);
    for (const line of quote.lines) {
      await db.query(`INSERT INTO order_items (id,order_id,item_type,reference_id,name,quantity,unit_price,line_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [crypto.randomUUID(), orderId, line.item_type, line.reference_id, line.name, line.quantity, line.unit_price, line.line_total]);
      if (line.item_type === 'product') {
        const changed = await db.query(`UPDATE products SET stock_quantity=stock_quantity-$3, updated_at=NOW() WHERE id=$1 AND business_id=$2 AND stock_quantity >= $3`, [line.reference_id, req.business.id, line.quantity]);
        if (!changed.rowCount) throw Object.assign(new Error(`${line.name} no longer has enough stock`), { status: 409 });
        await db.query(`INSERT INTO inventory_movements (id,business_id,product_id,type,quantity,order_id,note,created_by) VALUES ($1,$2,$3,'sale',$4,$5,$6,$7)`, [crypto.randomUUID(), req.business.id, line.reference_id, -line.quantity, orderId, `POS sale ${orderNumber}`, req.user?.id || null]);
      }
      if (line.item_type === 'package') {
        for (let count = 0; count < line.quantity; count++) {
          const expiresAt = Number(line.catalog.valid_days) > 0 ? new Date(Date.now() + Number(line.catalog.valid_days) * 86400000) : null;
          await db.query(`INSERT INTO customer_packages (id,package_id,business_id,customer_id,sessions_total,price_paid,currency,payment_status,status,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'paid','active',$8)`, [crypto.randomUUID(), line.reference_id, req.business.id, customer_id, Number(line.catalog.session_count), line.unit_price, String(currency).toLowerCase(), expiresAt]);
        }
      }
      if (line.item_type === 'membership') {
        const intervalDays = line.catalog.interval === 'year' ? 365 : line.catalog.interval === 'week' ? 7 : 30;
        for (let count = 0; count < line.quantity; count++) {
          const now = new Date(); const ends = new Date(now.getTime() + intervalDays * Math.max(1, Number(line.catalog.interval_count)) * 86400000);
          await db.query(`INSERT INTO customer_memberships (id,plan_id,business_id,customer_id,status,current_period_start,current_period_end) VALUES ($1,$2,$3,$4,'active',$5,$6)`, [crypto.randomUUID(), line.reference_id, req.business.id, customer_id, now, ends]);
        }
      }
    }
    await db.query(`INSERT INTO payment_transactions (id,business_id,order_id,provider,payment_method,kind,status,amount,currency,metadata) VALUES ($1,$2,$3,'manual',$4,'payment','succeeded',$5,$6,$7)`, [crypto.randomUUID(), req.business.id, orderId, payment_method, quote.total, String(currency).toLowerCase(), JSON.stringify({ order_number: orderNumber })]);
    if (quote.tip_total) await db.query(`INSERT INTO payment_transactions (id,business_id,order_id,provider,payment_method,kind,status,amount,currency) VALUES ($1,$2,$3,'manual',$4,'tip','succeeded',$5,$6)`, [crypto.randomUUID(), req.business.id, orderId, payment_method, quote.tip_total, String(currency).toLowerCase()]);
    if (quote.promo_code) await db.query('UPDATE promo_codes SET uses_count=uses_count+1 WHERE business_id=$1 AND UPPER(code)=UPPER($2)', [req.business.id, quote.promo_code]);
    res.status(201).json({ order: rows[0], quote });
  } catch (err) { if (!unavailable(res, err)) res.status(err.status || 500).json({ error: err.message || 'Unable to complete POS sale' }); }
};

exports.report = async (req, res) => {
  try {
    const from = req.query.from || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const params = [req.business.id, from, to];
    const inPeriod = process.env.DATABASE_URL ? 'created_at >= $2::date AND created_at < ($3::date + INTERVAL \'1 day\')' : "created_at >= $2 AND created_at < datetime($3, '+1 day')";
    const { rows: totals } = await db.query(`SELECT COALESCE(SUM(CASE WHEN kind IN ('payment','deposit','balance') AND status='succeeded' THEN amount ELSE 0 END),0) AS gross_sales, COALESCE(SUM(CASE WHEN kind='tip' AND status='succeeded' THEN amount ELSE 0 END),0) AS tips FROM payment_transactions WHERE business_id=$1 AND ${inPeriod}`, params);
    const { rows: refundRows } = await db.query(`SELECT COALESCE(SUM(amount),0) AS refunds FROM refunds WHERE business_id=$1 AND status='succeeded' AND ${inPeriod}`, params);
    const { rows: discounts } = await db.query(`SELECT COALESCE(SUM(discount_total),0) AS discounts, COALESCE(SUM(CASE WHEN channel='pos' THEN total ELSE 0 END),0) AS pos_sales FROM orders WHERE business_id=$1 AND ${inPeriod} AND status NOT IN ('cancelled')`, params);
    const { rows: salesByType } = await db.query(`SELECT oi.item_type, COALESCE(SUM(oi.line_total),0) AS total FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.business_id=$1 AND ${inPeriod.replaceAll('created_at', 'o.created_at')} AND o.status NOT IN ('cancelled') GROUP BY oi.item_type`, params);
    const { rows: methods } = await db.query(`SELECT payment_method, COALESCE(SUM(amount),0) AS total FROM payment_transactions WHERE business_id=$1 AND kind IN ('payment','deposit','balance') AND status='succeeded' AND ${inPeriod} GROUP BY payment_method`, params);
    const appointmentPeriod = inPeriod.replaceAll('created_at', 'b.created_at');
    const greatest = process.env.DATABASE_URL ? 'GREATEST(0, COALESCE(b.payment_amount, s.price) - COALESCE(b.tip_amount,0))' : 'MAX(0, COALESCE(b.payment_amount, s.price) - COALESCE(b.tip_amount,0))';
    const { rows: appointmentSales } = await db.query(`SELECT COALESCE(SUM(${greatest}),0) AS service_sales, COALESCE(SUM(COALESCE(b.tip_amount,0)),0) AS tips FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.business_id=$1 AND b.payment_status='paid' AND ${appointmentPeriod}`, params);
    const { rows: lowStock } = await db.query(`SELECT id,name,sku,stock_quantity,low_stock_threshold FROM products WHERE business_id=$1 AND is_active=TRUE AND stock_quantity <= low_stock_threshold ORDER BY stock_quantity, name`, [req.business.id]);
    const gross = MONEY(totals[0].gross_sales); const refunds = MONEY(refundRows[0].refunds);
    res.json({ period: { from, to }, revenue: MONEY(gross - refunds), gross_sales: gross, refunds, discounts: MONEY(discounts[0].discounts), tips: MONEY(Number(totals[0].tips) + Number(appointmentSales[0].tips)), product_sales: MONEY(salesByType.find(x => x.item_type === 'product')?.total), service_sales: MONEY(Number(salesByType.find(x => x.item_type === 'service')?.total || 0) + Number(appointmentSales[0].service_sales || 0)), package_sales: MONEY(salesByType.find(x => x.item_type === 'package')?.total), membership_sales: MONEY(salesByType.find(x => x.item_type === 'membership')?.total), payment_methods: methods.map(row => ({ method: row.payment_method, total: MONEY(row.total) })), low_stock: lowStock.map(product => ({ ...product, alert: `${product.name} is running low.` })) });
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to generate operations report' }); }
};

exports.getTaxSettings = async (req, res) => {
  try { const { rows } = await db.query('SELECT * FROM business_tax_settings WHERE business_id=$1', [req.business.id]); res.json(rows[0] || { tax_name: 'Tax', rate: 0, inclusive: false }); }
  catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to load tax settings' }); }
};
exports.saveTaxSettings = async (req, res) => {
  try { const { tax_name = 'Tax', rate = 0, inclusive = false } = req.body; if (Number(rate) < 0 || Number(rate) > 100) return res.status(400).json({ error: 'Tax rate must be between 0 and 100' }); const { rows } = await db.query(`INSERT INTO business_tax_settings (business_id,tax_name,rate,inclusive) VALUES ($1,$2,$3,$4) ON CONFLICT (business_id) DO UPDATE SET tax_name=EXCLUDED.tax_name,rate=EXCLUDED.rate,inclusive=EXCLUDED.inclusive,updated_at=NOW() RETURNING *`, [req.business.id, String(tax_name).slice(0, 80), Number(rate), !!inclusive]); res.json(rows[0]); }
  catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to save tax settings' }); }
};
