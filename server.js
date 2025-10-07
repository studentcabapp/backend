import { createServer } from 'http';
import app from './src/app.js';
import { Server } from 'socket.io';
import {initSocket} from './src/sockets/sockets.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

initSocket(io);

server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
