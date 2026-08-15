import {
  dataScopeGuidance,
  DEFAULT_AI_DATA_SCOPE,
  DEFAULT_AI_INSIGHTS,
  DEFAULT_AI_PERSONALITY,
  DEFAULT_AI_VOICE_MODE,
  isAiDataScope,
  isAiPersonality,
  personalityGuidance,
  type AiDataScope,
  type AiPersonality,
} from '../../auth/constants/ai-settings';

type AiSettingsSource = {
  ai_personality?: string | null;
  ai_insights?: boolean | null;
  ai_data_scope?: string | null;
  ai_voice_mode?: boolean | null;
  ai_voice?: string | null;
};

/**
 * Preference block for Groq — personality, insights, and module scope.
 */
export function buildAiSettingsBlock(user: AiSettingsSource): string {
  const personality: AiPersonality = isAiPersonality(user.ai_personality)
    ? user.ai_personality
    : DEFAULT_AI_PERSONALITY;
  const insights =
    typeof user.ai_insights === 'boolean'
      ? user.ai_insights
      : DEFAULT_AI_INSIGHTS;
  const scope: AiDataScope = isAiDataScope(user.ai_data_scope)
    ? user.ai_data_scope
    : DEFAULT_AI_DATA_SCOPE;
  const voiceMode =
    typeof user.ai_voice_mode === 'boolean'
      ? user.ai_voice_mode
      : DEFAULT_AI_VOICE_MODE;

  return [
    'AI SETTINGS (signed-in user preferences — follow for this session).',
    `Personality: ${personality}`,
    personalityGuidance(personality),
    `Smart insights: ${insights ? 'on' : 'off'}`,
    insights
      ? 'When relevant, offer brief useful suggestions or analysis unprompted.'
      : 'Do not volunteer insights, tips, or unsolicited analysis — answer only what was asked.',
    `Data analysis scope: ${scope}`,
    dataScopeGuidance(scope),
    `Voice mode preference: ${voiceMode ? 'on' : 'off'} (client may speak replies; still write clear speakable sentences).`,
    user.ai_voice
      ? `Preferred TTS speaker id: ${user.ai_voice}`
      : 'Preferred TTS speaker id: austin',
  ].join('\n');
}

export function shouldIncludeWealthContext(
  scope: string | null | undefined,
): boolean {
  const resolved = isAiDataScope(scope) ? scope : DEFAULT_AI_DATA_SCOPE;
  return resolved === 'all';
}
