export const toPublic = (userDoc, requesterRole = 'user') => {
  if (!userDoc) return null;
  const u = (userDoc.toObject ? userDoc.toObject() : { ...userDoc });

  // Remove sensitive fields globally
  delete u.password;
  delete u.refreshToken;
  delete u.__v;

  if (['admin', 'superadmin'].includes(requesterRole)) {
    return u; // Full access
  }

  if (requesterRole === 'manager') {
    delete u.loginHistory;
    delete u.twoFactorEnabled;
    return {
      id: u._id,
      username: u.username,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      profileImage: u.profileImage,
      role: u.role,
      tier: u.tier,
      loyaltyPoints: u.loyaltyPoints,
      memberSince: u.memberSince,
      isActive: u.isActive
    };
  }

  if (requesterRole === 'waiter') {
    delete u.loginHistory;
    return {
      id: u._id,
      username: u.username,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      profileImage: u.profileImage,
      role: u.role,
      tier: u.tier
    };
  }

  // Default: Normal user
  return {
    id: u._id,
    username: u.username || "",
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    profileImage: u.profileImage || "",
    tier: u.tier || "bronze",
    bio: u.bio || "",
    isVerified: u.isVerified ?? false
  };
};
