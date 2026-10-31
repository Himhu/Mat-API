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
    const first=root!.root.findByProps({'aria-label':'选择 A / VIP'});
    await act(async()=>first.props.onChange({target:{checked:true}}));
    expect(onChange).toHaveBeenCalledWith([{siteId:1,group:'VIP'}]);
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
    await act(async()=>root!.update(<UpstreamGroupSelector value={null} onChange={onChange} allowUnrestricted/>));
    expect(root!.root.findByProps({'aria-label':'仅使用所选上游分组'}).props.checked).toBe(false);
    await act(async()=>root!.unmount());
  });
});
