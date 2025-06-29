'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { feedbackSchema, type FeedbackFormData } from '@/lib/validations'
import { createClientComponentClient } from '@/lib/supabase'

interface Property {
  id: string
  name: string
  address: string
}

interface TodaysVisitor {
  id: string
  name: string
  email: string
  phone: string
  feedback_token: string
  has_feedback: boolean
}

interface PropertyFeedbackFormProps {
  propertyId: string
}

export default function PropertyFeedbackForm({ propertyId }: PropertyFeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [property, setProperty] = useState<Property | null>(null)
  const [visitors, setVisitors] = useState<TodaysVisitor[]>([])
  const [selectedVisitor, setSelectedVisitor] = useState<TodaysVisitor | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'select' | 'feedback' | 'success'>('select')
  const router = useRouter()
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      interested: false,
      rating: 0,
    },
  })

  const rating = watch('rating')

  useEffect(() => {
    fetchPropertyAndVisitors()
  }, [propertyId])

  const fetchPropertyAndVisitors = async () => {
    try {
      // Fetch property info
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('id', propertyId)
        .single()

      if (propertyError) throw propertyError

      setProperty(propertyData)

      // Fetch today's visitors for this property
      const { data: visitorsData, error: visitorsError } = await supabase
        .rpc('get_todays_visitors_for_property', { property_uuid: propertyId })

      if (visitorsError) throw visitorsError

      setVisitors(visitorsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load feedback form')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleVisitorSelect = (visitor: TodaysVisitor) => {
    if (visitor.has_feedback) {
      toast.error('You have already submitted feedback for this visit.')
      return
    }
    setSelectedVisitor(visitor)
    setStep('feedback')
  }

  const onSubmit = async (data: FeedbackFormData) => {
    if (!selectedVisitor) return

    setIsSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            visitor_id: selectedVisitor.id,
            rating: data.rating,
            comments: data.comments || '',
            interested: data.interested || false,
            liked_most: data.liked_most || '',
            liked_least: data.liked_least || '',
            comparison_to_others: data.comparison_to_others,
            meets_needs: data.meets_needs,
            would_make_offer: data.would_make_offer,
            perceived_value: data.perceived_value || '',
            follow_up_preference: data.follow_up_preference,
          },
        ])

      if (error) throw error

      toast.success('Thank you for your feedback!')
      setStep('success')
      // Refresh visitors list to update feedback status
      fetchPropertyAndVisitors()
    } catch (error: any) {
      console.error('Error submitting feedback:', error)
      toast.error(error.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToFeedback = () => {
    setSelectedVisitor(null)
    setStep('select')
    // Reset form
    setValue('rating', 0)
    setValue('comments', '')
    setValue('interested', false)
    setValue('liked_most', '')
    setValue('liked_least', '')
    setValue('comparison_to_others', '')
    setValue('meets_needs', '')
    setValue('would_make_offer', '')
    setValue('perceived_value', '')
    setValue('follow_up_preference', '')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
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

  if (visitors.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No visitors today</h3>
        <p className="text-gray-600">No one has checked in for this property today.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Property Information */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h2 className="text-lg font-semibold text-green-900 mb-1">{property.name}</h2>
        <p className="text-green-700 text-sm">{property.address}</p>
      </div>

      {/* Step 1: Select Visitor */}
      {step === 'select' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Select your name from today's visitors:
          </h3>
          <div className="space-y-2">
            {visitors.map((visitor) => (
              <button
                key={visitor.id}
                onClick={() => handleVisitorSelect(visitor)}
                disabled={visitor.has_feedback}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  visitor.has_feedback
                    ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <div className="font-medium">{visitor.name}</div>
                <div className="text-sm text-gray-500">{visitor.email}</div>
                {visitor.has_feedback && (
                  <div className="text-xs text-gray-400 mt-1">Feedback already submitted</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Enhanced Feedback Form */}
      {step === 'feedback' && selectedVisitor && (
        <div>
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              Submitting feedback as: <strong>{selectedVisitor.name}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. How would you rate the home overall? *
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setValue('rating', star)}
                    className={`text-3xl transition-colors ${
                      rating >= star ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
              )}
            </div>

            {/* What did you like most */}
            <div>
              <label htmlFor="liked_most" className="block text-sm font-medium text-gray-700 mb-1">
                2. What did you like most about the property?
              </label>
              <textarea
                {...register('liked_most')}
                id="liked_most"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                placeholder="Tell us what you liked most about this property..."
              />
            </div>

            {/* What did you like least */}
            <div>
              <label htmlFor="liked_least" className="block text-sm font-medium text-gray-700 mb-1">
                3. What did you like least / what concerns do you have?
              </label>
              <textarea
                {...register('liked_least')}
                id="liked_least"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                placeholder="Tell us about any concerns or things you didn't like..."
              />
            </div>

            {/* Comparison to others */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4. How does this home compare to others you've seen? *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'much_better', label: 'Much better' },
                  { value: 'slightly_better', label: 'Slightly better' },
                  { value: 'about_same', label: 'About the same' },
                  { value: 'slightly_worse', label: 'Slightly worse' },
                  { value: 'much_worse', label: 'Much worse' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      {...register('comparison_to_others')}
                      type="radio"
                      value={option.value}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.comparison_to_others && (
                <p className="mt-1 text-sm text-red-600">{errors.comparison_to_others.message}</p>
              )}
            </div>

            {/* Meets needs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                5. Does this home meet your needs? *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'great_fit', label: 'Yes, it\'s a great fit' },
                  { value: 'mostly_fits', label: 'Mostly, but a few things are missing' },
                  { value: 'not_looking_for', label: 'No, not what I\'m looking for' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      {...register('meets_needs')}
                      type="radio"
                      value={option.value}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.meets_needs && (
                <p className="mt-1 text-sm text-red-600">{errors.meets_needs.message}</p>
              )}
            </div>

            {/* Would make offer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                6. Would you consider making an offer? *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'maybe', label: 'Maybe' },
                  { value: 'no', label: 'No' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      {...register('would_make_offer')}
                      type="radio"
                      value={option.value}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.would_make_offer && (
                <p className="mt-1 text-sm text-red-600">{errors.would_make_offer.message}</p>
              )}
            </div>

            {/* Perceived value */}
            <div>
              <label htmlFor="perceived_value" className="block text-sm font-medium text-gray-700 mb-1">
                7. What price do you feel this home is worth?
              </label>
              <input
                {...register('perceived_value')}
                type="text"
                id="perceived_value"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., $450,000"
              />
            </div>

            {/* Follow-up preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                8. Would you like to be contacted for a follow-up? *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'only_if_price_reduced', label: 'Only if price is reduced' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      {...register('follow_up_preference')}
                      type="radio"
                      value={option.value}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.follow_up_preference && (
                <p className="mt-1 text-sm text-red-600">{errors.follow_up_preference.message}</p>
              )}
            </div>

            {/* Additional Comments */}
            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Comments
              </label>
              <textarea
                {...register('comments')}
                id="comments"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                placeholder="Any additional thoughts or comments..."
              />
            </div>

            {/* Interested checkbox */}
            <div className="flex items-center">
              <input
                {...register('interested')}
                type="checkbox"
                id="interested"
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="interested" className="ml-2 block text-sm text-gray-700">
                I'm interested in this property
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </div>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Success Message */}
      {step === 'success' && selectedVisitor && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-1">
              Your feedback has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500">
              Feedback submitted by: <strong>{selectedVisitor.name}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleBackToFeedback}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Submit Another Feedback
            </button>
            
            <p className="text-sm text-gray-500">
              Other visitors can use this form to leave their feedback too!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
