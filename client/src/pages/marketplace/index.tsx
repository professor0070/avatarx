import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { GlassmorphismCard } from '../../components/GlassmorphismCard';

const CATEGORY_NODES = ['All', '3D Models', 'Custom Rooms', 'Outfits', 'Animations'];

export default function MarketplaceExplorer() {
  const [activeCategory, setActiveCategory] = useState('All');
  const navigate = useNavigate();

  const { data: gigsData, isLoading } = useQuery({
    queryKey: ['marketplace-gigs', activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory !== 'All') {
        params.set('category', activeCategory);
      }
      const response = await api.get(`/api/gigs/explore?${params.toString()}`);
      return response.data;
    },
  });

  const displayGigs = useMemo(() => {
    return gigsData?.gigs || [];
  }, [gigsData]);

  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-24 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Dynamic Filter Matrix */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Marketplace Explorer
          </h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            {CATEGORY_NODES.map((node) => (
              <button
                key={node}
                onClick={() => setActiveCategory(node)}
                className={`px-6 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 font-medium ${
                  activeCategory === node
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {node}
              </button>
            ))}
          </div>
        </div>

        {/* Listing Render Block */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i} 
                className="h-[380px] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg animate-pulse p-4 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Shimmering highlight layer */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" />
                
                <div className="h-48 rounded-xl bg-white/10 w-full" />
                <div className="h-6 rounded bg-white/10 w-3/4" />
                <div className="h-4 rounded bg-white/10 w-1/2" />
                <div className="flex-1" />
                <div className="flex justify-between items-end">
                  <div className="h-6 rounded bg-white/10 w-1/4" />
                  <div className="h-10 rounded-lg bg-white/10 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayGigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-white/5 bg-white/[0.02] rounded-3xl backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No active metaverse agreements found.</h3>
            <p className="text-slate-500">Try adjusting your filters or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayGigs.map((gig: any) => (
              <GlassmorphismCard 
                key={gig._id || gig.id} 
                className="group flex flex-col h-[380px] overflow-hidden hover:scale-[1.02] transition-transform duration-500 cursor-pointer border-white/10 hover:border-blue-500/30 bg-black/40"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img 
                    src={gig?.thumbnail || 'https://images.unsplash.com/photo-1618365908648-e71bd5716cba?q=80&w=800&auto=format&fit=crop'} 
                    alt={gig?.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                </div>
                
                <div className="p-5 flex flex-col flex-1 relative z-10">
                  <h3 className="font-semibold text-lg text-white mb-1 line-clamp-1">{gig?.title}</h3>
                  <p className="text-sm text-emerald-400 font-medium mb-auto">
                    {gig?.creatorId?.username || gig?.sellerDisplayName || 'Premium Creator'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Starting At</span>
                      <span className="font-bold text-xl text-white">
                        ₹{gig?.price || gig?.tiers?.[0]?.price || 0}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => navigate(`/checkout?gigId=${gig._id || gig.id}`)}
                      className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    >
                      Hire
                    </button>
                  </div>
                </div>
              </GlassmorphismCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
