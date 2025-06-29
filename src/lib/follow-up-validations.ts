import { z } from 'zod'

// Campaign validation schema
export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name too long'),
  description: z.string().optional(),
  property_id: z.string().uuid('Invalid property ID').optional(),
  message_type: z.enum(['email', 'sms', 'both'], {
    required_error: 'Message type is required',
  }),
  trigger_condition: z.enum(['interested', 'all', 'no_feedback', 'manual'], {
    required_error: 'Trigger condition is required',
  }),
  delay_hours: z.number().min(0, 'Delay must be positive').max(8760, 'Delay cannot exceed 1 year'),
  email_subject: z.string().max(200, 'Subject too long').optional(),
  email_template: z.string().max(10000, 'Email template too long').optional(),
  email_from_name: z.string().max(100, 'From name too long'),
  sms_template: z.string().max(1600, 'SMS template too long (max 1600 chars)').optional(),
  status: z.enum(['active', 'paused', 'completed']),
})

export type CampaignFormData = z.infer<typeof campaignSchema>

// Email template validation schema
export const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html_content: z.string().min(1, 'HTML content is required').max(50000, 'Content too long'),
  text_content: z.string().max(50000, 'Text content too long').optional(),
  variables: z.array(z.string()).default([]),
  category: z.string().default('follow_up'),
})

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>

// SMS template validation schema
export const smsTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  content: z.string().min(1, 'Content is required').max(1600, 'SMS content too long (max 1600 chars)'),
  variables: z.array(z.string()).default([]),
  category: z.string().default('follow_up'),
})

export type SMSTemplateFormData = z.infer<typeof smsTemplateSchema>

// Send follow-up validation schema
export const sendFollowUpSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  visitorIds: z.array(z.string().uuid('Invalid visitor ID')).optional(),
  propertyId: z.string().uuid('Invalid property ID').optional(),
  messageType: z.enum(['email', 'sms', 'both']).optional(),
})

export type SendFollowUpFormData = z.infer<typeof sendFollowUpSchema>

// Unsubscribe validation schema
export const unsubscribeSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  unsubscribe_type: z.enum(['email', 'sms', 'both'], {
    required_error: 'Unsubscribe type is required',
  }),
  reason: z.string().max(500, 'Reason too long').optional(),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone number is required',
    path: ['email'],
  }
)

export type UnsubscribeFormData = z.infer<typeof unsubscribeSchema>

// Follow-up log filters
export const followUpLogFiltersSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  message_type: z.enum(['email', 'sms']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

export type FollowUpLogFilters = z.infer<typeof followUpLogFiltersSchema>

// Campaign analytics filters
export const campaignAnalyticsFiltersSchema = z.object({
  property_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  message_type: z.enum(['email', 'sms', 'both']).optional(),
})

export type CampaignAnalyticsFilters = z.infer<typeof campaignAnalyticsFiltersSchema>

// Bulk action validation
export const bulkActionSchema = z.object({
  action: z.enum(['send', 'pause', 'activate', 'delete']),
  campaignIds: z.array(z.string().uuid()).min(1, 'At least one campaign must be selected'),
})

export type BulkActionFormData = z.infer<typeof bulkActionSchema>

// Template variable extraction helper
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(template)) !== null) {
    const variable = match[1].trim()
    if (!variables.includes(variable)) {
      variables.push(variable)
    }
  }

  return variables
}

// Available template variables
export const AVAILABLE_TEMPLATE_VARIABLES = [
  'visitor_name',
  'visitor_email', 
  'visitor_phone',
  'property_name',
  'property_address',
  'property_type',
  'property_price',
  'admin_name',
  'admin_email',
  'admin_phone',
  'visit_date',
  'feedback_rating',
  'feedback_comments',
  'interested',
] as const

export type TemplateVariable = typeof AVAILABLE_TEMPLATE_VARIABLES[number]

// Template variable descriptions
export const TEMPLATE_VARIABLE_DESCRIPTIONS: Record<TemplateVariable, string> = {
  visitor_name: 'The visitor\'s full name',
  visitor_email: 'The visitor\'s email address',
  visitor_phone: 'The visitor\'s phone number',
  property_name: 'The name of the property visited',
  property_address: 'The full address of the property',
  property_type: 'Type of property (house, condo, etc.)',
  property_price: 'The listed price of the property',
  admin_name: 'The admin/agent\'s name',
  admin_email: 'The admin/agent\'s email',
  admin_phone: 'The admin/agent\'s phone number',
  visit_date: 'The date the visitor attended the open house',
  feedback_rating: 'The visitor\'s rating (1-5 stars)',
  feedback_comments: 'The visitor\'s feedback comments',
  interested: 'Whether the visitor expressed interest (Yes/No)',
}

// Validation for template content
export function validateTemplateVariables(template: string): {
  isValid: boolean
  invalidVariables: string[]
  validVariables: string[]
} {
  const extractedVariables = extractTemplateVariables(template)
  const validVariables: string[] = []
  const invalidVariables: string[] = []

  extractedVariables.forEach(variable => {
    if (AVAILABLE_TEMPLATE_VARIABLES.includes(variable as TemplateVariable)) {
      validVariables.push(variable)
    } else {
      invalidVariables.push(variable)
    }
  })

  return {
    isValid: invalidVariables.length === 0,
    invalidVariables,
    validVariables,
  }
}

// Message type validation helpers
export function requiresEmailTemplate(messageType: string): boolean {
  return messageType === 'email' || messageType === 'both'
}

export function requiresSMSTemplate(messageType: string): boolean {
  return messageType === 'sms' || messageType === 'both'
}

// Campaign validation with conditional requirements
export const campaignSchemaWithConditionals = campaignSchema.superRefine((data, ctx) => {
  // Email template required for email campaigns
  if (requiresEmailTemplate(data.message_type)) {
    if (!data.email_subject || data.email_subject.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email subject is required for email campaigns',
        path: ['email_subject'],
      })
    }
    if (!data.email_template || data.email_template.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email template is required for email campaigns',
        path: ['email_template'],
      })
    }
  }

  // SMS template required for SMS campaigns
  if (requiresSMSTemplate(data.message_type)) {
    if (!data.sms_template || data.sms_template.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SMS template is required for SMS campaigns',
        path: ['sms_template'],
      })
    }
  }

  // Validate template variables
  if (data.email_template) {
    const emailValidation = validateTemplateVariables(data.email_template)
    if (!emailValidation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid template variables in email: ${emailValidation.invalidVariables.join(', ')}`,
        path: ['email_template'],
      })
    }
  }

  if (data.sms_template) {
    const smsValidation = validateTemplateVariables(data.sms_template)
    if (!smsValidation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid template variables in SMS: ${smsValidation.invalidVariables.join(', ')}`,
        path: ['sms_template'],
      })
    }
  }
})

export type CampaignFormDataWithConditionals = z.infer<typeof campaignSchemaWithConditionals>
