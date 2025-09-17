// controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Institution from '../models/institution.model.js';
import { toPublic } from '../utils/toPublic.js';
import { signAccess, signRefresh } from '../utils/token.js';
import { checkStudentEmail } from '../utils/emailVerifier.js';

// ✅ Test API
export const testApi = (_req, res) => {
  console.log('Auth route test api hit ✈️');
  res.json({ message: 'Auth route working!' });
};

// ✅ Register (with student verification)
export const register = async (req, res) => {
  const { username, email, password } = req.body;
  console.log(username, email, password); 
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password are required' });
    }

    const emailCheck = await checkStudentEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        error: 'Email domain not acceptable',
        domain: emailCheck.domain,
        action: 'Ask admin to approve this domain via /auth/request-domain',
      });
    }

    const hash = await bcrypt.hash(password, 10);

    // attach institution if found
    const institutionId = emailCheck.institution?._id || null;
    const institutionDomain = email.split('@')[1].toLowerCase();

    const user = await User.create({
      username,
      email,
      password: hash,
      institutionId,
      institutionDomain,
      isVerified: false, 
    });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered',
      user: toPublic(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // Handle duplicate errors cleanly
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `${key} already exists` });
    }
    res.status(400).json({ error: error.message });
  }
};

// ✅ Login
export const login = async (req, res) => {
  const { identifier, password } = req.body;
  console.log(identifier, password);
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier and password are required' });
  }
  try {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      user: toPublic(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Check username
export const checkUsernameExists = async (req, res) => {
  const { username } = req.params;
  try {
    const exists = await User.exists({ username });
    res.status(200).json({
      exists: !!exists,
      message: exists ? 'Username already taken' : 'Username is available',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Check email
export const checkEmailExists = async (req, res) => {
  const { email } = req.params;
  try {
    const exists = await User.exists({ email });
    res.status(200).json({
      exists: !!exists,
      message: exists ? 'Email already registered' : 'Email is available',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Combined availability check
export const checkAvailability = async (req, res) => {
  const { username, email } = req.query;
  try {
    const usernameExists = username ? !!(await User.exists({ username })) : null;
    const emailExists = email ? !!(await User.exists({ email })) : null;

    res.json({
      usernameExists,
      emailExists,
      message: 'Availability checked',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get profile (protected)
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('institutionId', 'name domain_whitelist');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: toPublic(user, req.user.role) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update profile (protected)
export const updateProfile = async (req, res) => {
  try {
    // Copy allowed updates only
    const updates = { ...req.body };

    // Disallowed fields (cannot be updated directly by user)
    const restrictedFields = [
      "password",
      "role",
      "refreshToken",
      "isVerified",
      "institutionId",
      "institutionDomain",
      "username",
      "email",
      "loyaltyPoints"
    ];

    // Remove restricted fields if present
    restrictedFields.forEach((field) => delete updates[field]);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true, // ensure mongoose validators run
    }).select("-password -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user: toPublic(updatedUser, req.user.role) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Change password
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Old password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete account
export const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Refresh Token
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(403).json({ error: 'Invalid refresh token' });

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err || decoded.id !== String(user._id)) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }
      const newAccessToken = signAccess(user);
      res.json({
        success: true,
        accessToken: newAccessToken,
        message: 'Access token refreshed successfully',
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Logout
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.refreshToken = null;
    await user.save();

    res.status(200).json({ success: true, message: 'User logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Server error during logout' });
  }
};
