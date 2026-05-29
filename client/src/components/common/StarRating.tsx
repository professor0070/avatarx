import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
}

const sizeMap = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };

export function StarRating({ rating, size = 'md', showCount, count }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeMap[size]} ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-600'
          }`}
          strokeWidth={1.1}
        />
      ))}
      {showCount && (
        <span className="ml-1 text-sm text-slate-600 dark:text-slate-400">
          {rating.toFixed(1)} ({count ?? 0})
        </span>
      )}
    </div>
  );
}
