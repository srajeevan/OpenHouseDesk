import { Suspense } from 'react'
import PropertyFeedbackForm from './PropertyFeedbackForm'

interface PropertyFeedbackPageProps {
  params: {
    propertyId: string
  }
}

export default function PropertyFeedbackPage({ params }: PropertyFeedbackPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Share Your Feedback
          </h1>
          <p className="text-gray-600">
            We'd love to hear about your visit
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          }>
            <PropertyFeedbackForm propertyId={params.propertyId} />
          </Suspense>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your feedback helps us improve our service and properties.
          </p>
        </div>
      </div>
    </div>
  )
}
