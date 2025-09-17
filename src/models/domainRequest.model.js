// models/domainRequest.model.js
import mongoose from 'mongoose';

const domainRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    domain: { type: String, required: true, lowercase: true, trim: true },
    proofs: [{ type: String }], // URLs or text
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    notes: { type: String, default: '' }, // admin notes
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

domainRequestSchema.index({ domain: 1, status: 1 });

const DomainRequest =
  mongoose.models.DomainRequest || mongoose.model('DomainRequest', domainRequestSchema);
export default DomainRequest;
