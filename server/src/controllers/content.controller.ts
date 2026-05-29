import type { Request, Response } from 'express';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  testimonial: string;
  date: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Game Credits Buyer',
    avatar: '/default-avatar.png',
    rating: 5,
    testimonial: 'AvatarX made it so easy to find talented metaverse creators. The escrow payment system gave me confidence, and the delivery was exactly what I wanted!',
    date: '2024-01-15',
  },
  {
    id: '2',
    name: 'Mike Chen',
    role: 'Room Designer',
    avatar: '/default-avatar.png',
    rating: 5,
    testimonial: 'As a freelancer on AvatarX, I love the platform. The dashboard helps me manage orders efficiently, and the payment system is reliable.',
    date: '2024-02-20',
  },
  {
    id: '3',
    name: 'Emma Williams',
    role: 'Virtual Photographer',
    avatar: '/default-avatar.png',
    rating: 4,
    testimonial: 'Great platform for connecting with premium virtual talent. The search filters made it easy to find the perfect photographer for my project.',
    date: '2024-03-10',
  },
];

export async function getTestimonialsHandler(req: Request, res: Response) {
  try {
    res.json({
      ok: true,
      testimonials,
    });
  } catch (error) {
    console.error('[avatarx-server] getTestimonials error:', error);
    res.status(500).json({
      ok: false,
      error: { message: 'Internal server error' },
    });
  }
}
