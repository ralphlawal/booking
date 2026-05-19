const Service = require('../models/Service');
const { checkAutoVerify } = require('../utils/autoVerify');

exports.list = async (req, res) => {
  try {
    const services = await Service.findByBusinessId(req.business.id);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

exports.listPublic = async (req, res) => {
  try {
    const services = await Service.findByBusinessId(req.business.id, true);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, price, duration_minutes } = req.body;
    const service = await Service.create({
      business_id: req.business.id,
      name,
      description,
      price,
      duration_minutes,
    });
    checkAutoVerify(req.business.id).catch(() => {});
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service' });
  }
};

exports.update = async (req, res) => {
  try {
    const service = await Service.update(req.params.id, req.business.id, req.body);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    checkAutoVerify(req.business.id).catch(() => {});
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Service.delete(req.params.id, req.business.id);
    if (!deleted) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
};
