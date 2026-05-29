import crypto from 'crypto';
import Razorpay from 'razorpay';
import { MarketOrder } from '../models/market-order.model';
import { Product } from '../models/Product';
import { User } from '../models/user.model';

export interface RazorpayOrderResponse {
  id: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  order?: {
    id: string;
    status: string;
    product: {
      id: string;
      title: string;
      category: string;
      creditAmount: number;
    };
  };
  error?: string;
}

export class PaymentService {
  private razorpayKey: string;
  private razorpaySecret: string;

  constructor() {
    this.razorpayKey = process.env.RAZORPAY_KEY_ID || '';
    this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  private checkCredentials(): void {
    if (!this.razorpayKey || !this.razorpaySecret) {
      throw new Error('Razorpay credentials not configured');
    }
  }

  private getRazorpayInstance() {
    this.checkCredentials();
    return new Razorpay({
      key_id: this.razorpayKey,
      key_secret: this.razorpaySecret,
    });
  }

  async generateRazorpayOrder(productId: string, userId: string): Promise<RazorpayOrderResponse> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.status !== 'available') {
        throw new Error('Product is not available');
      }

      const razorpay = this.getRazorpayInstance();
      const amountInPaise = Number(product.price) * 100;

      const razorpayOrder = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `product_${product._id}`,
        notes: {
          productId: product._id.toString(),
          buyerId: userId,
        },
      };

      const razorpayOrderResponse = await razorpay.orders.create(razorpayOrder);

      const order = await MarketOrder.create({
        buyer: userId,
        product: product._id,
        razorpayOrderId: razorpayOrderResponse.id,
        amount: product.price,
        status: 'pending',
      });

      return {
        id: order._id.toString(),
        razorpayOrderId: razorpayOrderResponse.id,
        amount: Number(razorpayOrderResponse.amount),
        currency: razorpayOrderResponse.currency,
        key_id: this.razorpayKey,
      };
    } catch (error) {
      throw new Error(`Failed to generate Razorpay order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  verifySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpaySecret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  }

  async processPaymentVerification(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    userId: string
  ): Promise<PaymentVerificationResult> {
    try {
      if (!this.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        return { success: false, error: 'Invalid payment signature' };
      }

      const order = await MarketOrder.findOne({ razorpayOrderId });
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.buyer.toString() !== userId) {
        return { success: false, error: 'Access denied' };
      }

      if (order.status !== 'pending') {
        return { success: false, error: 'Payment already processed' };
      }

      const product = await Product.findById(order.product);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      order.razorpayPaymentId = razorpayPaymentId;
      order.status = 'completed';
      await order.save();

      product.status = 'sold';
      await product.save();

      if (product.category === 'credits') {
        const user = await User.findById(userId);
        if (user) {
          user.credits = (user.credits || 0) + product.creditAmount;
          await user.save();
        }
      }

      return {
        success: true,
        order: {
          id: order._id.toString(),
          status: order.status,
          product: {
            id: product._id.toString(),
            title: product.title,
            category: product.category,
            creditAmount: product.creditAmount,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const paymentService = new PaymentService();
