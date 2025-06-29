'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { formatDateTime, downloadCSV } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { propertySchema, type PropertyFormData } from '@/lib/validations'
import QRCode from 'qrcode'
import FollowUpManagement from './FollowUpManagement'

interface Property {
  id: string
  name: string
  address: string
  description?: string
  property_type: string
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  price?: number
  status: string
  created_at: string
}

interface VisitorWithFeedback {
  id: string
  name: string
  email: string
  phone: string
  visit_date: string
  created_at: string
  property_id?: string
  property_name?: string
  property_address?: string
  rating?: number
  comments?: string
  interested?: boolean
  feedback_date?: string
}

export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<VisitorWithFeedback[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [showQRModal, setShowQRModal] = useState<Property | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'visitors' | 'properties' | 'followup'>('visitors')
  const [filters, setFilters] = useState({
    property: '',
    dateFrom: '',
    dateTo: '',
    interested: '',
    rating: ''
  })
  const [stats, setStats] = useState({
    totalVisitors: 0,
    withFeedback: 0,
    averageRating: 0,
    interestedCount: 0,
    totalProperties: 0
  })
  const router = useRouter()
  const supabase = createClientComponentClient()

  const propertyForm = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      property_type: 'house',
      status: 'active'
    }
  })

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin/login')
    }
  }

  const fetchData = async () => {
    try {
      // Fetch visitors - try the view first, fallback to direct table
      let visitorsData = []
      try {
        const { data, error } = await supabase
          .from('visitor_feedback_summary')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        visitorsData = data || []
      } catch (viewError) {
        console.log('View not available, fetching from visitors table directly')
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        visitorsData = data || []
      }

      // Fetch properties - handle if table doesn't exist
      let propertiesData = []
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false })

        if (error && !error.message.includes('relation "properties" does not exist')) {
          throw error
        }
        propertiesData = data || []
      } catch (propertiesError) {
        console.log('Properties table not available yet')
        propertiesData = []
      }

      setVisitors(visitorsData)
      setProperties(propertiesData)
      
      // Calculate stats
      const totalVisitors = visitorsData?.length || 0
      const withFeedback = visitorsData?.filter(v => v.rating).length || 0
      const ratings = visitorsData?.filter(v => v.rating).map(v => v.rating) || []
      const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
      const interestedCount = visitorsData?.filter(v => v.interested).length || 0
      const totalProperties = propertiesData?.length || 0

      setStats({
        totalVisitors,
        withFeedback,
        averageRating: Math.round(averageRating * 10) / 10,
        interestedCount,
        totalProperties
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load dashboard data. Please ensure database tables are set up.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const onSubmitProperty = async (data: PropertyFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get admin ID
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (adminError || !adminData) throw new Error('Admin not found')

      if (editingProperty) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update(data)
          .eq('id', editingProperty.id)

        if (error) throw error
        toast.success('Property updated successfully!')
      } else {
        // Create new property
        const { error } = await supabase
          .from('properties')
          .insert([{
            ...data,
            admin_id: adminData.id
          }])

        if (error) {
          if (error.message.includes('relation "properties" does not exist')) {
            throw new Error('Properties table not found. Please run the database setup script: database-properties-setup.sql')
          }
          throw error
        }
        toast.success('Property added successfully!')
      }

      setShowPropertyForm(false)
      setEditingProperty(null)
      propertyForm.reset()
      fetchData()
    } catch (error: any) {
      console.error('Error saving property:', error)
      toast.error(error.message || 'Failed to save property')
    }
  }

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property)
    propertyForm.reset({
      name: property.name,
      address: property.address,
      description: property.description || '',
      property_type: property.property_type,
      bedrooms: property.bedrooms || undefined,
      bathrooms: property.bathrooms || undefined,
      square_feet: property.square_feet || undefined,
      price: property.price || undefined,
      status: property.status as 'active' | 'inactive' | 'sold'
    })
    setShowPropertyForm(true)
  }

  const handleTogglePropertyStatus = async (property: Property) => {
    try {
      const newStatus = property.status === 'active' ? 'inactive' : 'active'
      
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id)

      if (error) throw error

      toast.success(`Property ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
      fetchData()
    } catch (error: any) {
      console.error('Error updating property status:', error)
      toast.error('Failed to update property status')
    }
  }

  const generateQRCode = async (property: Property) => {
    try {
      const checkInUrl = `${window.location.origin}/check-in/${property.id}`
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeDataUrl(qrDataUrl)
      setShowQRModal(property)
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !showQRModal) return
    
    const link = document.createElement('a')
    link.download = `${showQRModal.name.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  const getPropertyVisitorCount = (propertyId: string) => {
    return visitors.filter(v => v.property_id === propertyId).length
  }

  const getPropertyInterestedCount = (propertyId: string) => {
    return visitors.filter(v => v.property_id === propertyId && v.interested).length
  }

  const getPropertyAverageRating = (propertyId: string) => {
    const propertyVisitors = visitors.filter(v => v.property_id === propertyId && v.rating)
    if (propertyVisitors.length === 0) return 0
    const sum = propertyVisitors.reduce((acc, v) => acc + (v.rating || 0), 0)
    return Math.round((sum / propertyVisitors.length) * 10) / 10
  }

  const exportToCSV = () => {
    const csvData = filteredVisitors.map(visitor => ({
      Name: visitor.name,
      Email: visitor.email,
      Phone: visitor.phone,
      Property: visitor.property_name || 'No property',
      'Visit Date': formatDateTime(visitor.visit_date),
      Rating: visitor.rating || 'No rating',
      Comments: visitor.comments || 'No comments',
      Interested: visitor.interested ? 'Yes' : 'No',
      'Feedback Date': visitor.feedback_date ? formatDateTime(visitor.feedback_date) : 'No feedback'
    }))
    
    downloadCSV(csvData, `open-house-visitors-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Data exported successfully!')
  }

  // Filter visitors based on selected filters
  const filteredVisitors = visitors.filter(visitor => {
    if (filters.property && visitor.property_id !== filters.property) return false
    if (filters.dateFrom && new Date(visitor.visit_date) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(visitor.visit_date) > new Date(filters.dateTo)) return false
    if (filters.interested && visitor.interested?.toString() !== filters.interested) return false
    if (filters.rating && visitor.rating?.toString() !== filters.rating) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Open House Dashboard</h1>
                <p className="text-gray-600 text-sm">Manage your properties and visitor insights</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Data
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Visitors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalVisitors}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">With Feedback</p>
                <p className="text-3xl font-bold text-gray-900">{stats.withFeedback}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {stats.totalVisitors > 0 ? Math.round((stats.withFeedback / stats.totalVisitors) * 100) : 0}% completion
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageRating || 'N/A'}</p>
                <div className="flex items-center mt-1">
                  {stats.averageRating > 0 && (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-3 h-3 ${i < Math.floor(stats.averageRating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Interested</p>
                <p className="text-3xl font-bold text-gray-900">{stats.interestedCount}</p>
                <p className="text-xs text-rose-600 mt-1">
                  {stats.totalVisitors > 0 ? Math.round((stats.interestedCount / stats.totalVisitors) * 100) : 0}% interest rate
                </p>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Properties</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
                <p className="text-xs text-indigo-600 mt-1">
                  {properties.filter(p => p.status === 'active').length} active
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('visitors')}
                className={`relative px-8 py-4 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'visitors'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Visitors & Feedback
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`relative px-8 py-4 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'properties'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setActiveTab('followup')}
                className={`relative px-8 py-4 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'followup'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Follow-up
              </button>
            </nav>
          </div>

          {/* Visitors Tab */}
          {activeTab === 'visitors' && (
            <div className="p-8">
              {/* All Filters */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                  <select
                    value={filters.property}
                    onChange={(e) => setFilters({...filters, property: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="">All Properties</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interested</label>
                  <select
                    value={filters.interested}
                    onChange={(e) => setFilters({...filters, interested: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters({...filters, rating: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              </div>

              {/* Visitors Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interested</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredVisitors.map((visitor) => (
                        <tr key={visitor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {visitor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{visitor.name}</div>
                                <div className="text-sm text-gray-500">{visitor.email}</div>
                                <div className="text-xs text-gray-400">{visitor.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{visitor.property_name || 'No property'}</div>
                            <div className="text-xs text-gray-500">{visitor.property_address || ''}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(visitor.visit_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {visitor.rating ? (
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900 mr-2">{visitor.rating}</span>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={`w-4 h-4 ${i < visitor.rating! ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No rating</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {visitor.interested ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {visitor.comments || 'No comments'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredVisitors.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No visitors found</h3>
                    <p className="mt-1 text-sm text-gray-500">No visitors match the selected filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Properties</h2>
                  <p className="text-gray-600 mt-1">Manage your open house properties</p>
                </div>
                <button
                  onClick={() => setShowPropertyForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Property
                </button>
              </div>

              {/* Properties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => {
                  const visitorCount = getPropertyVisitorCount(property.id)
                  const interestedCount = getPropertyInterestedCount(property.id)
                  const avgRating = getPropertyAverageRating(property.id)
                  
                  return (
                    <div key={property.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{property.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center">
                              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {property.address}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditProperty(property)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Edit Property"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {property.status === 'active' && (
                              <button
                                onClick={() => generateQRCode(property)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                                title="Generate QR Code"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {property.description && (
                          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{property.description}</p>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
                              </svg>
                              {property.bedrooms || 0} bed
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                              </svg>
                              {property.bathrooms || 0} bath
                            </span>
                          </div>
                          {property.price && (
                            <span className="font-semibold text-gray-900">${property.price.toLocaleString()}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 rounded-xl">
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">{visitorCount}</div>
                            <div className="text-xs text-gray-500 font-medium">Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-emerald-600">{interestedCount}</div>
                            <div className="text-xs text-gray-500 font-medium">Interested</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-amber-600">{avgRating || 'N/A'}</div>
                            <div className="text-xs text-gray-500 font-medium">Avg Rating</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            property.status === 'active' ? 'bg-green-100 text-green-800' :
                            property.status === 'sold' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              property.status === 'active' ? 'bg-green-500' :
                              property.status === 'sold' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}></div>
                            {property.status}
                          </span>
                          
                          <button
                            onClick={() => handleTogglePropertyStatus(property)}
                            className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors duration-200 ${
                              property.status === 'active' 
                                ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' 
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                          >
                            {property.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                        
                        {property.status === 'active' && (
                          <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
                            <a
                              href={`/check-in/${property.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-2 px-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                            >
                              Check-in Link
                            </a>
                            <a
                              href={`/feedback/${property.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center text-xs text-emerald-600 hover:text-emerald-800 font-medium py-2 px-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors duration-200"
                            >
                              Feedback Link
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {properties.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No properties yet</h3>
                  <p className="text-gray-500 mb-6">Get started by adding your first property.</p>
                  <button
                    onClick={() => setShowPropertyForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Your First Property
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Follow-up Tab */}
          {activeTab === 'followup' && (
            <div className="p-8">
              <FollowUpManagement />
            </div>
          )}
        </div>

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">QR Code</h3>
                  <button
                    onClick={() => setShowQRModal(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="text-center">
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2">{showQRModal.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">Check-in URL:</p>
                    <p className="text-xs text-blue-600 break-all bg-white p-2 rounded-lg border">
                      {`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${showQRModal.id}`}
                    </p>
                  </div>
                  
                  {qrCodeDataUrl && (
                    <div className="mb-6">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code" 
                        className="mx-auto border border-gray-200 rounded-xl shadow-lg"
                      />
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadQRCode}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-colors duration-200 shadow-sm"
                    >
                      Download QR Code
                    </button>
                    <button
                      onClick={() => setShowQRModal(null)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors duration-200"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p className="mb-1">📱 Print this QR code and place it at the property entrance.</p>
                    <p>Visitors can scan it to check in directly for this property.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Property Form Modal */}
        {showPropertyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {editingProperty ? 'Edit Property' : 'Add New Property'}
                </h3>
                <form onSubmit={propertyForm.handleSubmit(onSubmitProperty)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Name *</label>
                    <input
                      {...propertyForm.register('name')}
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="Beautiful Family Home"
                    />
                    {propertyForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600">{propertyForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                    <input
                      {...propertyForm.register('address')}
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="123 Main Street, City, State"
                    />
                    {propertyForm.formState.errors.address && (
                      <p className="mt-1 text-sm text-red-600">{propertyForm.formState.errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      {...propertyForm.register('description')}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="Property description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                      <select
                        {...propertyForm.register('property_type')}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      >
                        <option value="house">House</option>
                        <option value="condo">Condo</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="apartment">Apartment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        {...propertyForm.register('status')}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                      <input
                        {...propertyForm.register('bedrooms', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                      <input
                        {...propertyForm.register('bathrooms', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        step="0.5"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="2.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                      <input
                        {...propertyForm.register('square_feet', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="2000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <input
                        {...propertyForm.register('price', { valueAsNumber: true })}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="450000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPropertyForm(false)
                        setEditingProperty(null)
                        propertyForm.reset()
                      }}
                      className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 shadow-sm"
                    >
                      {editingProperty ? 'Update Property' : 'Add Property'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
