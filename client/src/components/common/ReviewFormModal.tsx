import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Star } from 'lucide-react';

interface ReviewFormModalProps {
  orderId: string;
  orderNumber: string;
  gigTitle: string;
  onClose: () => void;
}

export function ReviewFormModal({ orderId, orderNumber, gigTitle, onClose }: ReviewFormModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const submitReview = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/orders/${orderId}/review`, { rating, comment: comment.trim() || undefined });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leave a Review</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Order #{orderNumber} — {gigTitle}
        </p>

        {/* Star Rating */}
        <div className="mt-6 flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 ${
                  star <= (hoveredStar || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-600'
                }`}
                strokeWidth={1.1}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}

        {/* Comment */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Comment <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Share your experience..."
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => rating > 0 && submitReview.mutate()}
            disabled={rating === 0 || submitReview.isPending}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>

        {submitReview.isError && (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
            {(submitReview.error as any)?.response?.data?.error?.message || 'Failed to submit review. Please try again.'}
          </p>
        )}
      </div>
    </div>
  );
}
