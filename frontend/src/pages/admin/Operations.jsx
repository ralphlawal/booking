import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { operationsAPI } from '../../services/api';

const money = (value) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));

export default function Operations() {
  const [report, setReport] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: '', cost: '', stock_quantity: 0, low_stock_threshold: 0, category: '', supplier: '' });

  const refresh = async () => {
    setLoading(true);
    try {
      const [reportData, productData] = await Promise.all([operationsAPI.report(), operationsAPI.products()]);
      setReport(reportData); setProducts(productData);
    } catch (err) { toast.error(err.message || 'Could not load operations data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const addProduct = async (event) => {
    event.preventDefault();
    try {
      await operationsAPI.createProduct({ ...form, price: Number(form.price), cost: Number(form.cost || 0), stock_quantity: Number(form.stock_quantity || 0), low_stock_threshold: Number(form.low_stock_threshold || 0) });
      toast.success('Product added'); setAdding(false); setForm({ name: '', sku: '', price: '', cost: '', stock_quantity: 0, low_stock_threshold: 0, category: '', supplier: '' }); refresh();
    } catch (err) { toast.error(err.message || 'Could not add product'); }
  };

  const adjust = async (product, amount) => {
    try { await operationsAPI.adjustStock(product.id, { type: amount > 0 ? 'stock_in' : 'stock_out', quantity: amount }); toast.success('Stock updated'); refresh(); }
    catch (err) { toast.error(err.message || 'Could not update stock'); }
  };

  const cards = [
    ['Revenue', report?.revenue], ['Gross sales', report?.gross_sales], ['Refunds', report?.refunds], ['Discounts', report?.discounts], ['Tips', report?.tips], ['Product sales', report?.product_sales], ['Service sales', report?.service_sales],
  ];
  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap gap-3 items-start justify-between">
      <div><h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Operations</h1><p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Sales, payments, inventory, and low-stock alerts</p></div>
      <button className="btn-primary" onClick={() => setAdding(v => !v)}>{adding ? 'Close' : 'Add product'}</button>
    </div>
    {adding && <form onSubmit={addProduct} className="rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}>
      {[['name','Name *'], ['sku','SKU'], ['price','Price *'], ['cost','Cost'], ['stock_quantity','Opening stock'], ['low_stock_threshold','Low-stock threshold'], ['category','Category'], ['supplier','Supplier']].map(([key,label]) => <label key={key} className="text-xs font-semibold" style={{ color: 'var(--bam-text-muted)' }}>{label}<input required={key === 'name' || key === 'price'} type={['price','cost','stock_quantity','low_stock_threshold'].includes(key) ? 'number' : 'text'} min="0" step={['price','cost'].includes(key) ? '0.01' : '1'} value={form[key]} onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))} className="input mt-1 w-full" /></label>)}
      <div className="sm:col-span-2 lg:col-span-4"><button className="btn-primary" type="submit">Save product</button></div>
    </form>}
    {loading ? <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface)' }} /> : <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(([label,value]) => <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}><p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{label}</p><p className="mt-1 font-bold text-xl" style={{ color: 'var(--bam-text)' }}>{money(value)}</p></div>)}</div>
      {report?.low_stock?.length > 0 && <div className="rounded-2xl p-5 border border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/10"><h2 className="font-bold text-amber-700 dark:text-amber-300">Low stock</h2><div className="mt-3 space-y-2">{report.low_stock.map(product => <p key={product.id} className="text-sm" style={{ color: 'var(--bam-text)' }}>{product.alert} <span style={{ color: 'var(--bam-text-muted)' }}>({product.stock_quantity} remaining)</span></p>)}</div></div>}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}><div className="p-5 flex justify-between"><h2 className="font-bold" style={{ color: 'var(--bam-text)' }}>Inventory</h2><span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>{products.length} products</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}><tr><th className="p-3 text-left">Product</th><th className="p-3 text-left">SKU</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Adjust</th></tr></thead><tbody>{products.map(p => <tr key={p.id} className="border-t" style={{ borderColor: 'var(--bam-border)', color: 'var(--bam-text)' }}><td className="p-3 font-medium">{p.name}{p.low_stock && <span className="ml-2 text-xs text-amber-600">Low</span>}</td><td className="p-3">{p.sku || '—'}</td><td className="p-3 text-right">{money(p.price)}</td><td className="p-3 text-right">{p.stock_quantity}</td><td className="p-3 text-right"><button onClick={() => adjust(p,-1)} className="px-2">−</button><button onClick={() => adjust(p,1)} className="px-2 text-primary-600">+</button></td></tr>)}{!products.length && <tr><td colSpan="5" className="p-8 text-center" style={{ color: 'var(--bam-text-muted)' }}>No products yet.</td></tr>}</tbody></table></div></div>
    </>}
  </div>;
}
