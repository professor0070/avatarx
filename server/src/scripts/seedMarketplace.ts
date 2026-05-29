import dns from 'node:dns';

// Force IPv4 DNS resolution for Node 24 (CRITICAL: must be before other imports)
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';
import { Gig } from '../models/gig.model';
import { Order } from '../models/order.model';

import path from 'path';

// Try to load .env from server dir, then from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/avatarx';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const runSeed = async () => {
  try {
    await connectDB();

    console.log('Wiping existing data for Users, Gigs, and Orders...');
    await User.deleteMany({});
    await Gig.deleteMany({});
    await Order.deleteMany({});
    console.log('Successfully eliminated existing collections.');

    console.log('Generating 5 mock Clerk user profiles...');
    // Generate 5 mock Clerk user profiles (2 buyers, 3 creators)
    const usersData = [
      {
        username: 'buyer_one',
        email: 'buyer1@avatarx.com',
        clerkId: 'user_mock_buyer1',
        role: 'buyer',
        displayName: 'Buyer One',
        imvuUsername: 'buyer_one_imvu',
        isEmailVerified: true,
        isProfileVerified: true,
        verificationStatus: 'approved',
        sellerLevel: 'new',
        avatar: 'https://ui-avatars.com/api/?name=Buyer+One',
        bio: 'Avid metaverse buyer.',
        skills: [],
        languages: ['English'],
        certifications: [],
        portfolio: [],
        hasAcceptedCreatorPolicy: true
      },
      {
        username: 'buyer_two',
        email: 'buyer2@avatarx.com',
        clerkId: 'user_mock_buyer2',
        role: 'buyer',
        displayName: 'Buyer Two',
        imvuUsername: 'buyer_two_imvu',
        isEmailVerified: true,
        isProfileVerified: true,
        verificationStatus: 'approved',
        sellerLevel: 'new',
        avatar: 'https://ui-avatars.com/api/?name=Buyer+Two',
        bio: 'Metaverse enthusiast and trader.',
        skills: [],
        languages: ['English'],
        certifications: [],
        portfolio: [],
        hasAcceptedCreatorPolicy: true
      },
      {
        username: 'creator_one',
        email: 'creator1@avatarx.com',
        clerkId: 'user_mock_creator1',
        role: 'creator',
        displayName: 'Creator Alpha',
        imvuUsername: 'creator_alpha_imvu',
        isEmailVerified: true,
        isProfileVerified: true,
        verificationStatus: 'approved',
        sellerLevel: 'level1',
        avatar: 'https://ui-avatars.com/api/?name=Creator+Alpha',
        bio: '3D Modeler and Avatar Customizer.',
        skills: ['3D Modeling', 'Blender', 'Photoshop'],
        languages: ['English', 'Spanish'],
        certifications: [],
        portfolio: [],
        hasAcceptedCreatorPolicy: true
      },
      {
        username: 'creator_two',
        email: 'creator2@avatarx.com',
        clerkId: 'user_mock_creator2',
        role: 'creator',
        displayName: 'Creator Beta',
        imvuUsername: 'creator_beta_imvu',
        isEmailVerified: true,
        isProfileVerified: true,
        verificationStatus: 'approved',
        sellerLevel: 'level2',
        avatar: 'https://ui-avatars.com/api/?name=Creator+Beta',
        bio: 'Room Decoration Expert and Texture Artist.',
        skills: ['Unity', 'Interior Design'],
        languages: ['English'],
        certifications: [],
        portfolio: [],
        hasAcceptedCreatorPolicy: true
      },
      {
        username: 'creator_three',
        email: 'creator3@avatarx.com',
        clerkId: 'user_mock_creator3',
        role: 'creator',
        displayName: 'Creator Gamma',
        imvuUsername: 'creator_gamma_imvu',
        isEmailVerified: true,
        isProfileVerified: true,
        verificationStatus: 'approved',
        sellerLevel: 'top_rated',
        avatar: 'https://ui-avatars.com/api/?name=Creator+Gamma',
        bio: 'Full scale custom avatar creator.',
        skills: ['3D Modeling', 'Animation'],
        languages: ['English', 'French'],
        certifications: [],
        portfolio: [],
        hasAcceptedCreatorPolicy: true
      }
    ];

    const insertedUsers = await User.insertMany(usersData);
    const creators = insertedUsers.filter((u: any) => u.role === 'creator');
    const buyers = insertedUsers.filter((u: any) => u.role === 'buyer');
    console.log(`Successfully generated ${insertedUsers.length} mock users.`);

    console.log('Generating 10 standard Gig marketplace documents...');
    const gigCategories = ['Room Decoration', 'Outfits Male', 'Outfits Female', 'Custom Services'];
    const gigsData = Array.from({ length: 10 }).map((_, i) => {
      const creator = creators[i % creators.length] as any;
      const category = gigCategories[i % gigCategories.length];
      return {
        sellerId: creator._id,
        sellerDisplayName: creator.displayName,
        title: `Premium ${category} Service ${i + 1}`,
        slug: `premium-${category.toLowerCase().replace(/ /g, '-')}-service-${i + 1}`,
        description: `High-quality delivery for your metaverse needs in ${category}. Detailed and reliable service.`,
        category: category,
        type: i % 2 === 0 ? 'product' : 'service',
        tags: ['premium', 'metaverse', 'design', 'custom'],
        thumbnail: 'https://images.unsplash.com/photo-1618365908648-e71bd5716cba?q=80&w=800&auto=format&fit=crop',
        gallery: [
          { url: 'https://images.unsplash.com/photo-1618365908648-e71bd5716cba?q=80&w=800&auto=format&fit=crop', type: 'image', order: 1 },
          { url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800&auto=format&fit=crop', type: 'image', order: 2 }
        ],
        tiers: [
          {
            name: 'Basic',
            description: 'Standard delivery with minimal revisions',
            price: 1500 + i * 500,
            currency: 'INR',
            deliveryTimeDays: 3,
            revisions: 1,
            features: ['Base model', 'Standard textures']
          }
        ],
        deliveryType: 'manual',
        status: 'active',
        isApproved: true,
        stats: {
          totalOrders: 0,
          ordersInProgress: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          rating: 5,
          reviewsCount: Math.floor(Math.random() * 50),
          averageResponseTime: 60,
          views: Math.floor(Math.random() * 1000),
          likes: Math.floor(Math.random() * 100)
        }
      };
    });

    const insertedGigs = await Gig.insertMany(gigsData);
    console.log(`Successfully generated ${insertedGigs.length} mock gigs.`);

    console.log('Generating 5 distinct transaction Order logs...');
    
    // Status sequence required: 1 Pending, 1 Escrow_Locked, 2 In_Progress, 1 Delivered
    const orderStatuses = ['pending', 'escrow_locked', 'in_progress', 'in_progress', 'delivered'];
    
    const ordersData = orderStatuses.map((status, i) => {
      const gig = insertedGigs[i % insertedGigs.length] as any;
      const buyer = buyers[i % buyers.length] as any;
      
      const price = gig.tiers[0].price;
      const commission = price * 0.2;
      const netCreatorPayout = price * 0.8;

      return {
        orderNumber: `ORD-MOCK-${1000 + i}`,
        gigId: gig._id,
        buyerId: buyer.clerkId || buyer._id.toString(),
        creatorId: gig.sellerId,
        sellerId: gig.sellerId,
        type: 'standard',
        tierName: 'Basic',
        extras: [],
        financials: {
          price,
          commission,
          netCreatorPayout
        },
        deliveryType: gig.deliveryType,
        deliveryTimeDays: gig.tiers[0].deliveryTimeDays,
        requirements: {
          enabled: false,
          questions: [],
          answers: []
        },
        status: status,
        paymentStatus: status === 'pending' ? 'pending' : 'completed',
        payment: {
          method: 'wallet'
        },
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(),
            updatedBy: buyer._id
          }
        ],
        revisions: {
          allowed: gig.tiers[0].revisions,
          used: 0,
          history: []
        },
        deliveryFiles: []
      };
    });

    const insertedOrders = await Order.insertMany(ordersData);
    console.log(`Successfully generated ${insertedOrders.length} mock orders.`);
    
    console.log("✔ Successfully wiped and populated all database vectors.");
  } catch (error) {
    console.error("Database Automation Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection strictly terminated.");
  }
};

runSeed();
