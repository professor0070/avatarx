import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface AssetFormData {
  name: string;
  description: string;
  type: 'product' | 'room' | 'avatar' | 'sticker' | 'bundle' | 'outfit';
  category: string;
  subcategory: string;
  tags: string[];
  price: string;
  currency: 'INR' | 'USD' | 'credits';
  creditsPrice: string;
  isAdultContent: boolean;
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

interface Asset {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  status: string;
  createdAt: string;
  price?: number;
  currency?: string;
  imvuStatus?: string;
  assetId?: string;
}

const ASSET_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'room', label: 'Room' },
  { value: 'avatar', label: 'Avatar' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'outfit', label: 'Outfit' },
];

const CATEGORIES = [
  'Clothing', 'Accessories', 'Furniture', 'Decorations', 'Animations',
  'Music', 'Backgrounds', 'Effects', 'Tools', 'Other'
];

export function AssetUploadPage() {
  const { user } = useAuthStore();
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    description: '',
    type: 'product',
    category: '',
    subcategory: '',
    tags: [],
    price: '',
    currency: 'credits',
    creditsPrice: '',
    isAdultContent: false,
  });
  const [tagInput, setTagInput] = useState('');

  // Fetch user's assets
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['my-assets'],
    queryFn: async () => {
      const res = await api.get('/api/assets/my-assets');
      return res.data;
    },
  });

  // Upload asset mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post('/api/assets/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      alert('Asset uploaded successfully!');
      setFiles([]);
      setFormData({
        name: '',
        description: '',
        type: 'product',
        category: '',
        subcategory: '',
        tags: [],
        price: '',
        currency: 'credits',
        creditsPrice: '',
        isAdultContent: false,
      });
    },
    onError: (error) => {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.error?.message || 'Failed to upload asset');
    },
  });

  // Sync to IMVU mutation
  const syncMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await api.post(`/api/assets/${assetId}/sync-imvu`);
      return res.data;
    },
    onSuccess: () => {
      alert('Asset synced to IMVU marketplace!');
    },
    onError: (error) => {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.error?.message || 'Failed to sync asset');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    if (!formData.name || !formData.category || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('type', formData.type);
    data.append('category', formData.category);
    data.append('subcategory', formData.subcategory);
    data.append('tags', formData.tags.join(','));
    data.append('price', formData.price);
    data.append('currency', formData.currency);
    data.append('creditsPrice', formData.creditsPrice);
    data.append('isAdultContent', String(formData.isAdultContent));
    
    files.forEach(file => {
      data.append('files', file);
    });

    uploadMutation.mutate(data);
  };

  const handleSyncToIMVU = (assetId: string) => {
    if (confirm('Sync this asset to IMVU marketplace?')) {
      syncMutation.mutate(assetId);
    }
  };

  const allowedRoles = ['seller', 'creator', 'admin', 'super_admin'];
  if (!user || !allowedRoles.includes(user.activeRole)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only sellers and creators can upload assets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Asset Upload</h1>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload New Asset</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Files *
              </label>
              <input
                type="file"
                multiple
                accept="image/*,.mesh,.texture,.animation"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {files.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {files.length} file(s) selected
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="Enter asset name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="Describe your asset"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                {ASSET_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <input
                type="text"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="Enter subcategory"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="Add tags (press Enter)"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                >
                  <option value="credits">Credits</option>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Credits Price */}
            {formData.currency !== 'credits' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credits Price (optional)
                </label>
                <input
                  type="number"
                  name="creditsPrice"
                  value={formData.creditsPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="0"
                />
              </div>
            )}

            {/* Adult Content */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isAdultContent"
                id="isAdultContent"
                checked={formData.isAdultContent}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isAdultContent" className="ml-2 block text-sm text-gray-700">
                This asset contains adult content
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploadMutation.isPending}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Asset'}
              </button>
            </div>
          </form>
        </div>

        {/* My Assets */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Assets</h2>
          
          {isLoadingAssets ? (
            <p className="text-gray-600">Loading assets...</p>
          ) : assetsData?.assets?.length === 0 ? (
            <p className="text-gray-600">No assets uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {assetsData?.assets?.map((asset: Asset) => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                      <p className="text-sm text-gray-600">{asset.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>{asset.type}</span>
                        <span>{asset.category}</span>
                        <span>{asset.price} {asset.currency}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          asset.imvuStatus === 'synced' ? 'bg-green-100 text-green-800' :
                          asset.imvuStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.imvuStatus}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {asset.imvuStatus !== 'synced' && (
                        <button
                          onClick={() => asset.assetId && handleSyncToIMVU(asset.assetId)}
                          disabled={syncMutation.isPending}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Sync to IMVU
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
