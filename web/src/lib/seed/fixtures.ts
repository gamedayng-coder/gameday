// Static demo fixture data — committed, not generated.
// Imported by both the admin seed page (server actions) and the CLI script.

export const DEMO_PROFILE = {
  industry: 'Sports',
  core_values: 'Community, passion, excellence, inclusivity',
  target_audience: 'Local supporters aged 16–45, season ticket holders, families attending matchdays',
  tone_of_voice: 'Energetic, warm, and authentic — celebratory in wins, grounded in losses',
  objectives: 'Build matchday attendance, grow social following, strengthen supporter engagement year-round',
  brand_story:
    'Founded in 1923, we have been the heartbeat of this community for over a century. Every match is a shared story — from the terraces to the training ground.',
  website: null as string | null,
  social_handles: {} as Record<string, string>,
};

export const DEMO_VOICE = {
  tone: 'Upbeat, confident, and community-first. Never corporate.',
  style: 'Short punchy sentences for social. Conversational, not formal. Use supporter-facing "we" and "our".',
  sample_copy:
    '📣 Matchday is here. Three points up for grabs — let\'s make the ground shake. See you there. 🏟️ #COYB',
  platform_guidelines:
    'Instagram: imagery-first, punchy captions under 150 chars. Twitter/X: real-time updates, emojis welcome. Facebook: slightly longer, community-focused. LinkedIn: sponsor/partnership news only.',
  dos_and_donts: null as string | null,
  competitor_differentiation: null as string | null,
};

export const DEMO_TEMPLATES = [
  {
    name: '[Demo] Matchday call-to-action',
    kind: 'caption' as const,
    platform: 'instagram' as string | null,
    poster_type: null as string | null,
    content:
      "🏟️ It's {match_day}! {home_team} vs {away_team} — kick off at {kickoff_time}.\n\nGet behind the lads and let's bring home three points. 💪\n\n#Matchday #{home_team_slug}",
    is_active: true,
  },
  {
    name: '[Demo] Result celebration',
    kind: 'caption' as const,
    platform: null,
    poster_type: null as string | null,
    content:
      "Full time: {home_team} {home_score} – {away_score} {away_team} ✅\n\n{result_summary}. Three points in the bag — see you next week! 🙌\n\n#FinalWhistle #{home_team_slug}",
    is_active: true,
  },
];

export const DEMO_AUTOMATION_RULE = {
  name: '[Demo] Weekly fixture reminder',
  trigger_type: 'scheduled',
  source_type: 'manual',
  config: {} as Record<string, unknown>,
  is_active: false,
};

export const DEMO_DATA_SOURCE = {
  name: '[Demo] Manual content feed',
  source_type: 'manual',
  source_purpose: 'Demo content source — replace with a real integration',
  provider: 'manual',
  status: 'draft' as const,
};
