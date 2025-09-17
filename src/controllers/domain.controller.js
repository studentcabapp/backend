// controllers/domain.controller.js
import DomainRequest from '../models/domainRequest.model.js';
import Institution from '../models/institution.model.js';

// Public: user requests a new domain to be approved
export const requestDomainApproval = async (req, res) => {
  const { email, proofs = [] } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return res.status(400).json({ error: 'Invalid email' });

  // If already allowed, no need to request
  const allowed = await Institution.findOne({ domain_whitelist: domain });
  if (allowed) {
    return res.status(200).json({ success: true, message: 'Domain already approved' });
  }

  const existingPending = await DomainRequest.findOne({ domain, status: 'pending' });
  if (existingPending) {
    return res.status(200).json({ success: true, message: 'Domain request already pending' });
  }

  const request = await DomainRequest.create({
    email: email.toLowerCase(),
    domain,
    proofs,
    requestedBy: req.user?.id || null,
  });

  return res.status(201).json({
    success: true,
    message: 'Request submitted, waiting for admin approval',
    requestId: request._id,
  });
};
