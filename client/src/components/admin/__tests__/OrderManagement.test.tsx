import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminOrderManagement } from '../OrderManagement';

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

import { api } from '../../../lib/api';

const mockOrders = [
  {
    id: 'order-1',
    orderNumber: 'ORD-001',
    gigId: {
      _id: 'gig-1',
      title: 'Custom Avatar Design',
      thumbnail: '/thumb1.png',
      category: '3D Modeling',
    },
    buyerId: {
      _id: 'buyer-1',
      displayName: 'John Buyer',
      avatar: 'https://example.com/buyer.png',
    },
    sellerId: {
      _id: 'seller-1',
      displayName: 'Jane Seller',
      avatar: 'https://example.com/seller.png',
    },
    totalPrice: 150,
    currency: 'USD',
    status: 'in_progress',
    paymentStatus: 'paid',
    createdAt: '2026-05-01T12:00:00.000Z',
    deliveryTimeDays: 7,
    dispute: { isDisputed: false },
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-002',
    gigId: {
      _id: 'gig-2',
      title: 'Animation Pack',
      thumbnail: '/thumb2.png',
      category: 'Animation',
    },
    buyerId: {
      _id: 'buyer-2',
      displayName: 'Alice Buyer',
    },
    sellerId: {
      _id: 'seller-2',
      displayName: 'Bob Seller',
    },
    totalPrice: 300,
    currency: 'USD',
    status: 'delivered',
    paymentStatus: 'paid',
    createdAt: '2026-05-02T12:00:00.000Z',
    deliveryTimeDays: 14,
    dispute: { isDisputed: true, status: 'open' },
  },
  {
    id: 'order-3',
    orderNumber: 'ORD-003',
    gigId: {
      _id: 'gig-3',
      title: 'Environment Design',
      thumbnail: '/thumb3.png',
      category: 'Environment',
    },
    buyerId: {
      _id: 'buyer-3',
      displayName: 'Charlie Buyer',
    },
    sellerId: {
      _id: 'seller-3',
      displayName: 'Diana Seller',
    },
    totalPrice: 500,
    currency: 'USD',
    status: 'payment_pending',
    paymentStatus: 'pending',
    createdAt: '2026-05-03T12:00:00.000Z',
    deliveryTimeDays: 10,
    dispute: { isDisputed: false },
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderOrders(queryClient?: QueryClient) {
  const qc = queryClient ?? createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AdminOrderManagement />
    </QueryClientProvider>
  );
}

describe('AdminOrderManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      data: { orders: mockOrders, pagination: { total: 3, page: 1, pages: 1 } },
    });
  });

  it('should show loading state initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderOrders();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render orders in the table', async () => {
    renderOrders();
    expect(await screen.findByText(/ORD-001/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-002/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-003/)).toBeInTheDocument();
    expect(screen.getByText('Custom Avatar Design')).toBeInTheDocument();
    expect(screen.getByText('John Buyer')).toBeInTheDocument();
    expect(screen.getByText('Jane Seller')).toBeInTheDocument();
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/USD/).length).toBeGreaterThan(0);
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('3 orders total')).toBeInTheDocument();
  });

  it('should show empty state', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { orders: [], pagination: { total: 0, page: 1, pages: 0 } },
    });
    renderOrders();
    expect(await screen.findByText('No orders found')).toBeInTheDocument();
  });

  it('should filter orders by status', async () => {
    renderOrders();
    const deliveredBtn = await screen.findByText('Delivered');
    fireEvent.click(deliveredBtn);
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('status=delivered'));
    });
  });

  it('should filter orders by search query', async () => {
    renderOrders();
    const searchInput = await screen.findByPlaceholderText('Search orders...');
    fireEvent.change(searchInput, { target: { value: 'ORD-001' } });
    await waitFor(() => {
      expect(screen.getByText(/ORD-001/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/ORD-002/)).not.toBeInTheDocument();
  });

  it('should open detail modal on View click', async () => {
    renderOrders();
    const viewButtons = await screen.findAllByText('View');
    fireEvent.click(viewButtons[0]);
    expect(screen.getByText(/Order #ORD-001/)).toBeInTheDocument();
    expect(screen.getAllByText('Custom Avatar Design').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('John Buyer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Jane Seller').length).toBeGreaterThanOrEqual(1);
  });

  it('should show dispute resolution for disputed orders', async () => {
    renderOrders();
    const viewButtons = await screen.findAllByText('View');
    fireEvent.click(viewButtons[1]);
    expect(screen.getByText('Open Dispute')).toBeInTheDocument();
    expect(screen.getByText('Refund Buyer')).toBeInTheDocument();
    expect(screen.getByText('Complete Order')).toBeInTheDocument();
  });

  it('should show Cancel button for pending payment orders', async () => {
    renderOrders();
    expect(await screen.findByText('Cancel')).toBeInTheDocument();
  });

  it('should show Complete button for delivered orders', async () => {
    renderOrders();
    expect(await screen.findByText('Complete')).toBeInTheDocument();
  });

  it('should call api.patch when completing an order', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ok: true } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderOrders();
    const completeBtn = await screen.findByText('Complete');
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/orders/order-2/status', {
        status: 'completed',
        comment: undefined,
      });
    });
  });

  it('should call api.patch when cancelling an order', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ok: true } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderOrders();
    const cancelBtn = await screen.findByText('Cancel');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/orders/order-3/status', {
        status: 'cancelled',
        comment: undefined,
      });
    });
  });

  it('should call api.post when resolving a dispute', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ok: true } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderOrders();
    const viewButtons = await screen.findAllByText('View');
    fireEvent.click(viewButtons[1]);

    const refundBtn = await screen.findByText('Refund Buyer');
    fireEvent.click(refundBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/orders/order-2/dispute/resolve', {
        orderId: 'order-2',
        resolution: 'Admin resolved in favor of buyer',
        action: 'refund_buyer',
      });
    });
  });

  it('should close modal when clicking the overlay', async () => {
    renderOrders();
    const viewButtons = await screen.findAllByText('View');
    fireEvent.click(viewButtons[0]);
    expect(await screen.findByText(/Order #ORD-001/)).toBeInTheDocument();
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    await waitFor(() => {
      expect(screen.queryByText(/Order #ORD-001/)).not.toBeInTheDocument();
    });
  });

  it('should display pagination when there are multiple pages', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        orders: mockOrders,
        pagination: { total: 50, page: 1, pages: 3 },
      },
    });
    renderOrders();
    expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
