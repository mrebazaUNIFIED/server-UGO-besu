export interface ShareAsset {
  key: string;
  ownerAddress: string;
  ownerUserId: string;
  accounts: string[];
  name: string;
  sharedWith: string[]; // Addresses
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShareAssetRequest {
  userId: string;
  key: string;
  accounts: string[];
  name?: string;
  sharedWithAddresses: string[];
}

export interface CreateShareAssetResponse {
  success: boolean;
  data: {
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    events: any[];
  };
}

export interface UpdateShareAssetAccountsRequest {
  userId: string;
  sharedWithAddresses: string[];
}

export interface UpdateShareAssetAccountsResponse {
  success: boolean;
  data: {
    txHash: string;
    events: any[];
  };
}

export interface DisableShareAssetResponse {
  success: boolean;
  data: {
    txHash: string;
  };
}

export interface EnableShareAssetResponse {
  success: boolean;
  data: {
    txHash: string;
  };
}

export interface ReadShareAssetResponse {
  success: boolean;
  data: ShareAsset;
}

export interface QuerySharedByUserResponse {
  success: boolean;
  data: ShareAsset[];
}

export interface QuerySharedWithMeResponse {
  success: boolean;
  data: ShareAsset[];
}

export interface CheckUserAccessResponse {
  success: boolean;
  data: {
    hasAccess: boolean;
    reason: string;
  };
}

export interface QueryAllShareAssetsResponse {
  success: boolean;
  data: ShareAsset[];
}

export interface ShareAssetExistsResponse {
  success: boolean;
  data: {
    exists: boolean;
  };
}

// ==================== VAULT USER (localStorage) ====================

export interface VaultUser {
  uid: string;                    // userId único
  email: string;
  username: string;
  firstName: string;
  company: string;
}