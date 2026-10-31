import { eq } from 'drizzle-orm';
import { isUsableAccountToken } from './accountTokenService.js';
import { db, schema } from '../db/index.js';
import { fetchModelPricingCatalog } from './modelPricingService.js';
import { withAccountProxyOverride } from './siteProxy.js';
import { getProxyUrlFromExtraConfig } from './accountExtraConfig.js';

export type DownstreamUpstreamGroupOption = {
  siteId: number;
  siteName: string;
  group: string;
  ratios: number[];
  hasUnknownRatio: boolean;
  credentialCount: number;
  models: string[];
};

export async function listDownstreamUpstreamGroups(): Promise<{
  items: DownstreamUpstreamGroupOption[];
  unknownCredentialCount: number;
}> {
  const rows: Array<{accounts:typeof schema.accounts.$inferSelect;sites:typeof schema.sites.$inferSelect}> = await db.select().from(schema.accounts)
    .innerJoin(schema.sites, eq(schema.accounts.siteId, schema.sites.id)).all();
  const tokens: Array<typeof schema.accountTokens.$inferSelect> = await db.select().from(schema.accountTokens).all();
  const items = new Map<string, DownstreamUpstreamGroupOption>();
  let unknownCredentialCount = 0;
  const accounts = rows.filter(({accounts: a, sites: s}) => a.status === 'active' && s.status === 'active');
  let cursor = 0;
  // At most four accounts fetch pricing concurrently. Reuse the existing pricing cache.
  async function worker() {
    while (cursor < accounts.length) {
      const {accounts: account, sites: site} = accounts[cursor++];
      const accountTokens = tokens.filter((t) => t.accountId === account.id);
      const usable = accountTokens.filter(isUsableAccountToken);
      unknownCredentialCount += usable.filter((t) => !t.tokenGroupConfirmed || !t.tokenGroup?.trim()).length;
      if (account.apiToken?.trim() && !accountTokens.some((t) => t.token === account.apiToken)) unknownCredentialCount++;
      const groups = [...new Set(usable.filter(t=>t.tokenGroupConfirmed).map((t) => t.tokenGroup?.trim()).filter((g): g is string => !!g))];
      if (!groups.length) continue;
      const catalog = await withAccountProxyOverride(getProxyUrlFromExtraConfig(account.extraConfig), () => fetchModelPricingCatalog({
        site, account, modelName: '',
      })).catch(() => null);
      for (const group of groups) {
        const key = JSON.stringify([site.id, group]);
        const item: DownstreamUpstreamGroupOption = items.get(key) || {siteId:site.id, siteName:site.name, group, ratios:[],hasUnknownRatio:false,credentialCount:0,models:[]};
        const ratio = catalog?.reportedGroupRatio?.[group];
        if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio >= 0) item.ratios = [...new Set([...item.ratios, ratio])].sort((a,b)=>a-b);
        else item.hasUnknownRatio = true;
        item.credentialCount += usable.filter((t) => t.tokenGroupConfirmed && t.tokenGroup?.trim() === group).length;
        item.models = [...new Set([...item.models, ...(catalog?.models || []).filter((m) => m.enableGroups.includes(group)).map((m) => m.modelName)])].sort();
        items.set(key, item);
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(4,accounts.length)}, worker));
  return {items:[...items.values()].sort((a,b)=>a.siteId-b.siteId || a.group.localeCompare(b.group)),unknownCredentialCount};
}
