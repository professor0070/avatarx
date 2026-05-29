import mongoose, { Document, Schema } from 'mongoose';

export type ProductCategory = 'credits' | 'outfits' | 'accounts' | 'services';
export type ProductStatus = 'available' | 'sold' | 'hidden';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
  creditAmount: number;
  images: string[];
  status: ProductStatus;
  creator: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['credits', 'outfits', 'accounts', 'services'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    creditAmount: {
      type: Number,
      required: function (this: IProduct) {
        return this.category === 'credits';
      },
    },
    images: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ['available', 'sold', 'hidden'],
      default: 'available',
    },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ creator: 1 });
productSchema.index({ price: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
