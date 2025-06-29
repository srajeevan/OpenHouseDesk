// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
// This is a Supabase Edge Function that runs in Deno runtime
// TypeScript errors in local environment are expected and can be ignored

// Declare global Deno namespace for TypeScript
declare global {
  namespace Deno {
    export const env: {
      get(key: string): string | undefined;
    };
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @deno-types="https://esm.sh/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendFollowUpRequest {
  campaignId: string
  visitorIds?: string[]
  propertyId?: string
  messageType?: 'email' | 'sms' | 'both'
}

interface VisitorData {
  visitor_id: string
  visitor_name: string
  visitor_email: string
  visitor_phone: string
  property_id: string
  property_name: string
  property_address: string
  visit_date: string
  interested: boolean
  has_feedback: boolean
}

interface Campaign {
  id: string
  name: string
  message_type: string
  email_subject: string
  email_template: string
  email_from_name: string
  sms_template: string
  admin_id: string
}

interface Admin {
  id: string
  name: string
  email: string
  phone: string
}

// Template variable replacement
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  }
  return result
}

// Send email using Resend
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  fromName: string = 'Open House Team'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <noreply@resend.dev>`, // Update this to your verified domain
        to: [to],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    })

    const data = await response.json() as any

    if (!response.ok) {
      console.error('Resend API error:', data)
      throw new Error(data.message || data.error || 'Failed to send email')
    }

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Send SMS using Twilio
async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured')
    }

    // Format phone number (ensure it starts with +1 for US numbers)
    let formattedPhone = to.replace(/\D/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: formattedPhone,
          Body: message,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send SMS')
    }

    return {
      success: true,
      messageId: data.sid,
    }
  } catch (error) {
    console.error('SMS send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Log follow-up message
async function logFollowUp(
  supabase: any,
  visitorId: string,
  campaignId: string,
  propertyId: string,
  adminId: string,
  messageType: string,
  recipientEmail: string | null,
  recipientPhone: string | null,
  subject: string | null,
  messageContent: string,
  status: string,
  externalId: string | null,
  errorMessage: string | null
) {
  const { error } = await supabase
    .from('follow_up_logs')
    .insert({
      visitor_id: visitorId,
      campaign_id: campaignId,
      property_id: propertyId,
      admin_id: adminId,
      message_type: messageType,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      subject: subject,
      message_content: messageContent,
      status: status,
      external_id: externalId,
      error_message: errorMessage,
    })

  if (error) {
    console.error('Failed to log follow-up:', error)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { campaignId, visitorIds, propertyId, messageType }: SendFollowUpRequest = await req.json()

    if (!campaignId) {
      throw new Error('Campaign ID is required')
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('follow_up_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    // Get admin details
    const { data: admin, error: adminError } = await supabaseClient
      .from('admins')
      .select('*')
      .eq('id', campaign.admin_id)
      .single()

    if (adminError || !admin) {
      throw new Error('Admin not found')
    }

    // Get eligible visitors
    let visitors: VisitorData[]
    
    if (visitorIds && visitorIds.length > 0) {
      // Manual selection - get specific visitors
      const { data, error } = await supabaseClient
        .rpc('get_eligible_visitors', {
          campaign_id_param: campaignId,
          property_id_param: propertyId
        })
        .in('visitor_id', visitorIds)

      if (error) throw error
      visitors = data || []
    } else {
      // Automatic - get all eligible visitors
      const { data, error } = await supabaseClient
        .rpc('get_eligible_visitors', {
          campaign_id_param: campaignId,
          property_id_param: propertyId
        })

      if (error) throw error
      visitors = data || []
    }

    // Debug logging to see what we're getting
    console.log('Visitors data received:', JSON.stringify(visitors, null, 2))

    if (visitors.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No eligible visitors found',
          sent: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each visitor
    for (const visitor of visitors) {
      const templateVariables = {
        visitor_name: visitor.visitor_name,
        property_name: visitor.property_name,
        property_address: visitor.property_address,
        admin_name: admin.name,
        admin_email: admin.email,
        admin_phone: admin.phone,
      }

      const effectiveMessageType = messageType || campaign.message_type

      // Send email
      if (effectiveMessageType === 'email' || effectiveMessageType === 'both') {
        if (visitor.visitor_email) {
          const subject = replaceTemplateVariables(campaign.email_subject || '', templateVariables)
          const htmlContent = replaceTemplateVariables(campaign.email_template || '', templateVariables)
          const textContent = htmlContent.replace(/<[^>]*>/g, '') // Simple HTML to text conversion

          const emailResult = await sendEmail(
            visitor.visitor_email,
            subject,
            htmlContent,
            textContent,
            campaign.email_from_name
          )

          // Get the actual property_id if visitor.property_id is not a valid UUID
          let actualPropertyId = visitor.property_id
          if (!visitor.property_id || typeof visitor.property_id === 'string' && visitor.property_id.length < 30) {
            // Fallback: get property_id from visitor record
            const { data: visitorData } = await supabaseClient
              .from('visitors')
              .select('property_id')
              .eq('id', visitor.visitor_id)
              .single()
            actualPropertyId = visitorData?.property_id || null
          }

          await logFollowUp(
            supabaseClient,
            visitor.visitor_id,
            campaignId,
            actualPropertyId,
            campaign.admin_id,
            'email',
            visitor.visitor_email,
            null,
            subject,
            htmlContent,
            emailResult.success ? 'sent' : 'failed',
            emailResult.messageId || null,
            emailResult.error || null
          )

          if (emailResult.success) {
            results.sent++
          } else {
            results.failed++
            results.errors.push(`Email to ${visitor.visitor_email}: ${emailResult.error}`)
          }
        }
      }

      // Send SMS
      if (effectiveMessageType === 'sms' || effectiveMessageType === 'both') {
        if (visitor.visitor_phone && campaign.sms_template) {
          const smsContent = replaceTemplateVariables(campaign.sms_template, templateVariables)

          const smsResult = await sendSMS(visitor.visitor_phone, smsContent)

          // Get the actual property_id if visitor.property_id is not a valid UUID
          let actualPropertyId = visitor.property_id
          if (!visitor.property_id || typeof visitor.property_id === 'string' && visitor.property_id.length < 30) {
            // Fallback: get property_id from visitor record
            const { data: visitorData } = await supabaseClient
              .from('visitors')
              .select('property_id')
              .eq('id', visitor.visitor_id)
              .single()
            actualPropertyId = visitorData?.property_id || null
          }

          await logFollowUp(
            supabaseClient,
            visitor.visitor_id,
            campaignId,
            actualPropertyId,
            campaign.admin_id,
            'sms',
            null,
            visitor.visitor_phone,
            null,
            smsContent,
            smsResult.success ? 'sent' : 'failed',
            smsResult.messageId || null,
            smsResult.error || null
          )

          if (smsResult.success) {
            results.sent++
          } else {
            results.failed++
            results.errors.push(`SMS to ${visitor.visitor_phone}: ${smsResult.error}`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Follow-up messages processed`,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors,
        visitorsProcessed: visitors.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Follow-up send error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
