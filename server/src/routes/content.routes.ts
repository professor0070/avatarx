import { Router } from 'express';
import { getTestimonialsHandler } from '../controllers/content.controller';

export const contentRouter = Router();

// Public routes
contentRouter.get('/testimonials', getTestimonialsHandler); // Get testimonials for homepage
