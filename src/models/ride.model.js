// src/models/ride.model.js
import mongoose from "mongoose";

// ---- Sub-schemas ----
const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  address: { type: String, required: true },
}, { _id: false });

const stopSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  address: { type: String, required: true },
  eta: { type: Date } // optional ETA for that stop
}, { _id: false });

// ---- Main Ride schema ----
const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: false },

  // basic route/time
  fromCity: { type: String, required: true },
  toCity: { type: String, required: true },
  pickupLocation: { type: locationSchema, required: true },
  dropoffLocation: { type: locationSchema, required: false },
  pickupTime: { type: Date, required: true },
  reachTime: { type: Date }, // optional estimated arrival

  // intermediate stops
  stops: [stopSchema],

  // seat & pricing
  seatsAvailable: { type: Number, required: true },
  totalSeats: { type: Number }, // optional total seats (mirror of car.seats or driver-set)
  pricePerSeat: { type: Number, required: true },

  // extras & preferences
  luggage: { type: String, default: "1 bag" }, // e.g. "1 bag", "2 bags", "no heavy luggage"
  instructions: { type: String, default: "" }, // driver notes/instructions
  preferences: {
    petFriendly: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    music: { type: String, enum: ["silent", "light", "any"], default: "any" },
    talkativeness: { type: String, enum: ["quiet", "neutral", "chatty"], default: "neutral" }
  },

  // booking behaviour
  bookingMode: { type: String, enum: ["direct", "request"], default: "request" },

  // lifecycle
  status: { type: String, enum: ["active", "completed", "cancelled", "paused"], default: "active" },
  cancelledAt: { type: Date },

  // relations
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }]
}, { timestamps: true });

// Prevent OverwriteModelError in dev/watch mode
const Ride = mongoose.models.Ride || mongoose.model("Ride", rideSchema);

export default Ride;
