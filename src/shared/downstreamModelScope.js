// Explicit text/coding names only. Unknown aliases and new modality suffixes stay denied.
// Keep this one rule shared by catalogue filtering and request/dispatch authorization.
export function isModelAllowedForScope(model, scope) {
  if (scope == null || scope === 'all') return true;
  if (scope !== 'codex') return false;
  const name = model.trim().toLowerCase();
  return /^codex(?:-(?:mini|latest|auto-review))*$/.test(name)
    || /^gpt-(?:[5-9]|[1-9]\d+)(?:\.\d+)*(?:-(?:codex|mini|nano|max|pro|chat|latest|preview|spark|sol|terra|astra|luna|\d{2,4}))*$/.test(name);
}
