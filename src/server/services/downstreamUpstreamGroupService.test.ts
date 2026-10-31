import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { pricing } = vi.hoisted(() => ({ pricing: vi.fn() }));
vi.mock('./modelPricingService.js', () => ({ fetchModelPricingCatalog: pricing }));
let db: typeof import('../db/index.js')['db'];
let schema: typeof import('../db/index.js')['schema'];
let list: typeof import('./downstreamUpstreamGroupService.js')['listDownstreamUpstreamGroups'];
beforeAll(async () => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'mat-api-upstream-groups-'));
  await import('../db/migrate.js');
  ({ db, schema } = await import('../db/index.js'));
  list = (await import('./downstreamUpstreamGroupService.js')).listDownstreamUpstreamGroups;
});
afterAll(() => { delete process.env.DATA_DIR; });
beforeEach(async () => { await db.delete(schema.accountTokens).run(); await db.delete(schema.accounts).run(); await db.delete(schema.sites).run(); pricing.mockReset(); });
describe('upstream group catalogue', () => {
  it('keeps sites isolated, exposes only explicit ratios, and never exposes credentials', async () => {
    for (const i of [0,1]) {
      const site = await db.insert(schema.sites).values({name:`site-${i}`,url:`https://site-${i}.example.com`,platform:'new-api',status:'active'}).returning().get();
      const account = await db.insert(schema.accounts).values({siteId:site.id,accessToken:'private-session',apiToken:'private-unknown',status:'active'}).returning().get();
      for (const group of ['VIP', null]) await db.insert(schema.accountTokens).values({accountId:account.id,name:'key',token:group?'private-key':'private-unknown',tokenGroup:group,tokenGroupConfirmed:!!group,enabled:true}).run();
    }
    pricing.mockResolvedValueOnce({groupRatio:{VIP:0.8},reportedGroupRatio:{VIP:0.8},models:[{modelName:'gpt-test',enableGroups:['VIP']}]})
      .mockResolvedValueOnce({groupRatio:{default:1},reportedGroupRatio:{},models:[]});
    const result = await list();
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({group:'VIP',ratios:[0.8],hasUnknownRatio:false,credentialCount:1,models:['gpt-test']});
    expect(result.items[1]).toMatchObject({group:'VIP',ratios:[],hasUnknownRatio:true});
    expect(result.unknownCredentialCount).toBe(2);
    expect(JSON.stringify(result)).not.toContain('private-');
  });
  it('reports unknown instead of failing the selector when pricing is unavailable', async () => {
    const site=await db.insert(schema.sites).values({name:'s',url:'https://s.example.com',platform:'new-api',status:'active'}).returning().get();
    const account=await db.insert(schema.accounts).values({siteId:site.id,accessToken:'session',status:'active'}).returning().get();
    await db.insert(schema.accountTokens).values({accountId:account.id,name:'key',token:'secret',tokenGroup:'VIP',tokenGroupConfirmed:true,enabled:true}).run();
    pricing.mockRejectedValue(new Error('unavailable'));
    expect((await list()).items[0]).toMatchObject({group:'VIP',ratios:[],hasUnknownRatio:true});
  });
  it('does not treat a legacy inferred default as a confirmed upstream group', async () => {
    const site=await db.insert(schema.sites).values({name:'legacy',url:'https://legacy.example.com',platform:'new-api',status:'active'}).returning().get();
    const account=await db.insert(schema.accounts).values({siteId:site.id,accessToken:'session',status:'active'}).returning().get();
    const {ensureDefaultTokenForAccount,syncTokensFromUpstream}=await import('./accountTokenService.js');
    await ensureDefaultTokenForAccount(account.id,'secret-default');
    expect(await list()).toEqual({items:[],unknownCredentialCount:1});
    await syncTokensFromUpstream(account.id,[{name:'default',key:'secret-default',tokenGroup:'VIP'}]);
    pricing.mockResolvedValue({models:[],reportedGroupRatio:{VIP:0.8}});
    expect((await list()).items[0]).toMatchObject({group:'VIP',credentialCount:1});
    await ensureDefaultTokenForAccount(account.id,'secret-default');
    expect((await list()).items[0].group).toBe('VIP');
    await syncTokensFromUpstream(account.id,[{name:'default',key:'secret-default'}]);
    expect(await list()).toEqual({items:[],unknownCredentialCount:1});
  });

});
