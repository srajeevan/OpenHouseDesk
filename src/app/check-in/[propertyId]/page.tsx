import { Suspense } from 'react'
import PropertyCheckInForm from './PropertyCheckInForm'

interface PropertyCheckInPageProps {
  params: {
    propertyId: string
  }
}

export default function PropertyCheckInPage({ params }: PropertyCheckInPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Our Open House
          </h1>
          <p className="text-gray-600">
            Please check in to get started
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            <PropertyCheckInForm propertyId={params.propertyId} />
          </Suspense>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your information is secure and will only be used for this open house visit.
          </p>
        </div>
      </div>
    </div>
  )
}
