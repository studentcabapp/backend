import jwt from 'jsonwebtoken';
import ChatMessage from '../models/chat.model.js';
import Ride from '../models/ride.model.js';
import Booking from '../models/booking.model.js';

export const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: Token missing'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { _id: payload.id };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ New client connected: ${socket.id}, user: ${socket.user._id}`);

    // Join a ride room
    socket.on('join-ride', async (rideId) => {
      try {
        const ride = await Ride.findById(rideId);
        if (!ride || ride.status !== 'active') {
          socket.emit('error', 'Cannot join chat for inactive or non-existent ride');
          return;
        }

        const booking = await Booking.findOne({ ride: rideId, user: socket.user._id });
        if (!booking || booking.status === 'cancelled') {
          socket.emit('error', 'No active booking for this ride');
          return;
        }

        socket.join(rideId);
        socket.emit('joined-ride', rideId);
        console.log(`User ${socket.user._id} joined ride room ${rideId}`);
      } catch (error) {
        socket.emit('error', 'Failed to join ride room');
      }
    });

    // Listen for new chat messages
    socket.on('send-message', async ({ rideId, receiverId, message }) => {
      try {
        const ride = await Ride.findById(rideId);
        if (!ride || ride.status !== 'active') {
          socket.emit('error', 'Ride is not active');
          return;
        }

        const booking = await Booking.findOne({ ride: rideId, user: socket.user._id });
        if (!booking || booking.status === 'cancelled') {
          socket.emit('error', 'No active booking');
          return;
        }

        // Save message to DB
        const chatMsg = new ChatMessage({
          ride: rideId,
          sender: socket.user._id,
          receiver: receiverId,
          message,
        });
        await chatMsg.save();

        // Broadcast message to all clients in ride room
        io.to(rideId).emit('new-message', {
          _id: chatMsg._id,
          ride: rideId,
          sender: socket.user._id,
          receiver: receiverId,
          message,
          createdAt: chatMsg.createdAt,
        });
      } catch (err) {
        socket.emit('error', 'Failed to send message');
      }
    });

    // Your existing test-message handler (optional)
    socket.on('test-message', (data) => {
      console.log('📩 Received from client:', data);
      socket.emit('server-response', { msg: 'Hello from server!' });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}, user: ${socket.user._id}`);
    });
  });
};
