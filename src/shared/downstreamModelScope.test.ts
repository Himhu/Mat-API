import { describe, expect, it } from 'vitest';
import { isModelAllowedForScope } from './downstreamModelScope.js';

describe('Codex model scope', () => {
  it('allows explicit coding/text model families and rejects other modalities and unknown aliases', () => {
    for (const name of ['gpt-5', 'gpt-5.4', 'gpt-5.1-codex-max', 'gpt-5.6-sol', 'gpt-6-astra', 'gpt-6.1-sol', 'codex-mini-latest', 'codex-auto-review']) {
      expect(isModelAllowedForScope(name, 'codex'), name).toBe(true);
    }
    for (const name of ['claude-opus-4-6', 'grok-4.5', 'gemini-3-pro', 'gpt-image-2', 'gpt-5-audio', 'gpt-5-realtime', 'gpt-5-claude', 'codex-claude', 'my-codex', 'VIP', '*', 're:.*', '']) {
      expect(isModelAllowedForScope(name, 'codex'), name).toBe(false);
    }
    expect(isModelAllowedForScope('claude-opus-4-6', 'all')).toBe(true);
    expect(isModelAllowedForScope('claude-opus-4-6', undefined)).toBe(true);
    expect(isModelAllowedForScope('gpt-5.4', 'corrupt')).toBe(false);
  });
});
