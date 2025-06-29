'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useSearchParams, useRouter } from 'next/navigation'
import { feedbackSchema, type FeedbackFormData } from '@/lib/validations'
import { createClientComponentClient } from '@/lib/supabase'

export default function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const visitorId = searchParams.get('visitor')
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      interested: false,
    },
  })

  const watchedRating = watch('rating')

  if (!visitorId) {
    return (
      <div className="text-center">
        <p className="text-red-600">Invalid feedback link. Please check in first.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Check-In
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center space-y-4">
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
        <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
        <p className="text-gray-600">
          Your feedback has been submitted successfully. We appreciate your time!
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    )
  }

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            visitor_id: visitorId,
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

      if (error) {
        throw error
      }

      toast.success('Thank you for your feedback!')
      setSubmitted(true)
    } catch (error: any) {
      console.error('Error submitting feedback:', error)
      toast.error(error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`w-8 h-8 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
          >
            <svg
              className="w-full h-full"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          1. How would you rate the home overall? *
        </label>
        <StarRating
          rating={watchedRating}
          onRatingChange={(rating) => {
            setValue('rating', rating)
          }}
        />
        <input
          type="hidden"
          {...register('rating', { valueAsNumber: true })}
        />
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
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Comments
        </label>
        <textarea
          {...register('comments')}
          id="comments"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
          placeholder="Any additional thoughts or comments..."
        />
        {errors.comments && (
          <p className="mt-1 text-sm text-red-600">{errors.comments.message}</p>
        )}
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
    </form>
  )
}
