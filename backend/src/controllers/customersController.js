const Customer = require('../models/Customer');

exports.list = async (req, res) => {
  try {
    const customers = await Customer.findByBusinessId(req.business.id);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Customer.findBookings(req.params.id, req.business.id);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer bookings' });
  }
};

exports.updateNotes = async (req, res) => {
  try {
    const customer = await Customer.updateNotes(req.params.id, req.business.id, req.body.notes ?? '');
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notes' });
  }
};
