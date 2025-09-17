import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
// import errorHandler from './middlewares/errorHandler.js';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import auditLogRoutes from './routes/auditlog.routes.js';
import rideRoutes from './routes/ride.routes.js';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json()); 
app.use('/api/auth', authRoutes);
app.use('/api/auditlogs', auditLogRoutes);
app.use('/api/rides', rideRoutes);

connectDB();

export default app;
