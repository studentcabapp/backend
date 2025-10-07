// controllers/chat.controller.js
import mongoose from "mongoose";
import ChatMessage from "../models/chat.model.js";
import Ride from "../models/ride.model.js";
import Booking from "../models/booking.model.js";

const { ObjectId } = mongoose.Types;

function isStrictObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === String(id);
}

// GET /chat/messages?rideId=...&id=...
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId, id: otherId } = req.query;

    if (!isStrictObjectId(rideId) || !isStrictObjectId(otherId)) {
      return res.status(400).json({ error: "Invalid query params" });
    }

    // Optional: validate user belongs to this ride via booking/role
    const rideObjId = new ObjectId(rideId);
    const userObjId = new ObjectId(userId);
    const otherObjId = new ObjectId(otherId);

    // Fetch only messages between the pair for this ride
    const messages = await ChatMessage.find({
      ride: rideObjId,
      $or: [
        { sender: userObjId, receiver: otherObjId },
        { sender: otherObjId, receiver: userObjId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// POST /chat/messages
// body: { rideId, receiver, message }
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { rideId, receiver, message } = req.body;

    if (!senderId || !rideId || !receiver || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid fields: rideId, receiver, message" });
    }

    if (!isStrictObjectId(senderId) || !isStrictObjectId(rideId) || !isStrictObjectId(receiver)) {
      return res.status(400).json({ error: "Invalid ObjectId format" });
    }

    if (String(senderId) === String(receiver)) {
      return res.status(400).json({ error: "Cannot send message to self" });
    }

    const rideObjId = new ObjectId(rideId);
    const senderObjId = new ObjectId(senderId);
    const receiverObjId = new ObjectId(receiver);

    // Validate ride status
    const ride = await Ride.findById(rideObjId).lean();
    if (!ride || !["active", "paused"].includes(ride.status)) {
      return res.status(400).json({ error: "Ride is not active for messaging" });
    }

    // Validate booking relationship either direction
    const [bookingSenderPassenger, bookingSenderDriver] = await Promise.all([
      Booking.findOne({ ride: rideObjId, passenger: senderObjId, driver: receiverObjId }).lean(),
      Booking.findOne({ ride: rideObjId, passenger: receiverObjId, driver: senderObjId }).lean(),
    ]);

    if (!bookingSenderPassenger && !bookingSenderDriver) {
      return res.status(403).json({ error: "No valid booking between participants for this ride" });
    }

    // Persist message
    const msg = await ChatMessage.create({
      ride: rideObjId,
      sender: senderObjId,
      receiver: receiverObjId,
      message: message.trim(),
    });

    // Emit realtime event to ride room
    const io = req.app.get("io");
    if (io) {
      io.to(`ride:${rideId}`).emit("new-message", {
        _id: msg._id,
        ride: rideId,
        sender: String(senderObjId),
        receiver: String(receiverObjId),
        message: msg.message,
        createdAt: msg.createdAt,
      });
    }

    return res.status(201).json(msg);
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

// GET /chat/myChats
export const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjId = new ObjectId(userId);

    // User as driver with active rides
    const activeRides = await Ride.find({ driver: userObjId, status: "active" }).select("_id").lean();

    // User as passenger in pending/confirmed bookings
    const bookings = await Booking.find({
      passenger: userObjId,
      status: { $in: ["pending", "confirmed"] },
    })
      .select("ride")
      .lean();

    const rideIds = [
      ...activeRides.map((r) => r._id),
      ...bookings.map((b) => b.ride),
    ];

    if (rideIds.length === 0) {
      return res.json([]);
    }

    // Aggregate distinct threads (other user + ride), with lastMessage and updatedAt
    const chats = await ChatMessage.aggregate([
      {
        $match: {
          ride: { $in: rideIds },
          $or: [{ sender: userObjId }, { receiver: userObjId }],
        },
      },
      {
        $project: {
          ride: 1,
          sender: 1,
          receiver: 1,
          message: 1,
          createdAt: 1,
          otherUser: {
            $cond: [{ $eq: ["$sender", userObjId] }, "$receiver", "$sender"],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        // group by thread (otherUser + ride) and take last message fields
        $group: {
          _id: { user: "$otherUser", ride: "$ride" },
          lastMessage: { $first: "$message" },
          updatedAt: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 0,
          receiverId: "$_id.user",
          rideId: "$_id.ride",
          username: "$userInfo.username",
          lastMessage: 1,
          updatedAt: 1,
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    return res.json(chats);
  } catch (err) {
    console.error("getChats error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};
