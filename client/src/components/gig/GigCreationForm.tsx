import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { isNotEmpty, hasMinLength, hasMaxLength, sanitizeText } from '../../lib/sanitize';
import { X, Check } from 'lucide-react';

interface GigCreationFormProps {
  gigId?: string;
}

type GigType = 'product' | 'service' | 'both';
type GigCategory = 
  | 'Game Credits'
  | 'Adult Triggers Male'
  | 'Adult Triggers Female'
  | 'Adult Rooms'
  | 'Outfits Male'
  | 'Outfits Female'
  | 'Badges'
  | 'Room Decoration'
  | 'Adult Triggers Making'
  | 'Brand Ambassador Management'
  | 'Agency Management'
  | 'Instagram Reels'
  | 'Marriage Videographer'
  | 'Photo Editor'
  | 'Custom Services';

type TierName = 'Basic' | 'Standard' | 'Premium';

interface GigTier {
  name: TierName;
  description: string;
  price: number;
  currency: 'INR' | 'USD';
  deliveryTimeDays: number;
  revisions: number;
  features: string[];
}

interface GigExtra {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'INR' | 'USD';
  deliveryTimeDays?: number;
}

interface GigMedia {
  url: string;
  type: 'image' | 'video';
  title?: string;
  order: number;
}

interface GigFAQ {
  question: string;
  answer: string;
  order: number;
}

const categories: GigCategory[] = [
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

const adultCategories = [
  'Adult Triggers Male',
  'Adult Triggers Female',
  'Adult Rooms',
  'Adult Triggers Making',
];

const SELLER_ROLES = ['seller', 'creator', 'admin', 'super_admin'];

export function GigCreationForm({ gigId }: GigCreationFormProps = {}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isEditing = !!gigId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(4);

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GigType>('service');
  const [category, setCategory] = useState<GigCategory>('Custom Services');
  const [isAdultContent, setIsAdultContent] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Media
  const [gallery, setGallery] = useState<GigMedia[]>([]);
  const [thumbnail, setThumbnail] = useState('');

  // Pricing
  const [tiers, setTiers] = useState<GigTier[]>([
    {
      name: 'Basic',
      description: '',
      price: 5,
      currency: 'INR',
      deliveryTimeDays: 1,
      revisions: 0,
      features: [''],
    },
  ]);
  const [extras, setExtras] = useState<GigExtra[]>([]);

  // Delivery
  const [deliveryType, setDeliveryType] = useState<'instant' | 'manual'>('manual');
  const [requirements, setRequirements] = useState({
    enabled: false,
    questions: [''],
  });

  // Settings
  const [requestToOrder, setRequestToOrder] = useState(false);

  // FAQs
  const [faqs, setFaqs] = useState<GigFAQ[]>([]);

  useEffect(() => {
    if (!gigId) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const res = await api.get(`/api/gigs/${gigId}`);
        if (cancelled) return;
        const gig = res.data.gig;
        setTitle(gig.title || '');
        setDescription(gig.description || '');
        setType(gig.type || 'service');
        setCategory(gig.category || 'Custom Services');
        setIsAdultContent(gig.isAdultContent || false);
        setTags(gig.tags || []);
        setGallery(gig.gallery || []);
        setThumbnail(gig.thumbnail || '');
        if (gig.tiers) setTiers(gig.tiers);
        setExtras(gig.extras || []);
        setDeliveryType(gig.deliveryType || 'manual');
        if (gig.requirements) setRequirements(gig.requirements);
        setRequestToOrder(gig.requestToOrder || false);
        setFaqs(gig.faqs || []);
      } catch (err) {
        if (!cancelled) setError('Failed to load gig data');
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gigId]);

  const handleNext = useCallback(() => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  }, [step, totalSteps]);

  const handlePrevious = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  const handleCategoryChange = useCallback((newCategory: GigCategory) => {
    setCategory(newCategory);
    setIsAdultContent(adultCategories.includes(newCategory));
  }, []);

  const handleTagsChange = useCallback((value: string) => {
    const tagArray = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagArray.length <= 5) {
      setTags(tagArray);
    }
  }, []);

  const handleTierChange = useCallback((index: number, field: keyof GigTier, value: unknown) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  }, [tiers]);

  const addTier = useCallback(() => {
    if (tiers.length < 3) {
      const availableTiers: TierName[] = ['Basic', 'Standard', 'Premium'];
      const usedTiers = tiers.map(t => t.name);
      const nextTier = availableTiers.find(t => !usedTiers.includes(t));
      
      if (nextTier) {
        setTiers([...tiers, {
          name: nextTier,
          description: '',
          price: 5,
          currency: 'INR',
          deliveryTimeDays: 1,
          revisions: 0,
          features: [''],
        }]);
      }
    }
  }, [tiers]);

  const removeTier = useCallback((index: number) => {
    if (tiers.length > 1) {
      setTiers(tiers.filter((_, i) => i !== index));
    }
  }, [tiers]);

  const addExtra = useCallback(() => {
    setExtras([...extras, {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      currency: 'INR',
    }]);
  }, [extras]);

  const removeExtra = useCallback((index: number) => {
    setExtras(extras.filter((_, i) => i !== index));
  }, [extras]);

  const handleExtraChange = useCallback((index: number, field: keyof GigExtra, value: unknown) => {
    const newExtras = [...extras];
    newExtras[index] = { ...newExtras[index], [field]: value };
    setExtras(newExtras);
  }, [extras]);

  const addFAQ = useCallback(() => {
    setFaqs([...faqs, {
      question: '',
      answer: '',
      order: faqs.length,
    }]);
  }, [faqs]);

  const removeFAQ = useCallback((index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  }, [faqs]);

  const handleFAQChange = useCallback((index: number, field: keyof GigFAQ, value: unknown) => {
    const newFAQs = [...faqs];
    newFAQs[index] = { ...newFAQs[index], [field]: value };
    setFaqs(newFAQs);
  }, [faqs]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('files', file);

      try {
        const response = await api.post('/api/upload/gig-media', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return response.data.files[0];
      } catch (error) {
        console.error('Upload failed:', error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const validResults = results.filter(result => result !== null);

    setGallery(prev => [...prev, ...validResults]);
    
    // Set first image as thumbnail if no thumbnail is set
    if (!thumbnail && validResults.length > 0 && validResults[0].type === 'image') {
      setThumbnail(validResults[0].url);
    }
  }, [thumbnail]);

  const validateStep = useCallback(() => {
    switch (step) {
      case 1:
        return isNotEmpty(title) &&
               hasMinLength(title, 5) &&
               hasMaxLength(title, 100) &&
               isNotEmpty(description) &&
               hasMinLength(description, 20) &&
               hasMaxLength(description, 2000) &&
               category &&
               tags.length > 0 &&
               tags.length <= 5;
      case 2:
        return gallery.length > 0 && thumbnail;
      case 3:
        return tiers.length > 0 && tiers.every(tier =>
          isNotEmpty(tier.description) &&
          tier.price >= 5 &&
          tier.deliveryTimeDays >= 1
        );
      case 4:
        return true; // Final step - all validations done
      default:
        return false;
    }
  }, [step, title, description, category, tags, gallery, thumbnail, tiers]);

  const handleSubmit = useCallback(async () => {
    if (!user || !user.activeRole || !SELLER_ROLES.includes(user.activeRole)) {
      setError('Only sellers and creators can create gigs');
      return;
    }

    // Final validation before submission
    if (!isNotEmpty(title) || !hasMinLength(title, 5) || !hasMaxLength(title, 100)) {
      setError('Title must be 5-100 characters');
      return;
    }
    if (!isNotEmpty(description) || !hasMinLength(description, 20) || !hasMaxLength(description, 2000)) {
      setError('Description must be 20-2000 characters');
      return;
    }
    if (tags.length === 0 || tags.length > 5) {
      setError('Please add 1-5 tags');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Sanitize user input before sending to API
      const gigData = {
        title: sanitizeText(title),
        description: sanitizeText(description),
        type,
        category,
        isAdultContent,
        tags: tags.map(tag => sanitizeText(tag)),
        gallery,
        thumbnail,
        tiers: tiers.map(tier => ({
          ...tier,
          description: sanitizeText(tier.description),
          features: tier.features.map(f => sanitizeText(f)),
        })),
        extras: extras.map(extra => ({
          ...extra,
          name: sanitizeText(extra.name),
          description: sanitizeText(extra.description),
        })),
        deliveryType,
        requirements,
        requestToOrder,
        faqs,
      };

      const url = isEditing ? `/api/gigs/${gigId}` : '/api/gigs';
      const method = isEditing ? api.put : api.post;
      const response = await method(url, gigData);
      
      if (response.data.ok) {
        navigate(isEditing ? `/gig/${gigId}` : '/dashboard?tab=gigs&status=success');
      } else {
        setError(response.data.error?.message || `Failed to ${isEditing ? 'update' : 'create'} gig`);
      }
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError.response?.data?.error?.message || `Failed to ${isEditing ? 'update' : 'create'} gig`);
    } finally {
      setLoading(false);
    }
  }, [user, title, description, type, category, isAdultContent, tags, gallery, thumbnail, tiers, extras, deliveryType, requirements, requestToOrder, faqs, isEditing, gigId, navigate]);

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Gig Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="What will you deliver?"
                maxLength={80}
              />
              <p className="mt-1 text-xs text-slate-500">{title.length}/80 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Gig Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Describe your gig in detail..."
                rows={6}
                maxLength={3000}
              />
              <p className="mt-1 text-xs text-slate-500">{description.length}/3000 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Gig Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['product', 'service', 'both'] as GigType[]).map((typeOption) => (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setType(typeOption)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
                      type === typeOption
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    {typeOption}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as GigCategory)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {isAdultContent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Adult Content Warning
                </div>
                <div className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                  This gig contains adult content and will only be visible to users who are age verified (18+) and have the required badges.
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search Tags (max 5, comma-separated)
              </label>
              <input
                type="text"
                value={tags.join(', ')}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="e.g., imvu, credits, custom, fast delivery"
              />
              <p className="mt-1 text-xs text-slate-500">{tags.length}/5 tags</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Gig Gallery *
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center dark:border-slate-700">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-slate-600 dark:text-slate-400">
                    <div className="text-lg font-medium">Drop files here or click to upload</div>
                    <div className="text-sm mt-1">Images and videos up to 25MB</div>
                  </div>
                </label>
              </div>
              
              {gallery.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.map((media, index) => (
                    <div key={index} className="relative group">
                      {media.type === 'image' ? (
                        <img
                          src={media.url}
                          alt={`Gallery image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-32 object-cover rounded-lg"
                          muted
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setGallery(gallery.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" strokeWidth={1.1} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Thumbnail *
              </label>
              {gallery.filter(m => m.type === 'image').length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {gallery.filter(m => m.type === 'image').map((media, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setThumbnail(media.url)}
                      className={`relative rounded-lg overflow-hidden border-2 ${
                        thumbnail === media.url
                          ? 'border-indigo-500'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <img
                        src={media.url}
                        alt={`Thumbnail option ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      {thumbnail === media.url && (
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1">
                          <Check className="w-3 h-3 fill-white" strokeWidth={1.1} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pricing Tiers *
                </label>
                {tiers.length < 3 && (
                  <button
                    type="button"
                    onClick={addTier}
                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    + Add Tier
                  </button>
                )}
              </div>

              {tiers.map((tier, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900 dark:text-white">{tier.name}</h3>
                    {tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={tier.description}
                        onChange={(e) => handleTierChange(index, 'description', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="What's included in this tier?"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) => handleTierChange(index, 'price', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        min={5}
                        step={1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Delivery Time (days)
                      </label>
                      <input
                        type="number"
                        value={tier.deliveryTimeDays}
                        onChange={(e) => handleTierChange(index, 'deliveryTimeDays', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        min={1}
                        step={1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Revisions
                      </label>
                      <input
                        type="number"
                        value={tier.revisions}
                        onChange={(e) => handleTierChange(index, 'revisions', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        min={0}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Features
                    </label>
                    {tier.features.map((feature, featureIndex) => (
                      <input
                        key={featureIndex}
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...tier.features];
                          newFeatures[featureIndex] = e.target.value;
                          handleTierChange(index, 'features', newFeatures);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 mb-2"
                        placeholder="Feature description"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newFeatures = [...tier.features, ''];
                        handleTierChange(index, 'features', newFeatures);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      + Add Feature
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gig Extras (Optional)
                </label>
                <button
                  type="button"
                  onClick={addExtra}
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  + Add Extra
                </button>
              </div>

              {extras.map((extra, index) => (
                <div key={extra.id} className="border border-slate-200 rounded-lg p-4 mb-4 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900 dark:text-white">Extra {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeExtra(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Extra Name
                      </label>
                      <input
                        type="text"
                        value={extra.name}
                        onChange={(e) => handleExtraChange(index, 'name', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="e.g., Additional revision"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={extra.price}
                        onChange={(e) => handleExtraChange(index, 'price', Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        min={0}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={extra.description}
                      onChange={(e) => handleExtraChange(index, 'description', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="Describe this extra"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Delivery Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['manual', 'instant'] as const).map((deliveryOption) => (
                  <button
                    key={deliveryOption}
                    type="button"
                    onClick={() => setDeliveryType(deliveryOption)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
                      deliveryType === deliveryOption
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    {deliveryOption === 'manual' ? 'Manual Delivery' : 'Instant Download'}
                  </button>
                ))}
              </div>
              {deliveryType === 'instant' && (
                <p className="mt-2 text-xs text-slate-500">
                  Instant delivery will automatically provide files to buyers after payment
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={requirements.enabled}
                  onChange={(e) => setRequirements(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Require buyer information before order
                </span>
              </label>
              
              {requirements.enabled && (
                <div className="mt-4 space-y-2">
                  {requirements.questions.map((question, index) => (
                    <input
                      key={index}
                      type="text"
                      value={question}
                      onChange={(e) => {
                        const newQuestions = [...requirements.questions];
                        newQuestions[index] = e.target.value;
                        setRequirements(prev => ({ ...prev, questions: newQuestions }));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="Question for buyer"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setRequirements(prev => ({ ...prev, questions: [...prev.questions, ''] }))}
                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    + Add Question
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={requestToOrder}
                  onChange={(e) => setRequestToOrder(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-950"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Request to Order (approval required)
                </span>
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Buyers will need to send a request that you must approve before the order is created
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Frequently Asked Questions (Optional)
                </label>
                <button
                  type="button"
                  onClick={addFAQ}
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  + Add FAQ
                </button>
              </div>

              {faqs.map((faq, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 mb-4 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900 dark:text-white">FAQ {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeFAQ(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Question
                      </label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="Common question about your gig"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Answer
                      </label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="Your answer"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Layer 3 Defence: Early render-time role check ──────────────────────────
  // SellerRoute already blocks at the router level, but this is the last safety
  // net in case someone bypasses the route guard via direct URL manipulation.
  if (user && (!user.activeRole || !SELLER_ROLES.includes(user.activeRole))) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Seller Account Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Only verified sellers can create and list services on AvatarX. 
            Upgrade your account to start earning.
          </p>
          <button
            onClick={() => navigate('/dashboard/user')}
            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl">
        <Helmet>
          <title>{isEditing ? 'Edit Gig' : 'Create Gig'} | AvatarX</title>
          <meta name="description" content={isEditing ? 'Edit your gig on AvatarX' : 'Create a new gig to offer your services on AvatarX'} />
        </Helmet>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Gig' : 'Create New Gig'}</h1>
              <span className="text-sm text-slate-500">
                Step {step} of {totalSteps}
              </span>
            </div>
          <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-800">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {fetching && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {!fetching && error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        {!fetching && renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={step === 1}
            className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            Previous
          </button>

          {step === totalSteps ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || fetching || !validateStep()}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Gig')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!validateStep()}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
