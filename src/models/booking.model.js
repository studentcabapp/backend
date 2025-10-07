import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driver:{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seatsBooked: { type: Number, default: 1 },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  otp: { type: String },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" }
}, { timestamps: true });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;