import { z } from 'zod';
export const authSchema=z.object({email:z.string().email('Enter a valid email address'),password:z.string().min(8,'Password must be at least 8 characters'),name:z.string().optional()});
export const licenseSchema=z.object({amount:z.coerce.number().int().min(1).max(100),level:z.string(),mask:z.string().min(6).refine(v=>v.includes('*'),'Include * for random characters'),lower:z.boolean(),upper:z.boolean(),productId:z.string().min(1),note:z.string(),days:z.coerce.number().int().min(1).max(3650)});
export const profileSchema=z.object({name:z.string().min(2,'Name must be at least two characters')});
export const feedbackSchema = z.object({
  type: z.enum(['product', 'experience', 'support']),
  title: z.string().trim().max(25, 'Use no more than 25 characters'),
  productId: z.string().uuid('Choose a valid product').or(z.literal('')),
}).superRefine((value, context) => {
  if (value.type === 'product' && !value.productId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['productId'], message: 'Choose the product you are reviewing' });
  }
});
export const productSchema=z.object({name:z.string().min(2),description:z.string().min(10),image:z.string().url(),category:z.string(),planName:z.string().min(2),days:z.coerce.number().int().positive(),price:z.coerce.number().positive()});
export const fileSchema=z.object({name:z.string().min(2),productId:z.string().min(1),image:z.string().url(),url:z.string().url().refine(v=>v.startsWith('https://'),'Use an HTTPS download URL'),type:z.enum(['product','setup'])});
export const paymentSchema=z.object({paypalName:z.string(),paypalUrl:z.string().url().or(z.literal('')),cashappName:z.string(),cashappUrl:z.string().url().or(z.literal(''))});
