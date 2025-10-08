import mongoose from 'mongoose';

const EmailVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  email: { type: String, index: true, required: true },
  code: { type: String, required: true }, // store as string to preserve leading zeros
  attempts: { type: Number, default: 0 }, // to deter brute force
  expireAt: { type: Date, required: true }, // TTL anchor
}, { timestamps: true });

EmailVerificationSchema.path('expireAt').index({ expires: 0 });

export default mongoose.model('EmailVerification', EmailVerificationSchema);