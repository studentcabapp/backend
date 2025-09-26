// models/user.model.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    },

    password: { type: String, required: true },

    // Roles for ridesharing app
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Optional loyalty/tier (kept from your code)
    loyaltyPoints: { type: Number, default: 0 },
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    memberSince: { type: Date, default: Date.now },

    // Profile Info
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    profileImage: { type: String },
    bio: { type: String, trim: true, maxlength: 500 },
    dob: { type: Date },

    // Account Status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // Institution linking
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', default: null },
    institutionDomain: { type: String, default: null },

    // Security
    lastLogin: { type: Date },
    loginHistory: [{ ip: String, date: Date, device: String }],
    refreshToken: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },

    // Social
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      github: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
