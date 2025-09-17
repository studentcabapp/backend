import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String }
}, { timestamps: true });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;