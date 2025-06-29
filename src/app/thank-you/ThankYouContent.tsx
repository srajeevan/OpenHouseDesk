'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ThankYouContent() {
  const searchParams = useSearchParams()
  const visitorId = searchParams.get('visitor')

  return (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          What's Next?
        </h2>
        <div className="space-y-4 text-gray-600">
          <p>
            Feel free to explore the property and ask any questions you might have.
            Our team is here to help!
          </p>
          <p>
            We&apos;d love to hear your thoughts about the property. Your feedback helps us
            serve you better.
          </p>
        </div>
      </div>

      {visitorId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            Share Your Feedback
          </h3>
          <p className="text-blue-700 mb-4">
            Before you leave, we&apos;d appreciate if you could take a moment to share
            your thoughts about the property.
          </p>
          <Link
            href={`/feedback?visitor=${visitorId}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Leave Feedback
          </Link>
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Contact Information
        </h3>
        <div className="text-gray-600 space-y-2">
          <p>
            <strong>Questions?</strong> Feel free to ask any of our team members
          </p>
          <p>
            <strong>Follow-up:</strong> We&apos;ll be in touch within 24-48 hours
          </p>
        </div>
      </div>
    </div>
  )
}
