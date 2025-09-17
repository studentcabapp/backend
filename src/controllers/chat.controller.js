import ChatMessage from "../models/chat.model.js";

export const getMessages = async (req, res) => {
  const { rideId } = req.params;
  const messages = await ChatMessage.find({ ride: rideId }).populate("sender receiver", "name photo");
  res.json(messages);
};

export const sendMessage = async (req, res) => {
  const { rideId } = req.params;
  const { receiver, message } = req.body;
  const msg = new ChatMessage({ ride: rideId, sender: req.user._id, receiver, message });
  await msg.save();
  res.status(201).json(msg);
};
