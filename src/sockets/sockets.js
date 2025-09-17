export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ New client connected: ${socket.id}`);

    // Listen for test events
    socket.on('test-message', (data) => {
      console.log('📩 Received from client:', data);
      socket.emit('server-response', { msg: 'Hello from server!' });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
};
