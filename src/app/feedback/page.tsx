import { Suspense } from 'react'
import FeedbackForm from './FeedbackForm'

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              We Value Your Feedback
            </h1>
            <p className="text-lg text-gray-600">
              Please share your thoughts about the property. Your feedback helps us improve our service.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Suspense fallback={<div>Loading...</div>}>
              <FeedbackForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
