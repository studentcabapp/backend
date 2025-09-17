import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ["card", "paypal"], required: true },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  transactionId: { type: String }
}, { timestamps: true });

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export default Payment;