interface StatusEntry {
  status: string;
  timestamp: string;
  comment?: string;
}

const statusLabels: Record<string, { label: string; icon: string }> = {
  pending: { label: 'Order Placed', icon: '📋' },
  payment_pending: { label: 'Payment Pending', icon: '⏳' },
  payment_failed: { label: 'Payment Failed', icon: '❌' },
  payment_completed: { label: 'Payment Completed', icon: '💳' },
  requirements_submitted: { label: 'Requirements Submitted', icon: '📝' },
  in_progress: { label: 'In Progress', icon: '⚙️' },
  revision_requested: { label: 'Revision Requested', icon: '🔄' },
  in_revision: { label: 'In Revision', icon: '🔧' },
  delivered: { label: 'Delivered', icon: '📦' },
  completed: { label: 'Completed', icon: '✅' },
  cancelled: { label: 'Cancelled', icon: '🚫' },
  refunded: { label: 'Refunded', icon: '💸' },
};

const terminalStatuses = new Set(['completed', 'cancelled', 'refunded']);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function OrderTimeline({ statusHistory }: { statusHistory: StatusEntry[] }) {
  return (
    <div className="relative">
      {statusHistory.map((entry, index) => {
        const info = statusLabels[entry.status] || { label: entry.status, icon: '•' };
        const isLast = index === statusHistory.length - 1;
        const isTerminal = terminalStatuses.has(entry.status);

        return (
          <div key={index} className="flex gap-4 pb-8 last:pb-0">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm shadow-sm ${
                isTerminal && isLast
                  ? entry.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-indigo-500 text-white'
              }`}>
                {info.icon}
              </div>
              {!isLast && (
                <div className="mt-1 w-0.5 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {info.label}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(entry.timestamp)}
                </span>
              </div>
              {entry.comment && (
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {entry.comment}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
