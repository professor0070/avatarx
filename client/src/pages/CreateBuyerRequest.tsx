import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { isNotEmpty, hasMinLength, hasMaxLength, isValidPrice, sanitizeText } from '../lib/sanitize';

const categories = [
  'Game Credits',
  'Adult Triggers Male',
  'Adult Triggers Female',
  'Adult Rooms',
  'Outfits Male',
  'Outfits Female',
  'Badges',
  'Room Decoration',
  'Adult Triggers Making',
  'Brand Ambassador Management',
  'Agency Management',
  'Instagram Reels',
  'Marriage Videographer',
  'Photo Editor',
  'Custom Services',
];

const currencies = ['USD', 'INR', 'CR'];

interface BuyerRequestData {
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  deliveryDeadline?: Date;
  skillsRequired: string[];
  attachments: { url: string; filename: string }[];
}

export function CreateBuyerRequestPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD',
    deliveryDeadline: '',
    skillsRequired: '',
    attachments: [] as { url: string; filename: string }[],
  });

  const mutation = useMutation({
    mutationFn: async (data: BuyerRequestData) => {
      const response = await api.post('/api/buyer-requests', data);
      return response.data;
    },
    onSuccess: () => {
      navigate('/buyer-requests');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate title
    if (!isNotEmpty(formData.title)) {
      alert('Title is required');
      return;
    }
    if (!hasMinLength(formData.title, 5) || !hasMaxLength(formData.title, 100)) {
      alert('Title must be 5-100 characters');
      return;
    }

    // Validate description
    if (!isNotEmpty(formData.description)) {
      alert('Description is required');
      return;
    }
    if (!hasMinLength(formData.description, 20) || !hasMaxLength(formData.description, 2000)) {
      alert('Description must be 20-2000 characters');
      return;
    }

    // Validate category
    if (!isNotEmpty(formData.category)) {
      alert('Category is required');
      return;
    }

    // Validate budget
    if (!formData.budgetMin || !formData.budgetMax) {
      alert('Budget range is required');
      return;
    }
    if (!isValidPrice(formData.budgetMin) || !isValidPrice(formData.budgetMax)) {
      alert('Please enter valid budget amounts');
      return;
    }

    const budget = {
      min: parseFloat(formData.budgetMin),
      max: parseFloat(formData.budgetMax),
      currency: formData.currency,
    };

    if (budget.min < 0 || budget.max < 0) {
      alert('Budget cannot be negative');
      return;
    }

    if (budget.min > budget.max) {
      alert('Minimum budget cannot exceed maximum budget');
      return;
    }

    const skills = formData.skillsRequired
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);

    // Sanitize user input before sending to API
    mutation.mutate({
      title: sanitizeText(formData.title),
      description: sanitizeText(formData.description),
      category: formData.category,
      budget,
      deliveryDeadline: formData.deliveryDeadline ? new Date(formData.deliveryDeadline) : undefined,
      skillsRequired: skills.map(skill => sanitizeText(skill)),
      attachments: formData.attachments,
    });
  };

  if (!user || user.activeRole !== 'buyer') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Only buyers can post buyer requests
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Post Buyer Request - AvatarX</title>
        <meta name="description" content="Post a buyer request and get proposals from freelancers" />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Post a Buyer Request
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Describe your project and get proposals from talented freelancers
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What do you need?"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              maxLength={200}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project in detail..."
              rows={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              maxLength={2000}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Budget *
              </label>
              <input
                type="number"
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Budget *
              </label>
              <input
                type="number"
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency *
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              >
                {currencies.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery Deadline */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Delivery Deadline
            </label>
            <input
              type="date"
              value={formData.deliveryDeadline}
              onChange={(e) => setFormData({ ...formData, deliveryDeadline: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Skills Required */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Skills Required (comma-separated)
            </label>
            <input
              type="text"
              value={formData.skillsRequired}
              onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
              placeholder="e.g., 3D modeling, animation, texturing"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/buyer-requests')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Posting...' : 'Post Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
