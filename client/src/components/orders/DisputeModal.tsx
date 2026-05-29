import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Shield, X, Plus, Trash2 } from 'lucide-react';

const disputeReasons = [
  'Seller not delivering on time',
  'Delivered work not as described',
  'Seller not responding',
  'Quality of work is unsatisfactory',
  'Copyright or intellectual property issue',
  'Other',
];

interface DisputeModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}

export function DisputeModal({ orderId, orderNumber, onClose }: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>(['']);
  const queryClient = useQueryClient();

  const createDispute = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/orders/${orderId}/dispute`, {
        orderId,
        reason,
        description,
        evidence: evidence.filter((e) => e.trim()),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      onClose();
    },
  });

  const addEvidenceField = () => setEvidence((prev) => [...prev, '']);
  const removeEvidenceField = (index: number) =>
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  const updateEvidence = (index: number, value: string) =>
    setEvidence((prev) => prev.map((e, i) => (i === index ? value : e)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Open a Dispute</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Order #{orderNumber} — Opening a dispute notifies our moderation team who will review the case.
        </p>

        <div className="space-y-5">
          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select a reason...</option>
              {disputeReasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Evidence */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Evidence URLs
              </label>
              <button
                type="button"
                onClick={addEvidenceField}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <Plus className="h-3 w-3" />
                Add URL
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Provide links to screenshots or files hosted on image/file sharing services.
            </p>
            <div className="space-y-2">
              {evidence.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => updateEvidence(index, e.target.value)}
                    placeholder={`https://example.com/evidence-${index + 1}`}
                    className="block flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  />
                  {evidence.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEvidenceField(index)}
                      className="rounded-lg p-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {createDispute.isError && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {(createDispute.error as any)?.response?.data?.error?.message || 'Failed to create dispute.'}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => createDispute.mutate()}
            disabled={!reason || !description || createDispute.isPending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createDispute.isPending ? 'Submitting...' : 'Open Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}
