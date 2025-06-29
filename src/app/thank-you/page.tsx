import { Suspense } from 'react'
import Link from 'next/link'
import ThankYouContent from './ThankYouContent'

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Thank You for Visiting!
            </h1>
            <p className="text-lg text-gray-600">
              We&apos;re delighted you could join us today. Your check-in was successful!
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Suspense fallback={<div>Loading...</div>}>
              <ThankYouContent />
            </Suspense>
          </div>
          
          <div className="text-center mt-8">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ← Back to Check-In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
