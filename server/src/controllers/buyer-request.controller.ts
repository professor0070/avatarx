import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { BuyerRequest } from '../models/buyer-request.model';
import { User } from '../models/user.model';
import { Gig } from '../models/gig.model';
import type { AuthRequest } from '../middleware/auth.middleware';

function sanitizeBuyerRequest(request: any) {
  return {
    id: request._id?.toString(),
    clientId: request.clientId?.toString(),
    title: request.title,
    description: request.description,
    category: request.category,
    budget: request.budget,
    deliveryDeadline: request.deliveryDeadline,
    skillsRequired: request.skillsRequired,
    attachments: request.attachments,
    status: request.status,
    proposals: request.proposals.map((prop: any) => ({
      freelancerId: prop.freelancerId?.toString(),
      gigId: prop.gigId?.toString(),
      price: prop.price,
      currency: prop.currency,
      deliveryTimeDays: prop.deliveryTimeDays,
      pitch: prop.pitch,
      status: prop.status,
      submittedAt: prop.submittedAt,
    })),
    selectedProposal: request.selectedProposal ? {
      freelancerId: request.selectedProposal.freelancerId?.toString(),
      proposalIndex: request.selectedProposal.proposalIndex,
      selectedAt: request.selectedProposal.selectedAt,
    } : undefined,
    views: request.views,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

// Create buyer request
export async function createBuyerRequestHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      title,
      description,
      category,
      budget,
      deliveryDeadline,
      skillsRequired,
      attachments,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !budget) {
      res.status(400).json({ ok: false, error: { message: 'Missing required fields' } });
      return;
    }

    // Validate budget
    if (!budget.min || !budget.max || !budget.currency) {
      res.status(400).json({ ok: false, error: { message: 'Invalid budget' } });
      return;
    }

    if (budget.min > budget.max) {
      res.status(400).json({ ok: false, error: { message: 'Min budget cannot exceed max budget' } });
      return;
    }

    const buyerRequest = await BuyerRequest.create({
      clientId: req.userId,
      title,
      description,
      category,
      budget,
      deliveryDeadline,
      skillsRequired: skillsRequired || [],
      attachments: attachments || [],
    });

    res.status(201).json({
      ok: true,
      request: sanitizeBuyerRequest(buyerRequest),
    });
  } catch (error) {
    console.error('[avatarx-server] createBuyerRequest error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get all buyer requests (public, for freelancers to browse)
export async function getBuyerRequestsHandler(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status = 'open',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = { status };
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [requests, total] = await Promise.all([
      BuyerRequest.find(filter)
        .populate('clientId', 'displayName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BuyerRequest.countDocuments(filter),
    ]);

    const sanitizedRequests = requests.map((doc) => {
      const clientData = doc.clientId as any;
      return {
        ...sanitizeBuyerRequest(doc),
        clientName: clientData?.displayName,
        clientAvatar: clientData?.avatar,
        proposalCount: doc.proposals?.length || 0,
      };
    });

    res.json({
      ok: true,
      requests: sanitizedRequests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getBuyerRequests error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get buyer request by ID
export async function getBuyerRequestByIdHandler(req: AuthRequest, res: Response) {
  try {
    const { requestId } = req.params;

    const request = await BuyerRequest.findById(requestId)
      .populate('clientId', 'displayName avatar email')
      .populate('proposals.freelancerId', 'displayName avatar sellerLevel')
      .populate('proposals.gigId', 'title thumbnail')
      .lean();

    if (!request) {
      res.status(404).json({ ok: false, error: { message: 'Buyer request not found' } });
      return;
    }

    // Increment view count
    await BuyerRequest.findByIdAndUpdate(requestId, { $inc: { views: 1 } });

    const sanitized = sanitizeBuyerRequest(request);
    const clientData = request.clientId as any;
    const sanitizedResponse = {
      ...sanitized,
      clientName: clientData?.displayName,
      clientAvatar: clientData?.avatar,
      clientEmail: clientData?.email,
    };
    sanitizedResponse.proposals = request.proposals.map((prop: any) => {
      const freelancerData = prop.freelancerId as any;
      const gigData = prop.gigId as any;
      return {
        ...prop,
        freelancerName: freelancerData?.displayName,
        freelancerAvatar: freelancerData?.avatar,
        freelancerLevel: freelancerData?.sellerLevel,
        gigTitle: gigData?.title,
        gigThumbnail: gigData?.thumbnail,
      };
    });

    res.json({
      ok: true,
      request: sanitizedResponse,
    });
  } catch (error) {
    console.error('[avatarx-server] getBuyerRequestById error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get my buyer requests (for clients)
export async function getMyBuyerRequestsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { page = 1, limit = 20, status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { clientId: req.userId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      BuyerRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BuyerRequest.countDocuments(filter),
    ]);

    const sanitizedRequests = requests.map((doc) => ({
      ...sanitizeBuyerRequest(doc),
      proposalCount: doc.proposals?.length || 0,
    }));

    res.json({
      ok: true,
      requests: sanitizedRequests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getMyBuyerRequests error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Submit proposal to buyer request
export async function submitProposalHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { requestId } = req.params;
    const { gigId, price, currency, deliveryTimeDays, pitch } = req.body;

    // Validate required fields
    if (!price || !currency || !deliveryTimeDays || !pitch) {
      res.status(400).json({ ok: false, error: { message: 'Missing required fields' } });
      return;
    }

    // Validate price
    if (price <= 0) {
      res.status(400).json({ ok: false, error: { message: 'Price must be greater than 0' } });
      return;
    }

    // Validate delivery time
    if (deliveryTimeDays < 1) {
      res.status(400).json({ ok: false, error: { message: 'Delivery time must be at least 1 day' } });
      return;
    }

    const request = await BuyerRequest.findById(requestId);

    if (!request) {
      res.status(404).json({ ok: false, error: { message: 'Buyer request not found' } });
      return;
    }

    if (request.status !== 'open') {
      res.status(400).json({ ok: false, error: { message: 'This request is not open for proposals' } });
      return;
    }

    // Check if freelancer already submitted a proposal
    const existingProposal = request.proposals.find(
      (p) => p.freelancerId.toString() === req.userId
    );

    if (existingProposal) {
      res.status(400).json({ ok: false, error: { message: 'You have already submitted a proposal' } });
      return;
    }

    // Validate gig if provided
    if (gigId) {
      const gig = await Gig.findById(gigId);
      if (!gig) {
        res.status(400).json({ ok: false, error: { message: 'Gig not found' } });
        return;
      }

      if (gig.sellerId?.toString() !== req.userId) {
        res.status(403).json({ ok: false, error: { message: 'You can only submit proposals for your own gigs' } });
        return;
      }
    }

    // Add proposal
    request.proposals.push({
      freelancerId: new mongoose.Types.ObjectId(req.userId),
      gigId: gigId ? new mongoose.Types.ObjectId(gigId) : undefined,
      price,
      currency,
      deliveryTimeDays,
      pitch,
      status: 'pending',
      submittedAt: new Date(),
    });

    await request.save();

    res.json({
      ok: true,
      message: 'Proposal submitted successfully',
      request: sanitizeBuyerRequest(request),
    });
  } catch (error) {
    console.error('[avatarx-server] submitProposal error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Accept proposal
export async function acceptProposalHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { requestId } = req.params;
    const { proposalIndex } = req.body;

    const request = await BuyerRequest.findById(requestId);

    if (!request) {
      res.status(404).json({ ok: false, error: { message: 'Buyer request not found' } });
      return;
    }

    if (request.clientId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only accept proposals for your own requests' } });
      return;
    }

    if (request.status !== 'open') {
      res.status(400).json({ ok: false, error: { message: 'This request is not open' } });
      return;
    }

    if (proposalIndex === undefined || proposalIndex < 0 || proposalIndex >= request.proposals.length) {
      res.status(400).json({ ok: false, error: { message: 'Invalid proposal index' } });
      return;
    }

    const proposal = request.proposals[proposalIndex];

    // Mark proposal as accepted and others as rejected
    request.proposals.forEach((p, idx) => {
      if (idx === proposalIndex) {
        p.status = 'accepted';
      } else {
        p.status = 'rejected';
      }
    });

    request.selectedProposal = {
      freelancerId: proposal.freelancerId,
      proposalIndex,
      selectedAt: new Date(),
    };

    request.status = 'in_progress';
    await request.save();

    res.json({
      ok: true,
      message: 'Proposal accepted successfully',
      request: sanitizeBuyerRequest(request),
    });
  } catch (error) {
    console.error('[avatarx-server] acceptProposal error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Reject proposal
export async function rejectProposalHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { requestId } = req.params;
    const { proposalIndex } = req.body;

    const request = await BuyerRequest.findById(requestId);

    if (!request) {
      res.status(404).json({ ok: false, error: { message: 'Buyer request not found' } });
      return;
    }

    if (request.clientId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only reject proposals for your own requests' } });
      return;
    }

    if (proposalIndex === undefined || proposalIndex < 0 || proposalIndex >= request.proposals.length) {
      res.status(400).json({ ok: false, error: { message: 'Invalid proposal index' } });
      return;
    }

    request.proposals[proposalIndex].status = 'rejected';
    await request.save();

    res.json({
      ok: true,
      message: 'Proposal rejected successfully',
      request: sanitizeBuyerRequest(request),
    });
  } catch (error) {
    console.error('[avatarx-server] rejectProposal error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Update buyer request
export async function updateBuyerRequestHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { requestId } = req.params;
    const updates = req.body;

    const request = await BuyerRequest.findById(requestId);

    if (!request) {
      res.status(404).json({ ok: false, error: { message: 'Buyer request not found' } });
      return;
    }

    if (request.clientId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only update your own requests' } });
      return;
    }

    if (request.status !== 'open') {
      res.status(400).json({ ok: false, error: { message: 'Cannot update a request that is not open' } });
      return;
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'category', 'budget', 'deliveryDeadline', 'skillsRequired', 'attachments'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (request as any)[field] = updates[field];
      }
    });

    await request.save();

    res.json({
      ok: true,
      request: sanitizeBuyerRequest(request),
    });
  } catch (error) {
    console.error('[avatarx-server] updateBuyerRequest error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Delete buyer request
export async function deleteBuyerRequestHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { requestId } = req.params;

    const request = await BuyerRequest.findById(requestId);

    if (!request) {
      res.status(404).json({ ok: false, error: { message: 'Buyer request not found' } });
      return;
    }

    if (request.clientId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only delete your own requests' } });
      return;
    }

    if (request.status === 'in_progress') {
      res.status(400).json({ ok: false, error: { message: 'Cannot delete a request that is in progress' } });
      return;
    }

    await BuyerRequest.findByIdAndDelete(requestId);

    res.json({
      ok: true,
      message: 'Buyer request deleted successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] deleteBuyerRequest error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
