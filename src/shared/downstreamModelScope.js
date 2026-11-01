import { getBrand, getAllBrandNames } from './modelBrand.js';

// Explicit text/coding names only. Unknown aliases and new modality suffixes stay denied.
// Keep this one rule shared by catalogue filtering and request/dispatch authorization.
export function isModelAllowedForScope(model, scope) {
  if (scope == null || scope === 'all') return true;
  if (typeof scope === 'string' && scope.startsWith('brand:')) {
    if (!isValidModelScope(scope)) return false;
    return (getBrand(model)?.name ?? '__other__') === scope.slice(6);
  }
  if (scope !== 'codex') return false;
  const name = model.trim().toLowerCase();
  return /^codex(?:-(?:mini|latest|auto-review))*$/.test(name)
    || /^gpt-(?:[5-9]|[1-9]\d+)(?:\.\d+)*(?:-(?:codex|mini|nano|max|pro|chat|latest|preview|spark|sol|terra|astra|luna|\d{2,4}))*$/.test(name);
}

export function isValidModelScope(scope) {
  return scope === 'all' || scope === 'codex'
    || (typeof scope === 'string' && scope.startsWith('brand:')
      && (scope === 'brand:__other__' || getAllBrandNames().includes(scope.slice(6))));
}

export function getModelScopeLabel(scope) {
  if (scope == null || scope === 'all') return '全部品牌';
  if (scope === 'codex') return 'Codex 专用（原配置）';
  if (!isValidModelScope(scope)) return '未知分类（禁止调用）';
  return scope === 'brand:__other__' ? '其他' : scope.slice(6);
}
