import { Escrow, IEscrow } from '../models/escrow.model';
import { Order } from '../models/order.model';
import { User } from '../models/user.model';

export interface EscrowHoldResult {
  success: boolean;
  escrow?: IEscrow;
  error?: string;
}

export interface EscrowReleaseResult {
  success: boolean;
  escrow?: IEscrow;
  error?: string;
}

export interface EscrowRefundResult {
  success: boolean;
  escrow?: IEscrow;
  error?: string;
}

export class EscrowService {
  /**
   * Calculate platform fees based on amount
   */
  calculatePlatformFees(amount: number): { serviceFee: number; platformFee: number; sellerAmount: number } {
    const serviceFeePercent = Number(process.env.SERVICE_FEE_PERCENT) || 5;
    const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 2;
    
    const serviceFee = Math.round(amount * serviceFeePercent / 100);
    const platformFee = Math.round(amount * platformFeePercent / 100);
    const sellerAmount = amount - serviceFee - platformFee;
    
    return { serviceFee, platformFee, sellerAmount };
  }

  /**
   * Hold funds in escrow after payment completion
   */
  async holdFunds(orderId: string, paymentTransactionId?: string): Promise<EscrowHoldResult> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.paymentStatus !== 'completed') {
        return { success: false, error: 'Payment not completed' };
      }

      // Check if escrow already exists for this order
      const existingEscrow = await Escrow.findOne({ orderId: order._id });
      if (existingEscrow) {
        return { success: false, error: 'Escrow already exists for this order' };
      }

      // Calculate fees
      const { serviceFee, platformFee, sellerAmount } = this.calculatePlatformFees(order.totalPrice);

      // Create escrow record
      const escrow = new Escrow({
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalPrice,
        currency: order.currency,
        sellerAmount,
        platformFee,
        serviceFee,
        status: 'held',
        heldAt: new Date(),
        paymentTransactionId,
      });

      await escrow.save();

      return { success: true, escrow };
    } catch (error) {
      console.error('[EscrowService] holdFunds error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to hold funds in escrow' 
      };
    }
  }

  /**
   * Release funds from escrow to seller
   */
  async releaseFunds(orderId: string, releasedBy: string, reason: string = 'Order completed'): Promise<EscrowReleaseResult> {
    try {
      const escrow = await Escrow.findOne({ orderId });
      if (!escrow) {
        return { success: false, error: 'Escrow not found' };
      }

      if (escrow.status !== 'held') {
        return { success: false, error: `Escrow is not in held status (current: ${escrow.status})` };
      }

      // Get order to find seller
      const order = await Order.findById(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Release escrow
      escrow.release(reason, releasedBy as any);
      await escrow.save();

      // Credit seller's wallet
      const seller = await User.findById(order.sellerId);
      if (seller) {
        seller.crWalletBalance = (seller.crWalletBalance || 0) + escrow.sellerAmount;
        seller.totalEarnedINR = (seller.totalEarnedINR || 0) + escrow.sellerAmount;
        await seller.save();
      }

      return { success: true, escrow };
    } catch (error) {
      console.error('[EscrowService] releaseFunds error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to release funds from escrow' 
      };
    }
  }

  /**
   * Refund funds from escrow to buyer
   */
  async refundFunds(orderId: string, refundedBy: string, reason: string = 'Order cancelled'): Promise<EscrowRefundResult> {
    try {
      const escrow = await Escrow.findOne({ orderId });
      if (!escrow) {
        return { success: false, error: 'Escrow not found' };
      }

      if (escrow.status !== 'held') {
        return { success: false, error: `Escrow is not in held status (current: ${escrow.status})` };
      }

      // Get order to find buyer
      const order = await Order.findById(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Refund escrow
      escrow.refund(reason, refundedBy as any);
      await escrow.save();

      // Credit buyer's wallet (full refund)
      const buyer = await User.findById(order.buyerId);
      if (buyer) {
        buyer.crWalletBalance = (buyer.crWalletBalance || 0) + escrow.totalAmount;
        await buyer.save();
      }

      return { success: true, escrow };
    } catch (error) {
      console.error('[EscrowService] refundFunds error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to refund funds from escrow' 
      };
    }
  }

  /**
   * Get escrow status for an order
   */
  async getEscrowStatus(orderId: string): Promise<{ success: boolean; escrow?: IEscrow; error?: string }> {
    try {
      const escrow = await Escrow.findOne({ orderId });
      if (!escrow) {
        return { success: false, error: 'Escrow not found' };
      }

      return { success: true, escrow };
    } catch (error) {
      console.error('[EscrowService] getEscrowStatus error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get escrow status' 
      };
    }
  }

  /**
   * Get all escrow records (admin only)
   */
  async getAllEscrows(filters: { status?: string; page?: number; limit?: number } = {}): Promise<{
    success: boolean;
    escrows?: IEscrow[];
    total?: number;
    error?: string;
  }> {
    try {
      const { status, page = 1, limit = 20 } = filters;
      const query: any = {};
      
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [escrows, total] = await Promise.all([
        Escrow.find(query)
          .populate('orderId', 'orderNumber status')
          .populate('releasedBy', 'displayName')
          .populate('refundedBy', 'displayName')
          .sort({ heldAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Escrow.countDocuments(query),
      ]);

      return { success: true, escrows: escrows as any, total };
    } catch (error) {
      console.error('[EscrowService] getAllEscrows error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get escrow records' 
      };
    }
  }

  /**
   * Get platform revenue from escrow fees
   */
  async getPlatformRevenue(startDate?: Date, endDate?: Date): Promise<{
    success: boolean;
    revenue?: { serviceFee: number; platformFee: number; total: number };
    error?: string;
  }> {
    try {
      const query: any = { status: 'released' };
      
      if (startDate || endDate) {
        query.releasedAt = {};
        if (startDate) query.releasedAt.$gte = startDate;
        if (endDate) query.releasedAt.$lte = endDate;
      }

      const escrows = await Escrow.find(query).lean();
      
      const serviceFee = escrows.reduce((sum, e) => sum + e.serviceFee, 0);
      const platformFee = escrows.reduce((sum, e) => sum + e.platformFee, 0);
      const total = serviceFee + platformFee;

      return { 
        success: true, 
        revenue: { serviceFee, platformFee, total } 
      };
    } catch (error) {
      console.error('[EscrowService] getPlatformRevenue error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get platform revenue' 
      };
    }
  }
}

export const escrowService = new EscrowService();
