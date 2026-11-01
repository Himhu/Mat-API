export interface BrandMatchContext {
  raw: string;
  cleaned: string;
  segments: string[];
  candidates: string[];
}
export interface BrandInfo {
  name: string;
  icon: string;
  color: string;
}
export type BrandMatchMode = 'includes' | 'startsWith' | 'segment' | 'boundary';
export declare function stripCommonWrappers(value: string): string;
export declare function collectBrandCandidates(modelName: string): string[];
export declare function getAllBrands(): BrandInfo[];
export declare function getAllBrandNames(): string[];
export declare function getMatchingBrands(modelName: string): BrandInfo[];
export declare function getMatchingBrandNames(modelName: string): string[];
export declare function getBrand(modelName: string): BrandInfo | null;
