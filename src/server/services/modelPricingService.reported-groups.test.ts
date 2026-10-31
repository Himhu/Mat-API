import { describe, expect, it, vi } from 'vitest';
const { fetchMock }=vi.hoisted(()=>({fetchMock:vi.fn()}));
vi.mock('undici',()=>({fetch:fetchMock}));
vi.mock('./siteProxy.js',()=>({withSiteProxyRequestInit:async (_url:string,init:unknown)=>init}));
import { fetchModelPricingCatalog } from './modelPricingService.js';
describe('reported upstream ratios',()=>{
  it('does not present fallback defaults as upstream rates and preserves explicit zero',async()=>{
    fetchMock.mockResolvedValue(new Response(JSON.stringify({data:[{model_name:'gpt-test',quota_type:0,model_ratio:1,completion_ratio:1,enable_groups:['default','free','VIP']}],group_ratio:{free:0,VIP:'0.8',bad:'oops'}}),{status:200}));
    const catalog=await fetchModelPricingCatalog({site:{id:321,url:'https://pricing.example.com',platform:'new-api'},account:{id:432},modelName:'gpt-test'});
    expect(catalog?.reportedGroupRatio).toEqual({free:0,VIP:0.8});
    expect(catalog?.groupRatio.default).toBe(1);
  });
});
