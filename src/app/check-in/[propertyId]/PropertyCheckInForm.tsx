'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { visitorSchema, type VisitorFormData } from '@/lib/validations'
import { createClientComponentClient } from '@/lib/supabase'

interface Property {
  id: string
  name: string
  address: string
  description?: string
}

interface PropertyCheckInFormProps {
  propertyId: string
}

export default function PropertyCheckInForm({ propertyId }: PropertyCheckInFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
  })

  const howDidYouHear = watch('how_did_you_hear')

  useEffect(() => {
    fetchProperty()
  }, [propertyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, description')
        .eq('id', propertyId)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Property not found or not available for check-in')
          router.push('/')
          return
        }
        throw error
      }

      setProperty(data)
    } catch (error) {
      console.error('Error fetching property:', error)
      toast.error('Failed to load property information')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: VisitorFormData) => {
    if (!property) return

    setIsSubmitting(true)
    
    try {
      const { data: visitorData, error } = await supabase
        .from('visitors')
        .insert([
          {
            name: data.name,
            email: data.email,
            phone: data.phone,
            property_id: property.id,
            visit_date: new Date().toISOString(),
            home_buying_status: data.home_buying_status,
            looking_to_buy_within: data.looking_to_buy_within,
            budget_range: data.budget_range,
            financing_status: data.financing_status,
            how_did_you_hear: data.how_did_you_hear,
            how_did_you_hear_other: data.how_did_you_hear_other || null,
          },
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      toast.success('Check-in successful! Welcome to our open house.')
      
      // Redirect to thank you page with visitor and property info
      router.push(`/thank-you?visitor=${visitorData.id}&property=${property.id}&token=${visitorData.feedback_token}`)
    } catch (error: unknown) {
      console.error('Error during check-in:', error)
      const errorMessage = error instanceof Error ? error.message : 'Check-in failed. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Property not found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Property Information */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">{property.name}</h2>
        <p className="text-blue-700 text-sm mb-1">{property.address}</p>
        {property.description && (
          <p className="text-blue-600 text-sm">{property.description}</p>
        )}
      </div>

      {/* Check-in Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            1. Basic Information
          </h3>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Enter your phone number"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        {/* Home Buying Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            2. Home Buying Status
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are you: *
            </label>
            <div className="space-y-2">
              {[
                { value: 'just_browsing', label: 'Just browsing' },
                { value: 'actively_looking', label: 'Actively looking to buy' },
                { value: 'working_with_realtor', label: 'Working with a realtor' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    {...register('home_buying_status')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.home_buying_status && (
              <p className="mt-1 text-sm text-red-600">{errors.home_buying_status.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Looking to buy within: *
            </label>
            <div className="space-y-2">
              {[
                { value: '0-3_months', label: '0–3 months' },
                { value: '3-6_months', label: '3–6 months' },
                { value: '6+_months', label: '6+ months' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    {...register('looking_to_buy_within')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.looking_to_buy_within && (
              <p className="mt-1 text-sm text-red-600">{errors.looking_to_buy_within.message}</p>
            )}
          </div>
        </div>

        {/* Budget Range */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            3. Budget Range
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What is your budget range? *
            </label>
            <div className="space-y-2">
              {[
                { value: 'under_250k', label: 'Under $250,000' },
                { value: '250k-400k', label: '$250,000–$400,000' },
                { value: '400k-600k', label: '$400,000–$600,000' },
                { value: '600k+', label: '$600,000+' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    {...register('budget_range')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.budget_range && (
              <p className="mt-1 text-sm text-red-600">{errors.budget_range.message}</p>
            )}
          </div>
        </div>

        {/* Financing Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            4. Financing Status
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are you pre-approved for a mortgage? *
            </label>
            <div className="space-y-2">
              {[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'planning_to', label: 'Not yet, but planning to' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    {...register('financing_status')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.financing_status && (
              <p className="mt-1 text-sm text-red-600">{errors.financing_status.message}</p>
            )}
          </div>
        </div>

        {/* How did you hear */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            5. How did you hear about this open house?
          </h3>
          
          <div>
            <div className="space-y-2">
              {[
                { value: 'zillow_redfin', label: 'Zillow / Redfin' },
                { value: 'realtor_com', label: 'Realtor.com' },
                { value: 'social_media', label: 'Social Media' },
                { value: 'flyer_yard_sign', label: 'Flyer / Yard Sign' },
                { value: 'referred', label: 'Referred by someone' },
                { value: 'other', label: 'Other (please specify)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    {...register('how_did_you_hear')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.how_did_you_hear && (
              <p className="mt-1 text-sm text-red-600">{errors.how_did_you_hear.message}</p>
            )}
          </div>

          {howDidYouHear === 'other' && (
            <div>
              <label htmlFor="how_did_you_hear_other" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify:
              </label>
              <input
                {...register('how_did_you_hear_other')}
                type="text"
                id="how_did_you_hear_other"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Please specify how you heard about this open house"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking In...
            </div>
          ) : (
            'Complete Check-In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By checking in, you agree to receive follow-up communications about this property.
          Your information is secure and will only be used for this open house visit.
        </p>
      </div>
    </div>
  )
}
