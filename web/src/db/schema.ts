// Column names match the Supabase/PostgreSQL table (snake_case).
export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: PostStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Brand {
  id: string;
  name: string;
  is_demo: boolean;
  // Brief fields — all optional free-form text
  core_values: string | null;
  content_themes: string | null;
  objectives: string | null;
  dislikes: string | null;
  tone_of_voice: string | null;
  competitors: string | null;
  products_services: string | null;
  target_audience: string | null;
  key_differentiators: string | null;  // what sets the brand apart (USPs)
  brand_story: string | null;          // background, history, origin story
  created_at: string;
  updated_at: string;
}

// Credential row as stored — never expose encrypted_value or iv to clients.
export interface BrandCredential {
  id: string;
  brand_id: string;
  platform: string;
  encrypted_value: string;
  iv: string;
  last_updated_at: string;
  last_used_at: string | null;
}

// Safe subset returned to the UI (no ciphertext).
export interface BrandCredentialMeta {
  platform: string;
  last_updated_at: string;
  last_used_at: string | null;
}

// Per-brand publishing configuration (ARM-82).
export type PublishFrequency = 'daily' | 'per_event' | 'weekly' | 'manual';
export type PostType = 'poster' | 'caption' | 'thread' | 'image' | 'video';

export interface PlatformPublishingConfig {
  enabled: boolean;
  frequency: PublishFrequency;
  post_types: PostType[];
  timing_rules: string;    // free-form e.g. "2h before kick-off"
  auto_publish: boolean;
}

export interface BrandPublishingConfig {
  id: string;
  brand_id: string;
  config: {
    platforms: Partial<Record<string, PlatformPublishingConfig>>;
  };
  created_at: string;
  updated_at: string;
}

// Reusable poster and caption templates per brand (ARM-84).
export type TemplateKind = 'poster' | 'caption';

export interface BrandTemplate {
  id: string;
  brand_id: string;
  kind: TemplateKind;
  poster_type: string | null;  // 'match-day' | 'result' | 'weekly-schedule' | 'custom'
  platform: string | null;     // 'facebook' | 'instagram' | etc.
  name: string;
  content: string;             // HTML/CSS (poster) or text with {placeholders} (caption)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Generic brand events — any brand can log any type of event (ARM-95).
export interface BrandEvent {
  id: string;
  brand_id: string;
  name: string;
  event_type: string;   // freeform: 'product launch', 'campaign', 'sale', etc.
  event_date: string;   // ISO date string (YYYY-MM-DD)
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Brand voice document — tone, style, and writing guidelines (ARM-85).
export interface BrandVoice {
  id: string;
  brand_id: string;
  tone: string | null;
  style: string | null;
  platform_guidelines: string | null;
  dos_and_donts: string | null;
  sample_copy: string | null;
  competitor_differentiation: string | null;
  created_at: string;
  updated_at: string;
}

// ── V2 tables (already migrated into Supabase) ────────────────────────────────

// Brand profile — full brand identity detail, split out of brands inline fields.
// 1:1 with brands via UNIQUE brand_id.
export interface BrandProfile {
  id: string;
  brand_id: string;
  core_values: string | null;
  content_themes: string | null;
  objectives: string | null;
  dislikes: string | null;
  tone_of_voice: string | null;
  competitors: string | null;
  products_services: string | null;
  target_audience: string | null;
  key_differentiators: string | null;
  brand_story: string | null;
  industry: string | null;
  website: string | null;
  social_handles: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// Brand policy — operational guidelines, compliance rules, content policies.
export interface BrandPolicy {
  id: string;
  brand_id: string;
  title: string;
  category: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Brand staff contact — internal team contacts linked to the brand.
export interface BrandStaffContact {
  id: string;
  brand_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Brand knowledge item — free-form knowledge entry; source of truth for brand context.
export interface BrandKnowledgeItem {
  id: string;
  brand_id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  source: string | null;
  created_at: string;
  updated_at: string;
}

// Brand knowledge summary — agent-generated or human-edited summaries of knowledge items.
export interface BrandKnowledgeSummary {
  id: string;
  brand_id: string;
  title: string;
  body: string;
  source_item_ids: string[];
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Rebuild 2 V2 tables — Content + Creative ─────────────────────────────────
// Source of truth: CTO-provided schema (ARM-105, 2026-04-29).

export type ContentItemStatus =
  | 'draft' | 'in_review' | 'approved' | 'rejected'
  | 'scheduled' | 'published' | 'archived';

export interface ContentItem {
  id: string;
  brand_id: string;
  content_type: string;
  platform: string | null;
  title: string | null;
  body: string | null;
  status: ContentItemStatus;
  source_type: string;        // 'manual' | agent-set value
  source_ref: string | null;
  campaign_name: string | null; // soft text linkage — no FK to campaigns
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ContentVariantStatus =
  | 'draft' | 'shortlisted' | 'approved' | 'rejected' | 'archived';

export interface ContentVariant {
  id: string;
  content_item_id: string;
  variant_label: string;
  title: string | null;
  body: string | null;
  status: ContentVariantStatus;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ContentReviewStatus =
  | 'requested_changes' | 'approved_for_next_stage' | 'rejected';

// Editorial/review-note table — NOT a formal approval gate.
export interface ContentReview {
  id: string;
  content_item_id: string;
  reviewer_agent: string;
  review_status: ContentReviewStatus;
  notes: string | null;
  created_at: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// Formal approval gate — polymorphic via entity_type + entity_id.
export interface Approval {
  id: string;
  brand_id: string;
  entity_type: string;    // e.g. 'content_item'
  entity_id: string;      // polymorphic FK
  approval_type: string;
  status: ApprovalStatus;
  requested_by_agent: string | null;
  decided_by_agent: string | null;
  decision_notes: string | null;
  requested_at: string;
  decided_at: string | null;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// Campaign — groups creative work. No direct FK from content_items.
// Content linkage is via content_items.campaign_name (soft text match).
export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  objective: string | null;
  description: string | null;
  status: CampaignStatus;
  start_date: string | null;  // ISO date YYYY-MM-DD
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CreativeAssetStatus =
  | 'draft' | 'ready_for_review' | 'approved' | 'rejected' | 'published' | 'archived';

// Creative asset — supports both file_url and file_path.
export interface CreativeAsset {
  id: string;
  brand_id: string;
  content_item_id: string | null;  // optional FK to content_items
  campaign_id: string | null;      // optional FK to campaigns
  asset_type: string;
  title: string;
  file_url: string | null;
  file_path: string | null;
  mime_type: string | null;
  generation_source: string | null;
  status: CreativeAssetStatus;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type GenerationJobStatus =
  | 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'cancelled';

export interface CreativeGenerationJob {
  id: string;
  brand_id: string;
  content_item_id: string | null;  // optional FK to content_items
  campaign_id: string | null;      // optional FK to campaigns
  target_asset_type: string;
  prompt_text: string | null;
  tool_name: string | null;
  status: GenerationJobStatus;
  requested_by_agent: string | null;
  executed_by_agent: string | null;
  output_asset_id: string | null;  // optional FK to creative_assets
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Rebuild 3 V2 tables — Publishing Module ───────────────────────────────────
// Source of truth: CTO-provided schema (ARM-105, 2026-04-29).

// credentials — secret/access metadata reference layer; never exposes raw secrets.
// Replaces V1 brand_credentials.
export type CredentialStatus = 'active' | 'expired' | 'revoked';

export interface Credential {
  id: string;
  brand_id: string;
  platform: string;
  credential_type: string;
  account_identifier: string | null;
  secret_ref: string | null;        // pointer only — no raw secret in UI
  status: CredentialStatus;
  expires_at: string | null;
  last_verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// platform_accounts — owned platform accounts/pages/profiles for a brand.
export interface PlatformAccount {
  id: string;
  brand_id: string;
  platform: string;
  account_name: string;
  account_handle: string | null;
  external_account_id: string | null;
  credential_id: string | null;     // FK → credentials(id)
  is_primary: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// posts (V2) — unified publishing object; replaces V1 posts and social_posts.
// Queue view: posts WHERE status IN ('queued','scheduled','publishing') + optionally 'failed'.
export type PostV2Status =
  | 'draft' | 'queued' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export type PostApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface PostV2 {
  id: string;
  brand_id: string;
  content_item_id: string | null;       // FK → content_items(id)
  platform: string;
  status: PostV2Status;
  scheduled_for: string | null;
  published_at: string | null;
  approval_status: PostApprovalStatus;
  external_post_id: string | null;
  published_by_agent: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  platform_account_id: string | null;   // FK → platform_accounts(id)
}

// publishing_schedules — schedule definitions per brand and platform.
// cadence_type: one_off | daily | weekly | monthly | custom
// recurrence_rule: RRULE-style or internal recurrence string
export type CadenceType = 'one_off' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface PublishingSchedule {
  id: string;
  brand_id: string;
  platform: string;
  name: string;
  timezone: string;
  cadence_type: CadenceType;
  recurrence_rule: string | null;
  preferred_times: string[];            // JSON array of time strings
  content_types: string[];              // JSON array of content type strings
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// publish_attempts — per-attempt diagnostic log; read-only in the webapp.
// Written by the publishing agent only.
export type PublishAttemptStatus =
  | 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'blocked' | 'cancelled';

export interface PublishAttempt {
  id: string;
  post_id: string;                      // FK → posts(id)
  platform_account_id: string | null;   // FK → platform_accounts(id)
  attempt_number: number;
  status: PublishAttemptStatus;
  initiated_by_agent: string | null;
  executed_by_agent: string | null;
  external_post_id: string | null;
  response_code: string | null;
  response_message: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Rebuild 4 V2 tables — Inbox + CRM Module ─────────────────────────────────
// Source of truth: CTO-provided schema (ARM-105, 2026-04-29).

// customer_records — brand-scoped CRM record.
// No uniqueness guarantee on email; no auto-merge/dedup.
export interface CustomerRecord {
  id: string;
  brand_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  booking_count: number;
  last_interaction_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// customer_notes — internal CRM notes attached to a customer.
export interface CustomerNote {
  id: string;
  customer_record_id: string;
  note_text: string;
  created_by_agent: string | null;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// enquiries — intake/routing object for inbound requests.
export type EnquiryStatus =
  | 'new' | 'triaged' | 'routed' | 'responded' | 'blocked' | 'closed';

export interface Enquiry {
  id: string;
  brand_id: string;
  customer_record_id: string | null;
  channel: string;
  subject: string | null;
  message_body: string | null;
  enquiry_type: string | null;
  status: EnquiryStatus;
  assigned_to_agent: string | null;
  handled_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// conversation_threads — container for ongoing communication history.
// enquiry_id is nullable; an enquiry may have zero, one, or multiple threads.
export type ConversationThreadStatus =
  | 'open' | 'waiting' | 'escalated' | 'resolved' | 'closed';

export interface ConversationThread {
  id: string;
  brand_id: string;
  customer_record_id: string | null;
  enquiry_id: string | null;           // FK → enquiries(id); nullable
  channel: string;
  subject: string | null;
  status: ConversationThreadStatus;
  assigned_to_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// messages — inbound/outbound/internal messages within a thread.
// Sender/recipient are flexible text fields; no hard FK to customer_records.
export type MessageDirection = 'inbound' | 'outbound' | 'internal';

export type MessageStatus = 'logged' | 'drafted' | 'sent' | 'failed' | 'received';

export interface Message {
  id: string;
  thread_id: string;
  direction: MessageDirection;
  sender_name: string | null;
  sender_address: string | null;
  recipient_name: string | null;
  recipient_address: string | null;
  message_text: string;
  sent_by_agent: string | null;
  status: MessageStatus;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// social_interactions — public/social platform events (comments, mentions, DMs).
// linked_thread_id: optional linkage; not forced by schema (product workflow decision).
export type SocialInteractionStatus =
  | 'new' | 'triaged' | 'responded' | 'escalated' | 'closed';

export interface SocialInteraction {
  id: string;
  brand_id: string;
  platform: string;
  platform_account_id: string | null;
  interaction_type: string;
  external_interaction_id: string | null;
  author_name: string | null;
  author_handle: string | null;
  interaction_text: string | null;
  status: SocialInteractionStatus;
  linked_thread_id: string | null;     // optional FK → conversation_threads(id)
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// reply_drafts — drafted replies before send/approval.
// May be linked to a thread or a social_interaction (or both per workflow).
export type ReplyDraftStatus =
  | 'draft' | 'in_review' | 'approved' | 'rejected' | 'sent';

export interface ReplyDraft {
  id: string;
  brand_id: string;
  thread_id: string | null;
  social_interaction_id: string | null;
  draft_text: string;
  reply_channel: string;
  status: ReplyDraftStatus;
  created_by_agent: string | null;
  approved_by_agent: string | null;
  sent_message_id: string | null;      // FK → messages(id) once sent
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Rebuild 5 — Bookings, Calendar Events & Staff Notifications
// ============================================================

export type BookingStatus =
  | 'pending' | 'confirmed' | 'completed'
  | 'cancelled' | 'refunded' | 'disputed';

export interface Booking {
  id: string;
  brand_id: string;
  customer_record_id: string | null;
  booking_reference: string | null;
  status: BookingStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  notes: string | null;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  event_text: string | null;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BookingLineItem {
  id: string;
  booking_id: string;
  item_type: string;
  item_name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled' | 'tentative';

export interface CalendarEvent {
  id: string;
  brand_id: string;
  booking_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  status: CalendarEventStatus;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type StaffNotificationStatus = 'pending' | 'sent' | 'failed' | 'blocked' | 'cancelled';

export interface StaffNotification {
  id: string;
  brand_id: string;
  brand_staff_contact_id: string | null;
  related_entity_type: string;
  related_entity_id: string | null;
  channel: string;
  subject: string | null;
  message_text: string;
  status: StaffNotificationStatus;
  created_by_agent: string | null;
  sent_by_agent: string | null;
  sent_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Rebuild 6 — Inventory, Sales Records & Reports Center
// ============================================================

export type InventoryItemStatus = 'active' | 'inactive' | 'archived' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  brand_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  status: InventoryItemStatus;
  current_stock: number;
  low_stock_threshold: number | null;
  unit_price: number | null;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  brand_id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity_delta: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type InventoryAlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface InventoryAlert {
  id: string;
  brand_id: string;
  inventory_item_id: string;
  alert_type: string;
  status: InventoryAlertStatus;
  triggered_at: string | null;
  resolved_at: string | null;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SalesRecord {
  id: string;
  brand_id: string;
  customer_record_id: string | null;
  booking_id: string | null;
  reference: string | null;
  total_amount: number | null;
  currency: string;
  notes: string | null;
  created_by_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AnalysisReportStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AnalysisReport {
  id: string;
  brand_id: string;
  report_type: string;
  title: string;
  summary_text: string | null;
  report_data: Record<string, unknown> | null;
  generated_by_agent: string | null;
  status: AnalysisReportStatus;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Rebuild 7 — Data Sources + Sports Automation
// ============================================================

export type DataSourceStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';

export interface DataSource {
  id: string;
  brand_id: string;
  name: string;
  source_type: string;
  source_purpose: string | null;
  provider: string;
  credential_id: string | null;
  status: DataSourceStatus;
  base_url: string | null;
  priority: number;
  is_primary: boolean;
  config: Record<string, unknown>;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DataSourceRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface DataSourceRun {
  id: string;
  brand_id: string;
  data_source_id: string;
  run_type: string;
  status: DataSourceRunStatus;
  started_at: string | null;
  finished_at: string | null;
  records_received: number;
  records_processed: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DataSourceRecord {
  id: string;
  brand_id: string;
  data_source_id: string;
  run_id: string | null;
  external_record_type: string;
  external_id: string | null;
  payload: Record<string, unknown>;
  normalized_table: string | null;
  normalized_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SportsCompetition {
  id: string;
  brand_id: string;
  data_source_id: string | null;
  external_id: string | null;
  name: string;
  country: string | null;
  season_label: string | null;
  logo_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SportsTeam {
  id: string;
  brand_id: string;
  data_source_id: string | null;
  external_id: string | null;
  name: string;
  short_name: string | null;
  slug: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SportsFixtureStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';

export interface SportsFixture {
  id: string;
  brand_id: string;
  data_source_id: string | null;
  external_id: string | null;
  competition_id: string | null;
  season: string | null;
  round_name: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  venue_name: string | null;
  kickoff_at: string | null;
  timezone: string;
  status: SportsFixtureStatus;
  home_score: number | null;
  away_score: number | null;
  result_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SportsFixtureEvent {
  id: string;
  brand_id: string;
  fixture_id: string;
  event_type: string;
  minute: number | null;
  team_id: string | null;
  player_name: string | null;
  assist_player_name: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SportsStanding {
  id: string;
  brand_id: string;
  data_source_id: string | null;
  competition_id: string | null;
  team_id: string | null;
  position: number | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goals_for: number | null;
  goals_against: number | null;
  goal_difference: number | null;
  points: number | null;
  form: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContentAutomationRule {
  id: string;
  brand_id: string;
  name: string;
  trigger_type: string;
  source_type: string;
  template_id: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Rebuild 9 — Observability & Error Tracking ───────────────────────────────

export type SystemErrorSeverity = 'info' | 'warn' | 'error';
/** @deprecated Use SystemErrorSeverity */
export type ErrorSeverity = SystemErrorSeverity;

export type SystemErrorStatus = 'unresolved' | 'acknowledged' | 'resolved';

export type SystemHealthStatus = 'healthy' | 'degraded' | 'down';
/** @deprecated Use SystemHealthStatus */
export type HealthStatus = SystemHealthStatus;

export type SystemAlertSeverity = 'info' | 'warn' | 'critical';
export type SystemAlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface SystemErrorLog {
  id: string;
  service: string;
  context_tag: string;
  severity: SystemErrorSeverity;
  message: string;
  stack_trace: string | null;
  brand_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemHealthCheck {
  id: string;
  service: string;
  status: SystemHealthStatus;
  response_time_ms: number | null;
  message: string | null;
  metadata: Record<string, unknown>;
  checked_at: string;
}

export interface SystemAlert {
  id: string;
  service: string;
  severity: SystemAlertSeverity;
  status: SystemAlertStatus;
  title: string;
  message: string;
  brand_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

// ── Rebuild 10 — Usage, Token & Cost Control ──────────────────────────────────

export type UsageFeatureType =
  | 'automation_rule_eval'
  | 'data_ingestion'
  | 'poster_generation'
  | 'social_publish'
  | 'report_generation'
  | 'content_generation'
  | 'inbox_draft';

export type UsageExecutionSource =
  | 'scheduler_cron'
  | 'api_trigger'
  | 'agent_api'
  | 'user_action';

export type UsageEventStatus =
  | 'success'
  | 'failed'
  | 'skipped'
  | 'blocked_by_budget'
  | 'partial';

export type UsageCacheStatus = 'miss' | 'hit' | 'bypass' | 'error' | 'write_failed';

export type UsageModelTier = 'free' | 'basic' | 'standard' | 'premium';

export type UsageBudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export type UsageCacheEntryStatus = 'active' | 'expired' | 'invalidated';

export interface UsageBudget {
  id: string;
  brand_id: string | null;
  feature_type: UsageFeatureType;
  period: UsageBudgetPeriod;
  currency: string;
  soft_limit_usd: number | null;
  hard_limit_usd: number | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UsageEvent {
  id: string;
  brand_id: string | null;
  feature_type: UsageFeatureType;
  execution_source: UsageExecutionSource;
  model_name: string | null;
  model_tier: UsageModelTier;
  prompt_version: string | null;
  context_hash: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  tokens_total: number | null;
  cost_estimate_usd: number | null;
  cost_actual_usd: number | null;
  cache_status: UsageCacheStatus;
  entity_type: string | null;
  entity_id: string | null;
  status: UsageEventStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageCacheEntry {
  id: string;
  brand_id: string | null;
  feature_type: UsageFeatureType;
  cache_key: string;
  payload: Record<string, unknown>;
  status: UsageCacheEntryStatus;
  hit_count: number;
  expires_at: string | null;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
}
