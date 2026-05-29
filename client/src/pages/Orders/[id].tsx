import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

const TIMELINE_STATES = ['pending', 'escrow_locked', 'in_progress', 'delivered', 'completed'];
const TIMELINE_LABELS = ['Pending', 'Escrow Locked', 'In Progress', 'Delivered', 'Completed'];

export default function EscrowTrackingView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s: any) => s.user);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-details', id],
    queryFn: async () => {
      // The API naturally populates gigId based on standard Mongoose setups
      const response = await api.get(`/api/orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await api.patch(`/api/orders/${id}/status`, { status: newStatus });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-details', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-t-2 border-blue-500 animate-spin mb-4" />
          <p className="text-blue-400 font-medium">Securing Escrow Block...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-lg">
          <h2 className="text-xl text-white font-bold mb-2">Order Not Found</h2>
          <p className="text-slate-400">The requested escrow block does not exist.</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = TIMELINE_STATES.indexOf(order.status);
  
  // Strict Role Checking based on Clerk IDs mapped to MongoDB
  const isCreator = user?.clerkId === order.creatorId || user?.id === order.creatorId;
  const isBuyer = user?.clerkId === order.buyerId || user?.id === order.buyerId;

  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-24 text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Block */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Escrow Order Tracking
              </h1>
              <p className="text-slate-400 mt-2 font-mono">{order.orderNumber || id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 uppercase tracking-wider">Total Value</p>
              <p className="text-2xl font-bold text-white">₹{order.financials?.price || 0}</p>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-6">
            <img 
              src={order.gigId?.thumbnail || 'https://images.unsplash.com/photo-1618365908648-e71bd5716cba?q=80&w=200&auto=format&fit=crop'} 
              className="w-24 h-24 rounded-xl object-cover border border-white/10"
              alt="Gig Thumbnail"
            />
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{order.gigId?.title || 'Premium Metaverse Asset'}</h3>
              <p className="text-emerald-400 text-sm">Target Delivery: {order.deliveryTimeDays || 3} Days</p>
            </div>
          </div>
        </div>

        {/* Horizontal Timeline Matrix */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-xl p-8 rounded-3xl overflow-hidden relative">
          <h2 className="text-lg font-bold text-white mb-10 uppercase tracking-widest text-center">Lifecycle Status</h2>
          
          <div className="relative flex justify-between items-center z-10 px-4 md:px-12">
            {/* Background Line */}
            <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-zinc-800 -z-10 -translate-y-1/2" />
            
            {TIMELINE_LABELS.map((label, index) => {
              const isProcessed = index < currentStatusIndex;
              const isActive = index === currentStatusIndex;

              let nodeClasses = '';
              let iconContent = '';

              if (isProcessed) {
                nodeClasses = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                iconContent = '✓';
              } else if (isActive) {
                nodeClasses = 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.4)]';
                iconContent = '●';
              } else {
                nodeClasses = 'bg-zinc-800 text-zinc-500 border border-zinc-700/50';
                iconContent = '○';
              }

              return (
                <div key={label} className="flex flex-col items-center relative gap-3 bg-slate-950 p-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg backdrop-blur-sm transition-all duration-500 ${nodeClasses}`}>
                    {iconContent}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider absolute top-14 whitespace-nowrap ${
                    isActive ? 'text-blue-400' : isProcessed ? 'text-emerald-500' : 'text-zinc-600'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-10" /> {/* Spacer for labels */}
        </div>

        {/* Secure Role-Based Action Matrix */}
        {(isCreator || isBuyer) && (
          <div className="bg-black/40 border border-white/10 backdrop-blur-xl p-8 rounded-3xl text-center">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Operations Terminal</h3>
            
            <div className="flex justify-center">
              {isCreator && order.status === 'in_progress' && (
                <button 
                  onClick={() => updateStatusMutation.mutate('delivered')}
                  disabled={updateStatusMutation.isPending}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100"
                >
                  {updateStatusMutation.isPending ? 'Processing...' : 'Mark as Delivered'}
                </button>
              )}

              {isBuyer && order.status === 'delivered' && (
                <button 
                  onClick={() => updateStatusMutation.mutate('completed')}
                  disabled={updateStatusMutation.isPending}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100"
                >
                  {updateStatusMutation.isPending ? 'Releasing Funds...' : 'Release Funds from Escrow'}
                </button>
              )}

              {((isCreator && order.status !== 'in_progress') || (isBuyer && order.status !== 'delivered')) && (
                <p className="text-slate-500 italic">No operational actions available at this phase.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
