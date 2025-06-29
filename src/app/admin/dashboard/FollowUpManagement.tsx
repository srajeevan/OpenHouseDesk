'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  campaignSchemaWithConditionals, 
  type CampaignFormDataWithConditionals,
  AVAILABLE_TEMPLATE_VARIABLES,
  TEMPLATE_VARIABLE_DESCRIPTIONS
} from '@/lib/follow-up-validations'

interface Campaign {
  id: string
  name: string
  description?: string
  property_id?: string
  property_name?: string
  message_type: string
  trigger_condition: string
  delay_hours: number
  email_subject?: string
  email_template?: string
  email_from_name: string
  sms_template?: string
  status: string
  created_at: string
  updated_at: string
}

interface Property {
  id: string
  name: string
  address: string
}

interface FollowUpLog {
  id: string
  visitor_name: string
  visitor_email?: string
  visitor_phone?: string
  property_name: string
  message_type: string
  status: string
  sent_at: string
  delivered_at?: string
  error_message?: string
}

interface VisitorData {
  visitor_id: string
  visitor_name: string
  visitor_email: string
  visitor_phone: string
  property_name: string
  property_address: string
  visit_date: string
  interested: boolean
  has_feedback: boolean
}

export default function FollowUpManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [followUpLogs, setFollowUpLogs] = useState<FollowUpLog[]>([])
  const [eligibleVisitors, setEligibleVisitors] = useState<VisitorData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [showSendModal, setShowSendModal] = useState<Campaign | null>(null)
  const [selectedVisitors, setSelectedVisitors] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'logs' | 'templates'>('campaigns')
  const [showVariableHelper] = useState(false)
  
  const supabase = createClientComponentClient()

  const campaignForm = useForm<CampaignFormDataWithConditionals>({
    resolver: zodResolver(campaignSchemaWithConditionals),
    defaultValues: {
      name: '',
      message_type: 'email',
      trigger_condition: 'manual',
      delay_hours: 24,
      email_from_name: 'Open House Team',
      status: 'active',
    }
  })

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('follow_up_campaigns')
        .select(`
          *,
          properties (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (campaignsError) throw campaignsError

      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('status', 'active')
        .order('name')

      if (propertiesError) throw propertiesError

      // Fetch recent follow-up logs
      const { data: logsData, error: logsError } = await supabase
        .from('follow_up_logs')
        .select(`
          id,
          visitor_id,
          message_type,
          status,
          sent_at,
          delivered_at,
          error_message,
          visitors (
            name,
            email,
            phone
          ),
          properties (
            name
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(50)

      if (logsError) throw logsError

      setCampaigns(campaignsData?.map(c => ({
        ...c,
        property_name: c.properties?.name
      })) || [])
      setProperties(propertiesData || [])
      setFollowUpLogs(logsData?.map((log: any) => ({
        id: log.id,
        visitor_name: log.visitors?.name || 'Unknown',
        visitor_email: log.visitors?.email,
        visitor_phone: log.visitors?.phone,
        property_name: log.properties?.name || 'Unknown',
        message_type: log.message_type,
        status: log.status,
        sent_at: log.sent_at,
        delivered_at: log.delivered_at,
        error_message: log.error_message,
      })) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load follow-up data')
    } finally {
      setLoading(false)
    }
  }

  const fetchEligibleVisitors = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_eligible_visitors', {
          campaign_id_param: campaignId
        })

      if (error) throw error
      setEligibleVisitors(data || [])
    } catch (error) {
      console.error('Error fetching eligible visitors:', error)
      toast.error('Failed to load eligible visitors')
    }
  }

  const onSubmitCampaign = async (data: CampaignFormDataWithConditionals) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (adminError || !adminData) throw new Error('Admin not found')

      if (editingCampaign) {
        const { error } = await supabase
          .from('follow_up_campaigns')
          .update(data)
          .eq('id', editingCampaign.id)

        if (error) throw error
        toast.success('Campaign updated successfully!')
      } else {
        const { error } = await supabase
          .from('follow_up_campaigns')
          .insert([{
            ...data,
            admin_id: adminData.id
          }])

        if (error) throw error
        toast.success('Campaign created successfully!')
      }

      setShowCampaignForm(false)
      setEditingCampaign(null)
      campaignForm.reset()
      fetchData()
    } catch (error: any) {
      console.error('Error saving campaign:', error)
      toast.error(error.message || 'Failed to save campaign')
    }
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    campaignForm.reset({
      name: campaign.name,
      description: campaign.description || '',
      property_id: campaign.property_id || undefined,
      message_type: campaign.message_type as any,
      trigger_condition: campaign.trigger_condition as any,
      delay_hours: campaign.delay_hours,
      email_subject: campaign.email_subject || '',
      email_template: campaign.email_template || '',
      email_from_name: campaign.email_from_name,
      sms_template: campaign.sms_template || '',
      status: campaign.status as any,
    })
    setShowCampaignForm(true)
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const { error } = await supabase
        .from('follow_up_campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error
      toast.success('Campaign deleted successfully!')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const handleToggleCampaignStatus = async (campaign: Campaign) => {
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active'
      
      const { error } = await supabase
        .from('follow_up_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id)

      if (error) throw error
      toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`)
      fetchData()
    } catch (error: any) {
      console.error('Error updating campaign status:', error)
      toast.error('Failed to update campaign status')
    }
  }

  const handleSendFollowUp = async (campaign: Campaign) => {
    setShowSendModal(campaign)
    await fetchEligibleVisitors(campaign.id)
  }

  const sendFollowUpMessages = async () => {
    if (!showSendModal) return

    setSending(true)
    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/send-follow-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaignId: showSendModal.id,
          visitorIds: selectedVisitors.length > 0 ? selectedVisitors : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send follow-up messages')
      }

      toast.success(`Successfully sent ${result.sent} messages!`)
      
      if (result.failed > 0) {
        toast.error(`${result.failed} messages failed to send`)
      }

      setShowSendModal(null)
      setSelectedVisitors([])
      fetchData()
    } catch (error: any) {
      console.error('Error sending follow-up:', error)
      toast.error(error.message || 'Failed to send follow-up messages')
    } finally {
      setSending(false)
    }
  }

  const insertTemplateVariable = (variable: string, field: 'email_template' | 'sms_template' | 'email_subject') => {
    const currentValue = campaignForm.getValues(field) || ''
    const newValue = currentValue + `{{${variable}}}`
    campaignForm.setValue(field, newValue)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-800 border-green-200',
      paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
      opened: 'bg-purple-100 text-purple-800 border-purple-200',
      clicked: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Follow-up Management</h2>
          <p className="text-slate-600 mt-1">Manage email and SMS follow-up campaigns</p>
        </div>
        <button
          onClick={() => setShowCampaignForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Message Logs ({followUpLogs.length})
          </button>
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-4">Create your first follow-up campaign to start engaging with visitors.</p>
              <button
                onClick={() => setShowCampaignForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {campaign.property_name || 'All properties'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {campaign.message_type === 'both' ? 'Email & SMS' : campaign.message_type.toUpperCase()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {campaign.trigger_condition.replace('_', ' ')} • {campaign.delay_hours}h delay
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSendFollowUp(campaign)}
                      disabled={campaign.status !== 'active'}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm py-2 px-3 rounded-md transition-colors"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => handleEditCampaign(campaign)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleCampaignStatus(campaign)}
                      className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${
                        campaign.status === 'active'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {campaign.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivered At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {followUpLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.visitor_name}</div>
                        <div className="text-sm text-gray-500">
                          {log.visitor_email || log.visitor_phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.property_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {log.message_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(log.sent_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.delivered_at ? formatDateTime(log.delivered_at) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {followUpLogs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages sent yet</h3>
              <p className="text-gray-500">Message logs will appear here once you start sending follow-ups.</p>
            </div>
          )}
        </div>
      )}

      {/* Optimized Campaign Form Modal - No Scrolling Issues */}
      {showCampaignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl my-8">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-lg">
              <h3 className="text-xl font-bold text-gray-900">
                {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
              </h3>
              <button
                onClick={() => {
                  setShowCampaignForm(false)
                  setEditingCampaign(null)
                  campaignForm.reset()
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6">
              <form onSubmit={campaignForm.handleSubmit(onSubmitCampaign)} className="space-y-6">
                {/* Basic Info - 2 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
                    <input
                      {...campaignForm.register('name')}
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Welcome Follow-up"
                    />
                    {campaignForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600">{campaignForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                    <select
                      {...campaignForm.register('property_id')}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Properties</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    {...campaignForm.register('description')}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of this campaign..."
                  />
                </div>

                {/* Settings - 3 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Type *</label>
                    <select
                      {...campaignForm.register('message_type')}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Email Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">Email & SMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Condition *</label>
                    <select
                      {...campaignForm.register('trigger_condition')}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="manual">Manual Send</option>
                      <option value="interested">Interested Visitors</option>
                      <option value="all">All Visitors</option>
                      <option value="no_feedback">No Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delay (hours)</label>
                    <input
                      {...campaignForm.register('delay_hours', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="8760"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="24"
                    />
                  </div>
                </div>

                {/* Email Settings */}
                {(campaignForm.watch('message_type') === 'email' || campaignForm.watch('message_type') === 'both') && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="lg:col-span-2">
                      <h4 className="text-lg font-medium text-blue-900 flex items-center mb-4">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email Settings
                      </h4>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                      <input
                        {...campaignForm.register('email_from_name')}
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Open House Team"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                      <input
                        {...campaignForm.register('email_subject')}
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Thank you for visiting {{property_name}}!"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Template *</label>
                      <textarea
                        {...campaignForm.register('email_template')}
                        rows={6}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Hi {{visitor_name}},&#10;&#10;Thank you for visiting {{property_name}} today! We hope you enjoyed exploring the property.&#10;&#10;Best regards,&#10;{{admin_name}}"
                      />
                    </div>
                  </div>
                )}

                {/* SMS Settings */}
                {(campaignForm.watch('message_type') === 'sms' || campaignForm.watch('message_type') === 'both') && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-lg font-medium text-green-900 flex items-center mb-4">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      SMS Settings
                    </h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SMS Message *</label>
                      <textarea
                        {...campaignForm.register('sms_template')}
                        rows={4}
                        maxLength={1600}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Hi {{visitor_name}}! Thanks for visiting {{property_name}} today. Any questions? Reply to this message. - {{admin_name}}"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {campaignForm.watch('sms_template')?.length || 0}/1600 characters
                      </p>
                    </div>
                  </div>
                )}

                {/* Template Variables Helper */}
                {showVariableHelper && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Available Template Variables</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {AVAILABLE_TEMPLATE_VARIABLES.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          onClick={() => {
                            const activeField = campaignForm.watch('message_type') === 'email' ? 'email_template' : 'sms_template'
                            insertTemplateVariable(variable, activeField)
                          }}
                          className="text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          title={TEMPLATE_VARIABLE_DESCRIPTIONS[variable]}
                        >
                          <code className="text-blue-600">{`{{${variable}}}`}</code>
                          <div className="text-gray-500 mt-1">{TEMPLATE_VARIABLE_DESCRIPTIONS[variable]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCampaignForm(false)
                      setEditingCampaign(null)
                      campaignForm.reset()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Follow-up Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Send Follow-up: {showSendModal.name}
                </h3>
                <button
                  onClick={() => {
                    setShowSendModal(null)
                    setSelectedVisitors([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Eligible Visitors ({eligibleVisitors.length})
                </h4>
                
                {eligibleVisitors.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No eligible visitors found for this campaign.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={selectedVisitors.length === eligibleVisitors.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVisitors(eligibleVisitors.map(v => v.visitor_id))
                          } else {
                            setSelectedVisitors([])
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">
                        Select All ({eligibleVisitors.length})
                      </label>
                    </div>
                    
                    {eligibleVisitors.map((visitor) => (
                      <div key={visitor.visitor_id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedVisitors.includes(visitor.visitor_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVisitors([...selectedVisitors, visitor.visitor_id])
                            } else {
                              setSelectedVisitors(selectedVisitors.filter(id => id !== visitor.visitor_id))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900">{visitor.visitor_name}</div>
                          <div className="text-sm text-gray-500">{visitor.visitor_email}</div>
                          <div className="text-xs text-gray-400">
                            {visitor.property_name} • {formatDateTime(visitor.visit_date)}
                            {visitor.interested && <span className="ml-2 text-green-600">• Interested</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSendModal(null)
                    setSelectedVisitors([])
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendFollowUpMessages}
                  disabled={sending || eligibleVisitors.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md transition-colors"
                >
                  {sending ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    `Send to ${selectedVisitors.length > 0 ? selectedVisitors.length : eligibleVisitors.length} visitors`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
