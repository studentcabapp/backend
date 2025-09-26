// src/models/car.model.js
import mongoose from "mongoose";

const carSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  make: { type: String },          // e.g. Toyota
  model: { type: String },         // e.g. Corolla
  year: { type: Number },
  plateNumber: { type: String },
  seats: { type: Number, default: 4 },
  color: { type: String },
  ac: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => new Date() }
});

export default mongoose.model("Car", carSchema);
