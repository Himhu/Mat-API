import React, { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../api.js';
import './UpstreamGroupSelector.css';

export type UpstreamGroupRef = { siteId: number; group: string };
export type UpstreamGroupOption = UpstreamGroupRef & {
  siteName: string;
  ratios: number[];
  hasUnknownRatio: boolean;
  credentialCount: number;
  models: string[];
};
const groupKey = (row: UpstreamGroupRef) => JSON.stringify([row.siteId, row.group]);

export default function UpstreamGroupSelector({ value, onChange, allowUnrestricted }: {
  value: UpstreamGroupRef[] | null;
  onChange: (value: UpstreamGroupRef[] | null) => void;
  allowUnrestricted: boolean;
}) {
  const [items, setItems] = useState<UpstreamGroupOption[]>([]);
  const [unknown, setUnknown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.resolve().then(() => api.getDownstreamUpstreamGroups()).then(result => {
      if (cancelled) return;
      setItems(result.items);
      setUnknown(result.unknownCredentialCount);
    }).catch(err => {
      if (!cancelled) setError(err?.message || '上游分组加载失败');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [revision]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    searchRef.current?.focus();
    const closeOutside = (event: Event) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, [open]);

  const selected = new Set((value || []).map(groupKey));
  const missing = (value || []).filter(row => !items.some(item => groupKey(item) === groupKey(row)));
  const siteOptions = new Map<number, string>();
  for (const row of items) siteOptions.set(row.siteId, row.siteName);
  for (const row of value || []) {
    if (!siteOptions.has(row.siteId)) siteOptions.set(row.siteId, `站点 #${row.siteId}（当前不可用）`);
  }
  // A refreshed catalogue can remove a site; fall back to viewing all without changing authorization.
  const activeSite = siteFilter === 'all' || siteOptions.has(Number(siteFilter)) ? siteFilter : 'all';
  const matchesSite = (row: UpstreamGroupRef) => activeSite === 'all' || String(row.siteId) === activeSite;
  const visible = items.filter(row => matchesSite(row) && `${row.siteName} ${row.group}`.toLowerCase().includes(search.trim().toLowerCase()));
  const visibleMissing = missing.filter(matchesSite);
  const visibleSelected = (value || []).filter(matchesSite);
  const sites = new Map<number, { name: string; groups: UpstreamGroupOption[] }>();
  for (const row of visible) {
    if (!sites.has(row.siteId)) sites.set(row.siteId, { name: row.siteName, groups: [] });
    sites.get(row.siteId)!.groups.push(row);
  }
  const first = visibleSelected[0];
  const firstOption = first && items.find(item => groupKey(item) === groupKey(first));
  const summary = first ? `${firstOption?.siteName || `站点 #${first.siteId}`} / ${first.group}` : '请选择上游分组，可多选';
  const toggle = (row: UpstreamGroupRef, checked: boolean) => onChange(checked
    ? [...(value || []).filter(item => groupKey(item) !== groupKey(row)), { siteId: row.siteId, group: row.group }]
    : (value || []).filter(item => groupKey(item) !== groupKey(row)));
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <section className="upstream-group-selector" aria-label="上游分组渠道">
      <div className="upstream-group-heading">
        <span className="downstream-key-modal-label">上游分组渠道</span>
        {allowUnrestricted && (
          <label className="upstream-group-scope">
            <input type="checkbox" aria-label="仅使用所选上游分组" checked={value !== null}
              onChange={e => { setOpen(false); onChange(e.target.checked ? [] : null); }} />
            限定分组
          </label>
        )}
      </div>
      {value === null ? (
        <div className="upstream-group-note">沿用原有范围，不限制上游分组。开启「限定分组」后可选择。</div>
      ) : (
        <>
        <label className="upstream-group-site-filter">
          <span className="downstream-key-modal-label">站点</span>
          <select aria-label="按站点筛选上游分组" value={activeSite} onChange={event => {
            setSiteFilter(event.target.value);
            setSearch('');
            setOpen(false);
          }}>
            <option value="all">全部站点（{siteOptions.size}）</option>
            {[...siteOptions].map(([siteId, name]) => (
              <option key={siteId} value={String(siteId)}>{name}{[...siteOptions.values()].filter(candidate => candidate === name).length > 1 ? ` · #${siteId}` : ''}</option>
            ))}
          </select>
        </label>
        <div ref={rootRef} className="upstream-group-dropdown" onKeyDown={event => {
          if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); }
        }}>
          <button ref={triggerRef} type="button" className={`upstream-group-trigger ${open ? 'is-open' : ''}`}
            aria-label="选择上游分组" aria-expanded={open} aria-controls={panelId}
            onClick={() => { setSearch(''); setOpen(previous => !previous); }}>
            <span className={`upstream-group-summary ${first ? '' : 'is-placeholder'}`}>{summary}</span>
            {visibleSelected.length > 0 && <span className="upstream-group-count">已选 {visibleSelected.length}</span>}
            <span className="upstream-group-chevron" aria-hidden="true" />
          </button>
          {open && (
            <div id={panelId} role="region" aria-label="可选上游分组" className="upstream-group-panel">
              <div className="upstream-group-toolbar">
                <input ref={searchRef} className="upstream-group-search" aria-label="搜索上游分组"
                  placeholder="搜索站点或分组" value={search} onChange={e => setSearch(e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm" disabled={loading}
                  onClick={() => setRevision(n => n + 1)}>{loading ? '加载中…' : '刷新'}</button>
              </div>
              <div className="upstream-group-options" aria-busy={loading}>
                {loading && items.length === 0 && <div className="upstream-group-empty" role="status">正在加载上游分组…</div>}
                {[...sites].map(([siteId, site]) => (
                  <fieldset key={siteId} className="upstream-group-site">
                    <legend>{site.name}</legend>
                    {site.groups.map(row => (
                      <label key={groupKey(row)} className={`upstream-group-option ${selected.has(groupKey(row)) ? 'is-selected' : ''}`}>
                        <input type="checkbox" aria-label={`选择 ${row.siteName} / ${row.group}`}
                          checked={selected.has(groupKey(row))} onChange={e => toggle(row, e.target.checked)} />
                        <span className="upstream-group-identity">
                          <span className="upstream-group-name">{row.group}</span>
                          <span className="upstream-group-meta">{row.credentialCount} 个可用密钥{row.models.length > 0 ? ` · ${row.models.length} 个模型` : ''}</span>
                        </span>
                        <span className={`upstream-group-ratio ${row.ratios.length ? '' : 'is-unknown'}`}>
                          {row.ratios.length ? row.ratios.map(r => `${r} 倍`).join(' / ') : '倍率未知'}
                          {row.hasUnknownRatio && row.ratios.length > 0 && <small>部分未知</small>}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
                {!loading && !visible.length && <div className="upstream-group-empty">
                  {error ? '列表加载失败，请刷新重试。' : search.trim() ? '没有匹配的分组，请尝试其他关键词。' : '暂无可选分组，请先在连接管理中同步上游令牌及分组。'}
                </div>}
                {visibleMissing.length > 0 && <div className="upstream-group-missing">
                  <div className="upstream-group-meta">已选分组 · {loading ? '核对中' : error ? '暂无法核对' : '当前不可用'}</div>
                  {visibleMissing.map(row => <div key={groupKey(row)} className="upstream-group-missing-row">
                    <span>站点 #{row.siteId} / {row.group}</span>
                    <button type="button" className="btn btn-ghost btn-sm" aria-label={`移除 站点 #${row.siteId} / ${row.group}`}
                      onClick={() => toggle(row, false)}>移除</button>
                  </div>)}
                </div>}
              </div>
              <div className="upstream-group-panel-footer">
                <span aria-live="polite">共选 {value.length} 个分组{activeSite !== 'all' ? ` · 本站 ${visibleSelected.length} 个` : ''}</span>
                <button type="button" className="btn btn-primary btn-sm" onClick={close}>完成选择</button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
      {value !== null && <div className="upstream-group-note" aria-live="polite">
        {value.length > 0 ? `共选 ${value.length} 个分组，来自 ${new Set(value.map(row => row.siteId)).size} 个站点。` : '可切换站点选择多个分组。'}切换站点保留已选项。
      </div>}
      {value !== null && !loading && !error && missing.length > 0 && <div className="upstream-group-warning">{missing.length} 个已选分组当前不可用，请展开查看。</div>}
      {error && <div className="upstream-group-error" role="alert">分组信息加载失败，请展开后刷新重试。</div>}
      <details className="upstream-group-details">
        <summary>倍率与分组说明{unknown > 0 ? ` · ${unknown} 个密钥分组未确认` : ''}</summary>
        <p>倍率来自上游价格目录；不同站点的模型基础价格可能不同，实际费用以上游账单为准。</p>
        <p>未选择分组时不允许调用。分组失效后不会切换到其他分组。</p>
        {unknown > 0 && <p>另有 {unknown} 个密钥的分组未确认，请在连接管理中同步。只有 API Key 且无法确认分组的连接不会自动归入 default。</p>}
      </details>
    </section>
  );
}
