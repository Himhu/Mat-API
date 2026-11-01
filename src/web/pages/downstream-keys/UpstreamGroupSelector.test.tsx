import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
const { load } = vi.hoisted(() => ({load:vi.fn()}));
vi.mock('../../api.js', () => ({api:{getDownstreamUpstreamGroups:load}}));
import UpstreamGroupSelector from './UpstreamGroupSelector.js';
describe('upstream group selector', () => {
  it('selects actual site/group pairs and distinguishes unknown ratios', async () => {
    load.mockResolvedValue({items:[{siteId:1,siteName:'A',group:'VIP',ratios:[0.8],hasUnknownRatio:false,credentialCount:2,models:['gpt']},{siteId:2,siteName:'B',group:'VIP',ratios:[],hasUnknownRatio:true,credentialCount:1,models:[]}],unknownCredentialCount:1});
    const onChange=vi.fn();let root:ReturnType<typeof create>;
    await act(async()=>{root=create(<UpstreamGroupSelector value={[]} onChange={onChange} allowUnrestricted={false}/>);});
    expect(root!.root.findAllByProps({'aria-label':'搜索上游分组'})).toHaveLength(0);
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    const first=root!.root.findByProps({'aria-label':'选择 A / VIP'});
    await act(async()=>first.props.onChange({target:{checked:true}}));
    expect(onChange).toHaveBeenCalledWith([{siteId:1,group:'VIP'}]);
    expect(root!.root.findByProps({'aria-label':'选择上游分组'}).props['aria-expanded']).toBe(true);
    expect(JSON.stringify(root!.toJSON())).toContain('0.8 倍');
    expect(JSON.stringify(root!.toJSON())).toContain('倍率未知');
    await act(async()=>root!.unmount());
  });
  it('preserves removed selections and legacy unrestricted state until explicitly changed', async () => {
    load.mockResolvedValue({items:[],unknownCredentialCount:0});
    const onChange=vi.fn();let root:ReturnType<typeof create>;
    await act(async()=>{root=create(<UpstreamGroupSelector value={[{siteId:99,group:'old'}]} onChange={onChange} allowUnrestricted/>);});
    expect(JSON.stringify(root!.toJSON())).toContain('不可用');
    expect(onChange).not.toHaveBeenCalled();
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    expect(JSON.stringify(root!.toJSON())).toContain('old');
    await act(async()=>root!.update(<UpstreamGroupSelector value={null} onChange={onChange} allowUnrestricted/>));
    expect(root!.root.findByProps({'aria-label':'仅使用所选上游分组'}).props.checked).toBe(false);
    await act(async()=>root!.unmount());
  });
  it('keeps selected groups while searching and closes on Escape', async () => {
    load.mockResolvedValue({items:[{siteId:1,siteName:'A',group:'VIP',ratios:[0.8],hasUnknownRatio:false,credentialCount:1,models:[]}],unknownCredentialCount:0});
    const onChange=vi.fn(); let root:ReturnType<typeof create>;
    await act(async()=>{root=create(<UpstreamGroupSelector value={[{siteId:1,group:'VIP'}]} onChange={onChange} allowUnrestricted={false}/>);});
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    await act(async()=>root!.root.findByProps({'aria-label':'搜索上游分组'}).props.onChange({target:{value:'missing'}}));
    expect(root!.root.findAllByProps({'aria-label':'选择 A / VIP'})).toHaveLength(0);
    expect(JSON.stringify(root!.toJSON())).toContain('没有匹配的分组');
    expect(onChange).not.toHaveBeenCalled();
    await act(async()=>root!.root.findByProps({className:'upstream-group-dropdown'}).props.onKeyDown({key:'Escape',preventDefault:vi.fn(),stopPropagation:vi.fn()}));
    expect(root!.root.findByProps({'aria-label':'选择上游分组'}).props['aria-expanded']).toBe(false);
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    expect(root!.root.findByProps({'aria-label':'搜索上游分组'}).props.value).toBe('');
    expect(root!.root.findByProps({'aria-label':'选择 A / VIP'}).props.checked).toBe(true);
    await act(async()=>root!.unmount());
  });

  it('filters by site ID and preserves selections across sites, searches and missing groups', async () => {
    load.mockResolvedValue({items:[1,2].map(siteId=>({siteId,siteName:'同名站点',group:'VIP',ratios:[1],hasUnknownRatio:false,credentialCount:1,models:[]})),unknownCredentialCount:0});
    const onChange=vi.fn(); let root:ReturnType<typeof create>;
    const value=[{siteId:1,group:'VIP'},{siteId:99,group:'old'}];
    await act(async()=>{root=create(<UpstreamGroupSelector value={value} onChange={onChange} allowUnrestricted={false}/>);});
    const filter=()=>root!.root.findByProps({'aria-label':'按站点筛选上游分组'});
    await act(async()=>filter().props.onChange({target:{value:'2'}}));
    expect(onChange).not.toHaveBeenCalled();
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    const choices=root!.root.findAllByType('input').filter(n=>n.props.type==='checkbox');
    expect(choices).toHaveLength(1);
    expect(choices[0].props.checked).toBe(false);
    await act(async()=>choices[0].props.onChange({target:{checked:true}}));
    expect(onChange).toHaveBeenLastCalledWith([...value,{siteId:2,group:'VIP'}]);
    await act(async()=>root!.root.findByProps({'aria-label':'搜索上游分组'}).props.onChange({target:{value:'missing'}}));
    await act(async()=>filter().props.onChange({target:{value:'1'}}));
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    expect(root!.root.findByProps({'aria-label':'搜索上游分组'}).props.value).toBe('');
    expect(root!.root.findByProps({'aria-label':'选择 同名站点 / VIP'}).props.checked).toBe(true);
    await act(async()=>filter().props.onChange({target:{value:'99'}}));
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    expect(root!.root.findByProps({'aria-label':'移除 站点 #99 / old'})).toBeTruthy();
    await act(async()=>root!.unmount());
  });

  it.each([['codex', ['all','1'], ['选择 A / GPT']], ['brand:OpenAI', ['all','1','2'], ['选择 A / GPT','选择 Image / images']], ['brand:Anthropic', ['all','1'], ['选择 A / Claude']]])('filters groups and sites for %s', async (modelScope, sites, groups) => {
    load.mockResolvedValue({items:[
      {siteId:1,siteName:'A',group:'GPT',ratios:[],hasUnknownRatio:true,credentialCount:1,models:['gpt-6.1-sol']},
      {siteId:1,siteName:'A',group:'Claude',ratios:[],hasUnknownRatio:true,credentialCount:1,models:['claude-opus-4-6']},
      {siteId:2,siteName:'Image',group:'images',ratios:[1],hasUnknownRatio:false,credentialCount:1,models:['gpt-image-2']},
      {siteId:3,siteName:'Unknown',group:'Codex by name only',ratios:[],hasUnknownRatio:true,credentialCount:1,models:[]},
    ],unknownCredentialCount:0});
    let root:ReturnType<typeof create>;
    await act(async()=>{root=create(<UpstreamGroupSelector value={[]} onChange={vi.fn()} allowUnrestricted={false} modelScope={modelScope as string}/>);});
    expect(root!.root.findAllByType('option').map(o=>o.props.value)).toEqual(sites);
    await act(async()=>root!.root.findByProps({'aria-label':'选择上游分组'}).props.onClick());
    expect(root!.root.findAllByType('input').filter(n=>n.props.type==='checkbox').map(n=>n.props['aria-label'])).toEqual(groups);
    await act(async()=>root!.unmount());
  });

});
