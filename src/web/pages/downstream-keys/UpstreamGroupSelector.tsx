import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export type UpstreamGroupRef = {siteId:number;group:string};
export type UpstreamGroupOption = UpstreamGroupRef & {
  siteName:string;ratios:number[];hasUnknownRatio:boolean;credentialCount:number;models:string[];
};
const groupKey = (row:UpstreamGroupRef) => JSON.stringify([row.siteId,row.group]);

export default function UpstreamGroupSelector({value,onChange,allowUnrestricted}: {
  value:UpstreamGroupRef[] | null;
  onChange:(value:UpstreamGroupRef[] | null)=>void;
  allowUnrestricted:boolean;
}) {
  const [items,setItems]=useState<UpstreamGroupOption[]>([]);
  const [unknown,setUnknown]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  const [search,setSearch]=useState('');
  useEffect(()=>{
    let cancelled=false;
    setLoading(true);setError('');
    Promise.resolve().then(()=>api.getDownstreamUpstreamGroups()).then(result=>{
      if(cancelled)return;
      setItems(result.items);setUnknown(result.unknownCredentialCount);
    }).catch(err=>{if(!cancelled)setError(err?.message || '上游分组加载失败');})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[revision]);
  const selected=new Set((value || []).map(groupKey));
  const missing=(value || []).filter(row=>!items.some(item=>groupKey(item)===groupKey(row)));
  const visible=items.filter(row=>`${row.siteName} ${row.group}`.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle=(row:UpstreamGroupRef, checked:boolean)=>onChange(checked
    ? [...(value || []),{siteId:row.siteId,group:row.group}]
    : (value || []).filter(item=>groupKey(item)!==groupKey(row)));
  return <section className="downstream-key-modal-field downstream-key-modal-field-full" aria-label="上游分组渠道" style={{border:'1px solid var(--color-border)',borderRadius:10,padding:16,display:'flex',flexDirection:'column',gap:12}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
      <div><strong>上游分组渠道</strong><div className="downstream-key-modal-help">选择实际调用的上游分组；请求与故障切换仅限所选范围。</div></div>
      <button type="button" className="btn btn-ghost" disabled={loading} onClick={()=>setRevision(n=>n+1)}>{loading?'加载中…':'刷新列表'}</button>
    </div>
    {allowUnrestricted && <label style={{display:'flex',gap:8,alignItems:'center'}}>
      <input type="checkbox" aria-label="仅使用所选上游分组" checked={value!==null} onChange={e=>onChange(e.target.checked?[]:null)}/>
      仅使用所选上游分组
    </label>}
    {value===null ? <div className="info-tip">此密钥保留原有范围，不限制上游分组。开启上方选项后，可指定允许使用的分组。</div> : <>
      <input aria-label="搜索上游分组" placeholder="搜索站点或上游分组" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
        {visible.map(row=><label key={groupKey(row)} style={{display:'flex',gap:10,padding:12,border:'1px solid var(--color-border-light)',borderRadius:8,alignItems:'flex-start',background:selected.has(groupKey(row))?'color-mix(in srgb, var(--color-primary) 7%, transparent)':'var(--color-bg-card)'}}>
          <input type="checkbox" aria-label={`选择 ${row.siteName} / ${row.group}`} checked={selected.has(groupKey(row))} onChange={e=>toggle(row,e.target.checked)} style={{marginTop:4}}/>
          <span style={{minWidth:0,flex:1}}><strong>{row.siteName} / {row.group}</strong>
            <span style={{display:'block',fontSize:12,color:'var(--color-text-muted)',marginTop:4}}>{row.credentialCount} 个可用密钥{row.models.length>0?` · 定价目录含 ${row.models.length} 个模型`:''}</span>
          </span>
          <span style={{fontWeight:600,textAlign:'right'}}>{row.ratios.length?row.ratios.map(r=>`${r} 倍`).join(' / '):'倍率未知'}{row.hasUnknownRatio&&row.ratios.length>0?<small style={{display:'block'}}>部分账号倍率未知</small>:null}</span>
        </label>)}
        {!loading&&!visible.length&&<div className="info-tip">暂无可选分组。请先在连接管理中同步上游账号的令牌及分组；只有 API Key 且无法确认分组的连接不会自动归入 default。</div>}
        {missing.map(row=><div key={groupKey(row)} style={{display:'flex',gap:8,alignItems:'center'}}><span>站点 #{row.siteId} / {row.group}（{loading?'核对中':'当前不可用'}）</span><button type="button" className="btn btn-link" onClick={()=>toggle(row,false)}>移除</button></div>)}
      </div>
      <div className="downstream-key-modal-help">已选 {value.length} 个上游分组。未选择时不允许调用；分组失效后不会转到其他分组。</div>
    </>}
    {unknown>0&&<div className="downstream-key-modal-help">另有 {unknown} 个密钥的分组未确认，请先同步上游分组信息。</div>}
    {error&&<div role="alert" style={{color:'var(--color-danger)'}}>无法加载最新分组，请重试。{error}</div>}
    <div className="downstream-key-modal-help">倍率来自上游价格目录，不是下游加价倍率；不同站点的模型基础价格可能不同，实际费用以上游账单为准。</div>
  </section>;
}
