// models/institution.model.js
import mongoose from 'mongoose';

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., IIT Bombay
    domain_whitelist: { type: [String], required: true }, // e.g., ["iitb.ac.in", "student.onlinedegree.iitm.ac.in"]
    isVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

institutionSchema.index({ domain_whitelist: 1 });

const Institution = mongoose.models.Institution || mongoose.model('Institution', institutionSchema);
export default Institution;
