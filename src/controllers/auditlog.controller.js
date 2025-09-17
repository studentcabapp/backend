import AuditLog from '../models/auditlog.model.js';

// GET all logs (Admin/Hacker)
export const getAllLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET specific log by ID (Admin/Hacker)
export const getLogById = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
