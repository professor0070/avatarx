const levelConfig: Record<string, { label: string; colors: string }> = {
  new: { label: 'New Seller', colors: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  level1: { label: 'Level 1', colors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  level2: { label: 'Level 2', colors: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  top_rated: { label: 'Top Rated', colors: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  pro: { label: 'Pro', colors: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

export function SellerLevelBadge({ level }: { level: string }) {
  const config = levelConfig[level] || levelConfig.new;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.colors}`}>
      {config.label}
    </span>
  );
}
