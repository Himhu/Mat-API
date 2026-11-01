export type DownstreamModelScope = 'all' | 'codex';
export function isModelAllowedForScope(model: string, scope?: string | null): boolean;
