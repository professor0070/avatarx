import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { CreditCard, Clock, Check, FileText } from 'lucide-react';

interface CheckoutData {
  gigId: string;
  tierName: string;
  extras: string[];
  totalPrice: number;
  currency: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name?: string | null;
    email?: string | null;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
    escape: boolean;
    handleback: boolean;
  };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  
  // Compute initial checkout data from URL params
  const initialCheckoutData = useMemo(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        return JSON.parse(decodeURIComponent(data));
      } catch {
        return null;
      }
    }
    return null;
  }, [searchParams]);

  const [checkoutData] = useState<CheckoutData | null>(initialCheckoutData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialCheckoutData ? null : 'No checkout data provided');
  const [step, setStep] = useState(1);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'wallet'>('razorpay');

  // Fetch gig details
  const { data: gig, isLoading: gigLoading } = useQuery({
    queryKey: ['gig', checkoutData?.gigId],
    queryFn: async () => {
      if (!checkoutData?.gigId) return null;
      const response = await api.get(`/api/gigs/${checkoutData.gigId}`);
      return response.data.gig;
    },
    enabled: !!checkoutData?.gigId,
  });

  // Initialize requirements answers
  useEffect(() => {
    if (gig?.requirements?.questions) {
      setRequirements(new Array(gig.requirements.questions.length).fill(''));
    }
  }, [gig]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return true; // Order summary is always valid
      case 2:
        if (gig?.requirements?.enabled) {
          return requirements.every(req => req.trim().length > 0);
        }
        return true;
      case 3:
        return true; // Payment step validation handled in submit
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !checkoutData || !gig) {
      setError('Missing required information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First create the order
      const orderPayload = {
        gigId: checkoutData.gigId,
        tierName: checkoutData.tierName,
        extras: checkoutData.extras,
        requirements: gig.requirements.enabled ? {
          answers: requirements,
          submittedAt: new Date(),
        } : undefined,
        paymentMethod,
      };

      const orderResponse = await api.post('/api/orders', orderPayload);
      
      if (!orderResponse.data.ok) {
        setError(orderResponse.data.error?.message || 'Failed to create order');
        return;
      }

      const order = orderResponse.data.order;
      
      if (paymentMethod === 'wallet') {
        // Wallet payment is processed immediately
        navigate(`/orders/${order._id}`);
        return;
      }

      // Handle Razorpay payment
      if (paymentMethod === 'razorpay') {
        try {
          // Create Razorpay order
          const razorpayResponse = await api.post('/api/payments/razorpay/create-order', {
            orderId: order._id,
            amount: calculateTotalPrice(),
            currency: gig.tier.currency,
          });

          if (!razorpayResponse.data.ok) {
            setError(razorpayResponse.data.error?.message || 'Failed to create payment order');
            return;
          }

          const razorpayOrder = razorpayResponse.data.razorpayOrder;

          // Load Razorpay script
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);

          script.onload = () => {
            // Initialize Razorpay
            const options = {
              key: razorpayOrder.key_id,
              amount: razorpayOrder.amount,
              currency: razorpayOrder.currency,
              name: 'AvatarX',
              description: `Payment for ${gig.title}`,
              order_id: razorpayOrder.id,
              handler: async (response: RazorpayResponse) => {
                try {
                  // Verify payment
                  const verifyResponse = await api.post('/api/payments/razorpay/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  });

                  if (verifyResponse.data.ok) {
                    navigate(`/orders/${order._id}`);
                  } else {
                    setError('Payment verification failed');
                  }
                } catch (error) {
                  const apiError = error as ApiError;
                  setError(apiError.response?.data?.error?.message || 'Payment verification failed');
                } finally {
                  setLoading(false);
                }
              },
              prefill: {
                name: user.displayName,
                email: user.email,
              },
              theme: {
                color: '#4F46E5', // Indigo-600
              },
              modal: {
                ondismiss: () => {
                  setLoading(false);
                  setError('Payment cancelled');
                },
                escape: true,
                handleback: true,
              },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
          };

        } catch (error) {
          const apiError = error as ApiError;
          setError(apiError.response?.data?.error?.message || 'Failed to initialize payment');
          setLoading(false);
        }
      }

    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error?.message || 'Failed to create order');
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!gig || !checkoutData) return 0;
    
    let total = gig.tier.price;
    
    // Add extras
    checkoutData.extras.forEach((extraId: string) => {
      const extra = gig.extras.find((e: { id: string; price: number }) => e.id === extraId);
      if (extra) {
        total += extra.price;
      }
    });
    
    // Add fees
    const serviceFee = Math.round(total * 0.05);
    const platformFee = Math.round(total * 0.02);
    
    return total + serviceFee + platformFee;
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!checkoutData || gigLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Helmet>
        <title>Checkout | AvatarX</title>
        <meta name="description" content="Complete your order on AvatarX" />
      </Helmet>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Checkout</h1>
              <span className="text-sm text-slate-500">
                Step {step} of 3
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-800">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Order Summary */}
          {step === 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                Order Summary
              </h2>

              {/* Gig Info */}
              <div className="flex gap-4 mb-6">
                <img
                  src={gig.thumbnail}
                  alt={gig.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {gig.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span>by {gig.sellerDisplayName}</span>
                    <span>•</span>
                    <span className="capitalize">{gig.sellerLevel.replace('_', ' ')}</span>
                    {gig.sellerVerificationBadge && (
                      <span className="text-indigo-600">✓</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tier Details */}
              <div className="border-t border-slate-200 pt-4 mb-6 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {gig.tier.name} Package
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  {gig.tier.description}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Delivery:</span>
                    <span className="ml-2 text-slate-900 dark:text-white">
                      {gig.tier.deliveryTimeDays} days
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Revisions:</span>
                    <span className="ml-2 text-slate-900 dark:text-white">
                      {gig.tier.revisions} included
                    </span>
                  </div>
                </div>
              </div>

              {/* Extras */}
              {checkoutData.extras.length > 0 && (
                <div className="border-t border-slate-200 pt-4 mb-6 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                    Extras
                  </h3>
                  {checkoutData.extras.map((extraId: string) => {
                    const extra = gig.extras.find((e: { id: string; name: string; description: string; price: number; currency: string }) => e.id === extraId);
                    return extra ? (
                      <div key={extra.id} className="flex justify-between items-center py-2">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {extra.name}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {extra.description}
                          </div>
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatPrice(extra.price, extra.currency)}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Pricing Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Base Price</span>
                    <span className="text-slate-900 dark:text-white">
                      {formatPrice(gig.tier.price, gig.tier.currency)}
                    </span>
                  </div>
                  {checkoutData.extras.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Extras</span>
                      <span className="text-slate-900 dark:text-white">
                        {formatPrice(
                          checkoutData.extras.reduce((sum: number, extraId: string) => {
                            const extra = gig.extras.find((e: { id: string; price: number }) => e.id === extraId);
                            return sum + (extra?.price || 0);
                          }, 0),
                          gig.tier.currency
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Service Fee (5%)</span>
                    <span className="text-slate-900 dark:text-white">
                      {formatPrice(Math.round(gig.tier.price * 0.05), gig.tier.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Platform Fee (2%)</span>
                    <span className="text-slate-900 dark:text-white">
                      {formatPrice(Math.round(gig.tier.price * 0.02), gig.tier.currency)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 mt-2 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">
                        {formatPrice(calculateTotalPrice(), gig.tier.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 2 && gig.requirements.enabled && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                Requirements
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Please provide the following information to help the seller deliver your order.
              </p>
              <div className="space-y-4">
                {gig.requirements.questions.map((question: string, index: number) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {question}
                    </label>
                    <textarea
                      value={requirements[index] || ''}
                      onChange={(e) => handleRequirementChange(index, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      rows={3}
                      placeholder="Enter your answer..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Skip Requirements */}
          {step === 2 && !gig.requirements.enabled && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                No Requirements
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                This gig doesn't require any additional information. Proceed to payment.
              </p>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                Payment Method
              </h2>
              
              <div className="space-y-4">
                {/* Razorpay Option */}
                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-500 dark:border-slate-800">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentMethod(e.target.value as 'razorpay' | 'wallet')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Credit/Debit Card
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Pay securely with Razorpay
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    <CreditCard className="w-6 h-6" strokeWidth={1.1} />
                  </div>
                </label>

                {/* Wallet Option */}
                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-500 dark:border-slate-800">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentMethod(e.target.value as 'razorpay' | 'wallet')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        AvatarX Wallet
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Pay using your wallet balance
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {formatPrice(user?.crWalletBalance || 0, 'INR')}
                    </div>
                    {(user?.crWalletBalance || 0) < calculateTotalPrice() && (
                      <div className="text-xs text-red-600">Insufficient balance</div>
                    )}
                  </div>
                </label>
              </div>

              {/* Order Summary */}
              <div className="border-t border-slate-200 pt-6 mt-6 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Total Amount
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Including all fees
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatPrice(calculateTotalPrice(), gig.tier.currency)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Order Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Gig</span>
                <span className="text-slate-900 dark:text-white truncate max-w-[120px]">
                  {gig.title}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Package</span>
                <span className="text-slate-900 dark:text-white">
                  {gig.tier.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Delivery</span>
                <span className="text-slate-900 dark:text-white">
                  {gig.tier.deliveryTimeDays} days
                </span>
              </div>
              {checkoutData.extras.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Extras</span>
                  <span className="text-slate-900 dark:text-white">
                    {checkoutData.extras.length} items
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatPrice(calculateTotalPrice(), gig.tier.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Delivery Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" strokeWidth={1.1} />
                <span className="text-slate-600 dark:text-slate-400">
                  {gig.tier.deliveryTimeDays} days delivery
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-400" strokeWidth={1.1} />
                <span className="text-slate-600 dark:text-slate-400">
                  {gig.tier.revisions} revisions included
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" strokeWidth={1.1} />
                <span className="text-slate-600 dark:text-slate-400">
                  {gig.deliveryType === 'instant' ? 'Instant delivery' : 'Manual delivery'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="space-y-3">
            {step > 1 && (
              <button
                onClick={handlePrevious}
                className="w-full rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                Previous
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep()}
                className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || (paymentMethod === 'wallet' && (user?.crWalletBalance || 0) < calculateTotalPrice())}
                className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Pay ${formatPrice(calculateTotalPrice(), gig.tier.currency)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
