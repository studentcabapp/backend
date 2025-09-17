// controllers/admin.controller.js
import User from '../models/user.model.js';
import Institution from '../models/institution.model.js';
import DomainRequest from '../models/domainRequest.model.js';

// Admin: list all users
export const getAllUserData = async (_req, res) => {
  try {
    const users = await User.find({}, '-password -refreshToken').lean();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: upgrade user tier
export const upgradeUserTier = async (req, res) => {
  const { userId, tier } = req.body;
  if (!userId || !tier) return res.status(400).json({ error: 'userId and tier required' });
  if (!['bronze', 'silver', 'gold', 'platinum'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const user = await User.findByIdAndUpdate(userId, { tier }, { new: true }).select(
    '-password -refreshToken'
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user });
};

// Admin: promote role (e.g., rider -> driver)
export const promoteUserRole = async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
  if (!['rider', 'driver', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select(
    '-password -refreshToken'
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user });
};

// Admin: list domain requests
export const listDomainRequests = async (_req, res) => {
  const items = await DomainRequest.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
};

// Admin: approve domain request (adds domain to Institution whitelist)
export const approveDomain = async (req, res) => {
  const { requestId, institutionName } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });

  const request = await DomainRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  // Create or update institution record for this domain
  let institution = await Institution.findOne({ domain_whitelist: request.domain });
  if (!institution) {
    if (!institutionName) {
      return res
        .status(400)
        .json({ error: 'institutionName required to create new institution' });
    }
    institution = await Institution.create({
      name: institutionName,
      domain_whitelist: [request.domain],
      isVerified: true,
    });
  } else if (!institution.domain_whitelist.includes(request.domain)) {
    institution.domain_whitelist.push(request.domain);
    await institution.save();
  }

  request.status = 'approved';
  await request.save();

  res.json({ success: true, message: 'Domain approved', domain: request.domain });
};

// Admin: reject a domain request
export const rejectDomain = async (req, res) => {
  const { requestId, notes } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });

  const request = await DomainRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = 'rejected';
  request.notes = notes || '';
  await request.save();

  res.json({ success: true, message: 'Domain request rejected' });
};

// Admin: institutions CRUD basics
export const listInstitutions = async (_req, res) => {
  const items = await Institution.find().lean();
  res.json({ success: true, data: items });
};

export const addInstitution = async (req, res) => {
  const { name, domains = [] } = req.body;
  if (!name || !domains.length) return res.status(400).json({ error: 'name and domains required' });
  const inst = await Institution.create({ name, domain_whitelist: domains, isVerified: true });
  res.status(201).json({ success: true, data: inst });
};
