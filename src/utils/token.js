import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP = '7d';

export const signAccess = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tier: user.tier
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXP }
  );
};

export const signRefresh = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tier: user.tier
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXP }
  );
};
