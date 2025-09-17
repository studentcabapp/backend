import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true }
}, { timestamps: true });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);
export default ChatMessage;
