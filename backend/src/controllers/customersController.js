const Customer = require('../models/Customer');

exports.list = async (req, res) => {
  try {
    const customers = await Customer.findByBusinessId(req.business.id);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};
