import CheckInForm from '@/components/CheckInForm'
import Link from 'next/link'

export default function CheckInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Our Open House
            </h1>
            <p className="text-lg text-gray-600">
              Please sign in to let us know you&apos;re here. We&apos;re excited to show you around!
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckInForm />
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Your information will be kept confidential and used only for follow-up purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
