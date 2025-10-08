// controllers/emailVerify.controller.js
import EmailVerification from '../models/emailVerification.model.js';
import User from '../models/user.model.js';
import { generate6DigitCode } from '../utils/otp.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const CODE_TTL_MINUTES = Number(process.env.EMAIL_CODE_TTL_MIN || 10);
const MAX_ATTEMPTS = Number(process.env.EMAIL_CODE_MAX_ATTEMPTS || 6);

// GET /auth/verify-email/send
export const sendEmailCode = async (req, res) => {
  try {
    // req.user.id is set by authRequired
    const user = await User.findById(req.user.id).select('email isVerified');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isVerified) return res.status(200).json({ success: true, message: 'Already verified' });

    const code = generate6DigitCode();

    // Optional: delete previous codes for this user/email to keep only latest
    await EmailVerification.deleteMany({ userId: user._id, email: user.email });

    const expireAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await EmailVerification.create({
      userId: user._id,
      email: user.email,
      code,
      expireAt,
    });

    await sendVerificationEmail({ to: user.email, code });

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${user.email}`,
      ttlMinutes: CODE_TTL_MINUTES,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /auth/verify-email/confirm
// body: { code: "123456" }
export const verifyEmailCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: '6-digit numeric code required' });
    }

    const user = await User.findById(req.user.id).select('email isVerified');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.isVerified) return res.status(200).json({ success: true, message: 'Already verified' });

    const entry = await EmailVerification.findOne({ userId: user._id, email: user.email }).sort({ createdAt: -1 });
    if (!entry) return res.status(400).json({ success: false, error: 'No active verification code' });

    // Check attempts before comparing
    if (entry.attempts >= MAX_ATTEMPTS) {
      await EmailVerification.deleteMany({ userId: user._id, email: user.email });
      return res.status(429).json({ success: false, error: 'Too many attempts, request a new code' });
    }

    // Check expiry (TTL also deletes, but we gate at request time)
    if (entry.expireAt.getTime() < Date.now()) {
      await EmailVerification.deleteMany({ userId: user._id, email: user.email });
      return res.status(400).json({ success: false, error: 'Code expired, request a new one' });
    }

    // Compare code
    if (entry.code !== code) {
      entry.attempts += 1;
      await entry.save();
      return res.status(401).json({ success: false, error: 'Invalid code', attemptsUsed: entry.attempts });
    }

    // Success: mark user verified and clean codes
    user.isVerified = true;
    await user.save();
    await EmailVerification.deleteMany({ userId: user._id, email: user.email });

    return res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
