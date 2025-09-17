import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  details: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
