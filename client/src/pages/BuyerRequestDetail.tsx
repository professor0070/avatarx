import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface Proposal {
  freelancerId: string;
  price: number;
  currency: string;
  deliveryTimeDays: number;
  pitch: string;
  status: string;
  freelancerAvatar?: string;
  freelancerName?: string;
  freelancerLevel?: string;
  freelancer?: {
    displayName: string;
    avatar: string;
  };
}

interface ProposalData {
  price: number;
  currency: string;
  deliveryTimeDays: number;
  pitch: string;
}

export function BuyerRequestDetailPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({
    price: '',
    currency: 'USD',
    deliveryTimeDays: '',
    pitch: '',
  });

  const { data: requestData, isLoading } = useQuery({
    queryKey: ['buyer-request', requestId],
    queryFn: async () => {
      const response = await api.get(`/api/buyer-requests/${requestId}`);
      return response.data;
    },
    enabled: !!requestId,
  });

  const request = requestData?.request;

  const submitMutation = useMutation({
    mutationFn: async (_data: ProposalData) => {
      const response = await api.post(`/api/buyer-requests/${requestId}/proposals`, _data);
      return response.data;
    },
    onSuccess: () => {
      setShowProposalForm(false);
      setProposalData({ price: '', currency: 'USD', deliveryTimeDays: '', pitch: '' });
      queryClient.invalidateQueries({ queryKey: ['buyer-request', requestId] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (proposalIndex: number) => {
      const response = await api.patch(`/api/buyer-requests/${requestId}/proposals/accept`, {
        proposalIndex,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-request', requestId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (proposalIndex: number) => {
      const response = await api.patch(`/api/buyer-requests/${requestId}/proposals/reject`, {
        proposalIndex,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-request', requestId] });
    },
  });

  const handleProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!proposalData.price || !proposalData.deliveryTimeDays || !proposalData.pitch) {
      alert('Please fill in all required fields');
      return;
    }

    submitMutation.mutate({
      price: parseFloat(proposalData.price),
      currency: proposalData.currency,
      deliveryTimeDays: parseInt(proposalData.deliveryTimeDays),
      pitch: proposalData.pitch,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Request not found</div>
      </div>
    );
  }

  const isOwner = user?.id === request.clientId;
  const canSubmitProposal = ['seller', 'creator', 'admin', 'super_admin'].includes(user?.role ?? '') && request.status === 'open';
  const hasSubmittedProposal = request.proposals.some((p: Proposal) => p.freelancerId === user?.id);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>{request.title} - AvatarX</title>
        <meta name="description" content={request.description} />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/buyer-requests')}
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Back to Requests
          </button>
        </div>

        {/* Request Details */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {request.title}
            </h1>
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              request.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              request.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-400">{request.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {request.category}
            </span>
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              {request.budget.currency} {request.budget.min} - {request.budget.max}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {request.views} views
            </span>
          </div>

          {request.deliveryDeadline && (
            <div className="mt-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Delivery Deadline: {new Date(request.deliveryDeadline).toLocaleDateString()}
              </span>
            </div>
          )}

          {request.skillsRequired && request.skillsRequired.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Skills Required:</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {request.skillsRequired.map((skill: string, idx: number) => (
                  <span key={idx} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Posted by:</h3>
            <div className="mt-2 flex items-center gap-3">
              <img
                src={request.clientAvatar || '/default-avatar.png'}
                alt={request.clientName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{request.clientName}</p>
              </div>
            </div>
          </div>

          {/* Submit Proposal Button */}
          {canSubmitProposal && !hasSubmittedProposal && (
            <div className="mt-6">
              <button
                onClick={() => setShowProposalForm(!showProposalForm)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {showProposalForm ? 'Cancel' : 'Submit Proposal'}
              </button>
            </div>
          )}

          {hasSubmittedProposal && (
            <div className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
              You have already submitted a proposal
            </div>
          )}
        </div>

        {/* Proposal Form */}
        {showProposalForm && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submit Your Proposal</h2>
            <form onSubmit={handleProposalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  value={proposalData.price}
                  onChange={(e) => setProposalData({ ...proposalData, price: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Time (days) *
                </label>
                <input
                  type="number"
                  value={proposalData.deliveryTimeDays}
                  onChange={(e) => setProposalData({ ...proposalData, deliveryTimeDays: e.target.value })}
                  placeholder="7"
                  min="1"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pitch *
                </label>
                <textarea
                  value={proposalData.pitch}
                  onChange={(e) => setProposalData({ ...proposalData, pitch: e.target.value })}
                  placeholder="Explain why you're the best fit for this project..."
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  maxLength={1000}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </form>
          </div>
        )}

        {/* Proposals List */}
        {request.proposals && request.proposals.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Proposals ({request.proposals.length})</h2>
            <div className="mt-4 space-y-4">
              {request.proposals.map((proposal: Proposal, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <img
                        src={proposal.freelancerAvatar || '/default-avatar.png'}
                        alt={proposal.freelancerName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {proposal.freelancerName}
                        </h3>
                        {proposal.freelancerLevel && (
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {proposal.freelancerLevel}
                          </span>
                        )}
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {proposal.pitch}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                            {proposal.currency} {proposal.price}
                          </span>
                          <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {proposal.deliveryTimeDays} days
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        proposal.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        proposal.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                      {isOwner && proposal.status === 'pending' && request.status === 'open' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptMutation.mutate(idx)}
                            disabled={acceptMutation.isPending}
                            className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(idx)}
                            disabled={rejectMutation.isPending}
                            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {request.proposals && request.proposals.length === 0 && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400">No proposals yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
