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
