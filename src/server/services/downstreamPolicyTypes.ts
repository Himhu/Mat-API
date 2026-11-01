export type DownstreamAccountTokenCredentialRef = {
  kind: 'account_token';
  siteId: number;
  accountId: number;
  tokenId: number;
};

export type DownstreamDefaultApiKeyCredentialRef = {
  kind: 'default_api_key';
  siteId: number;
  accountId: number;
};

export type DownstreamExcludedCredentialRef =
  | DownstreamAccountTokenCredentialRef
  | DownstreamDefaultApiKeyCredentialRef;

export type DownstreamUpstreamGroup = { siteId: number; group: string };

export interface DownstreamRoutingPolicy {
  modelScope?: string;
  allowedUpstreamGroups?: DownstreamUpstreamGroup[] | null;
  supportedModels: string[];
  allowedRouteIds: number[];
  siteWeightMultipliers: Record<number, number>;
  excludedSiteIds: number[];
  excludedCredentialRefs: DownstreamExcludedCredentialRef[];
  denyAllWhenEmpty?: boolean;
}

export const EMPTY_DOWNSTREAM_ROUTING_POLICY: DownstreamRoutingPolicy = {
  supportedModels: [],
  allowedRouteIds: [],
  siteWeightMultipliers: {},
  excludedSiteIds: [],
  excludedCredentialRefs: [],
};
