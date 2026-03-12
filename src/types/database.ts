export type Plan = 'starter' | 'growth' | 'pro'
export type BillingStatus = 'active' | 'past_due' | 'cancelled'
export type Platform = 'tiktok' | 'instagram'
export type EventStatus = 'draft' | 'scheduled' | 'posted' | 'deleted'
export type ConnectionStatus = 'connected' | 'needs_reauth'
export type MessageRole = 'user' | 'assistant'

export interface Organization {
  id: string
  user_id: string
  name: string
  industry: string
  target_audience: string
  description: string
  plan: Plan
  credits_remaining: number
  credits_reset_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_status: BillingStatus
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface SocialConnection {
  id: string
  org_id: string
  platform: Platform
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  account_handle: string | null
  connected_at: string
  status: ConnectionStatus
}

export interface AnalyticsSnapshot {
  id: string
  org_id: string
  platform: Platform
  date: string
  followers: number
  views: number
  likes: number
  comments: number
  shares: number
  impressions: number
  profile_views: number
  engagement_rate: number
  created_at: string
}

export interface CalendarEvent {
  id: string
  org_id: string
  platform: Platform
  scheduled_date: string
  caption: string
  hashtags: string[]
  video_idea: string
  status: EventStatus
  ai_generated: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  org_id: string
  role: MessageRole
  content: string
  credits_used: number
  model_used: string | null
  created_at: string
}

export interface UfRulesCache {
  id: number
  content: string
  fetched_at: string
}

export const PLAN_CREDITS: Record<Plan, number> = {
  starter: 50,
  growth: 100,
  pro: 200,
}

export const PLAN_MODEL: Record<Plan, string> = {
  starter: 'gpt-4o-mini',
  growth: 'gpt-4.1-mini',
  pro: 'gpt-4.1-mini',
}

export const PRO_PREMIUM_MODEL = 'gpt-4.1'

export function getAllowedModels(plan: Plan): string[] {
  if (plan === 'pro') {
    return [PLAN_MODEL.pro, PRO_PREMIUM_MODEL]
  }
  return [PLAN_MODEL[plan]]
}
