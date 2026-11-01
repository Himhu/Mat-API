export type DownstreamModelScope = 'all' | 'codex' | `brand:${string}`;
export function isModelAllowedForScope(model: string, scope?: string | null): boolean;
export function isValidModelScope(scope: unknown): boolean;
export function getModelScopeLabel(scope?: string | null): string;
