import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomOffer } from '../models/custom-offer.model';
import { User } from '../models/user.model';
import { Gig } from '../models/gig.model';
import type { AuthRequest } from '../middleware/auth.middleware';

function sanitizeCustomOffer(offer: any) {
  return {
    id: offer._id?.toString(),
    freelancerId: offer.freelancerId?.toString(),
    clientId: offer.clientId?.toString(),
    gigId: offer.gigId?.toString(),
    title: offer.title,
    description: offer.description,
    price: offer.price,
    currency: offer.currency,
    deliveryTimeDays: offer.deliveryTimeDays,
    status: offer.status,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

// Create custom offer
export async function createCustomOfferHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { clientId, gigId, title, description, price, currency, deliveryTimeDays, expiresInDays } = req.body;

    // Validate required fields
    if (!clientId || !title || !description || !price || !deliveryTimeDays) {
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

    // Validate gig if provided
    if (gigId) {
      const gig = await Gig.findById(gigId);
      if (!gig) {
        res.status(400).json({ ok: false, error: { message: 'Gig not found' } });
        return;
      }

      if (gig.sellerId?.toString() !== req.userId) {
        res.status(403).json({ ok: false, error: { message: 'You can only send offers for your own gigs' } });
        return;
      }
    }

    // Calculate expiration date (default 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const customOffer = await CustomOffer.create({
      freelancerId: req.userId,
      clientId: new mongoose.Types.ObjectId(clientId),
      gigId: gigId ? new mongoose.Types.ObjectId(gigId) : undefined,
      title,
      description,
      price,
      currency: currency || 'USD',
      deliveryTimeDays,
      expiresAt,
    });

    res.status(201).json({
      ok: true,
      offer: sanitizeCustomOffer(customOffer),
    });
  } catch (error) {
    console.error('[avatarx-server] createCustomOffer error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get custom offers (for clients - received offers)
export async function getReceivedOffersHandler(req: AuthRequest, res: Response) {
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

    const [offers, total] = await Promise.all([
      CustomOffer.find(filter)
        .populate('freelancerId', 'displayName avatar sellerLevel')
        .populate('gigId', 'title thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CustomOffer.countDocuments(filter),
    ]);

    const sanitizedOffers = offers.map((offer) => {
      const freelancerData = offer.freelancerId as any;
      const gigData = offer.gigId as any;
      return {
        ...sanitizeCustomOffer(offer),
        freelancerName: freelancerData?.displayName,
        freelancerAvatar: freelancerData?.avatar,
        freelancerLevel: freelancerData?.sellerLevel,
        gigTitle: gigData?.title,
        gigThumbnail: gigData?.thumbnail,
      };
    });

    res.json({
      ok: true,
      offers: sanitizedOffers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getReceivedOffers error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get sent custom offers (for freelancers)
export async function getSentOffersHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { page = 1, limit = 20, status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { freelancerId: req.userId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [offers, total] = await Promise.all([
      CustomOffer.find(filter)
        .populate('clientId', 'displayName avatar')
        .populate('gigId', 'title thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CustomOffer.countDocuments(filter),
    ]);

    const sanitizedOffers = offers.map((offer) => {
      const clientData = offer.clientId as any;
      const gigData = offer.gigId as any;
      return {
        ...sanitizeCustomOffer(offer),
        clientName: clientData?.displayName,
        clientAvatar: clientData?.avatar,
        gigTitle: gigData?.title,
        gigThumbnail: gigData?.thumbnail,
      };
    });

    res.json({
      ok: true,
      offers: sanitizedOffers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getSentOffers error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Accept custom offer
export async function acceptOfferHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { offerId } = req.params;

    const offer = await CustomOffer.findById(offerId);

    if (!offer) {
      res.status(404).json({ ok: false, error: { message: 'Custom offer not found' } });
      return;
    }

    if (offer.clientId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only accept offers sent to you' } });
      return;
    }

    if (offer.status !== 'pending') {
      res.status(400).json({ ok: false, error: { message: 'This offer is no longer pending' } });
      return;
    }

    if (new Date() > offer.expiresAt) {
      res.status(400).json({ ok: false, error: { message: 'This offer has expired' } });
      return;
    }

    offer.status = 'accepted';
    await offer.save();

    res.json({
      ok: true,
      message: 'Custom offer accepted successfully',
      offer: sanitizeCustomOffer(offer),
    });
  } catch (error) {
    console.error('[avatarx-server] acceptOffer error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Decline custom offer
export async function declineOfferHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { offerId } = req.params;

    const offer = await CustomOffer.findById(offerId);

    if (!offer) {
      res.status(404).json({ ok: false, error: { message: 'Custom offer not found' } });
      return;
    }

    if (offer.clientId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only decline offers sent to you' } });
      return;
    }

    if (offer.status !== 'pending') {
      res.status(400).json({ ok: false, error: { message: 'This offer is no longer pending' } });
      return;
    }

    offer.status = 'declined';
    await offer.save();

    res.json({
      ok: true,
      message: 'Custom offer declined successfully',
      offer: sanitizeCustomOffer(offer),
    });
  } catch (error) {
    console.error('[avatarx-server] declineOffer error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Delete custom offer
export async function deleteOfferHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { offerId } = req.params;

    const offer = await CustomOffer.findById(offerId);

    if (!offer) {
      res.status(404).json({ ok: false, error: { message: 'Custom offer not found' } });
      return;
    }

    if (offer.freelancerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'You can only delete your own offers' } });
      return;
    }

    if (offer.status === 'accepted') {
      res.status(400).json({ ok: false, error: { message: 'Cannot delete an accepted offer' } });
      return;
    }

    await CustomOffer.findByIdAndDelete(offerId);

    res.json({
      ok: true,
      message: 'Custom offer deleted successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] deleteOffer error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
