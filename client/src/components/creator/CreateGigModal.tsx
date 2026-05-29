import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { X, CheckCircle, Package, Briefcase, ChevronRight } from 'lucide-react';

interface CreateGigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateGigModal({ isOpen, onClose, onSuccess }: CreateGigModalProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'product' | 'service'>('service');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    '3D Models',
    'Custom Rooms',
    'Outfits',
    'Animations'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = {
        title,
        description,
        type,
        category,
        tiers: [
          {
            name: 'Basic',
            description: 'Standard delivery',
            price,
            currency: 'INR',
            deliveryTimeDays: 3,
            revisions: 1,
            features: ['Standard feature']
          }
        ]
      };

      await api.post('/api/gigs/create', payload);
      setTitle('');
      setDescription('');
      setPrice(500);
      setCategory('');
      setStep(1);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create gig');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New {type === 'product' ? 'Product' : 'Service'}</h2>
              <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">What are you offering?</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setType('service')}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${type === 'service' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}
                    >
                      <Briefcase className={`w-8 h-8 mb-4 ${type === 'service' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <h4 className={`font-bold ${type === 'service' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>Service Gig</h4>
                      <p className="text-sm text-slate-500 mt-1">Offer freelance work, custom requests, and time-based skills.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('product')}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${type === 'product' ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-fuchsia-300'}`}
                    >
                      <Package className={`w-8 h-8 mb-4 ${type === 'product' ? 'text-fuchsia-600' : 'text-slate-400'}`} />
                      <h4 className={`font-bold ${type === 'product' ? 'text-fuchsia-900 dark:text-fuchsia-100' : 'text-slate-900 dark:text-white'}`}>Digital Product</h4>
                      <p className="text-sm text-slate-500 mt-1">Sell 3D assets, meshes, presets, and downloadable files.</p>
                    </button>
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:bg-slate-800 flex items-center gap-2 transition-colors">
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="I will create..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Category</label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a category</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Describe your offering in detail..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Base Price (INR)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl transition-colors">
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : 'Publish'} <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
