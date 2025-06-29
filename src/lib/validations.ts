import { z } from 'zod'

// Enhanced visitor check-in form validation
export const visitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number'),
  home_buying_status: z.string().min(1, 'Please select your home buying status'),
  looking_to_buy_within: z.string().min(1, 'Please select your timeframe'),
  budget_range: z.string().min(1, 'Please select your budget range'),
  financing_status: z.string().min(1, 'Please select your financing status'),
  how_did_you_hear: z.string().min(1, 'Please tell us how you heard about this open house'),
  how_did_you_hear_other: z.string().optional(),
})

export type VisitorFormData = z.infer<typeof visitorSchema>

// Enhanced feedback form validation
export const feedbackSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5, 'Rating must be between 1 and 5'),
  comments: z.string().optional(),
  interested: z.boolean().optional().default(false),
  liked_most: z.string().optional(),
  liked_least: z.string().optional(),
  comparison_to_others: z.string().min(1, 'Please select how this home compares'),
  meets_needs: z.string().min(1, 'Please select if this home meets your needs'),
  would_make_offer: z.string().min(1, 'Please indicate if you would consider making an offer'),
  perceived_value: z.string().optional(),
  follow_up_preference: z.string().min(1, 'Please select your follow-up preference'),
})

export type FeedbackFormData = z.infer<typeof feedbackSchema>

// Admin login validation
export const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const adminSignUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type AdminLoginData = z.infer<typeof adminLoginSchema>
export type AdminSignUpData = z.infer<typeof adminSignUpSchema>

// Follow-up form validation
export const followupSchema = z.object({
  notes: z.string().optional(),
})

export type FollowupFormData = z.infer<typeof followupSchema>

// Property form validation
export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().optional(),
  property_type: z.string().min(1, 'Property type is required'),
  bedrooms: z.number().min(0, 'Bedrooms must be 0 or more').optional(),
  bathrooms: z.number().min(0, 'Bathrooms must be 0 or more').optional(),
  square_feet: z.number().min(0, 'Square feet must be 0 or more').optional(),
  price: z.number().min(0, 'Price must be 0 or more').optional(),
  status: z.enum(['active', 'inactive', 'sold']),
})

export type PropertyFormData = z.infer<typeof propertySchema>
