export type Vehicle = {
  // --- Core backend fields (source of truth) ---
  id: string;
  sellerId?: string;
  title: string;
  brand: string;
  model: string;
  year: string;
  vehicleType: string;
  bodyType?: string;
  fuelType: string;
  usageStatus?: 'Brand New' | 'Imported Used' | 'Used In Rwanda';
  mileage: string;
  transmission: string;
  color?: string;
  price: number;
  description?: string;
  location: string;
  images: string[];
  status?: 'active' | 'pending' | 'sold' | 'rejected';
  rejectionReason?: string;
  views?: number;
  createdAt?: string;
  sellerName?: string;
  sellerPhone?: string;
  verificationStatus?: 'approved' | 'pending' | 'rejected' | 'none';
  verificationScore?: number;
  sellerTier?: 'dealer_pro' | 'trusted' | 'verified' | 'basic';
  verifierType?: string;
  lastVerifiedAt?: string | null;
  verificationChecklist?: {
    identityVerified?: boolean;
    ownershipDocsVerified?: boolean;
    phoneVerified?: boolean;
    locationVerified?: boolean;
    inspectionDateAvailable?: boolean;
  };
  tierCriteria?: {
    verified?: string;
    trusted?: string;
    dealerPro?: string;
  };
  revocationRules?: string[];
  seller?: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string;
    location?: string | null;
    isVerifiedSeller?: boolean;
    verificationStatus?: 'approved' | 'pending' | 'rejected' | 'none';
    verificationScore?: number;
    sellerTier?: 'dealer_pro' | 'trusted' | 'verified' | 'basic';
    verifierType?: string;
    lastVerifiedAt?: string | null;
    verificationChecklist?: {
      identityVerified?: boolean;
      ownershipDocsVerified?: boolean;
      phoneVerified?: boolean;
      locationVerified?: boolean;
      inspectionDateAvailable?: boolean;
    };
    tierCriteria?: {
      verified?: string;
      trusted?: string;
      dealerPro?: string;
    };
    revocationRules?: string[];
  } | null;
  // --- Legacy / derived aliases (kept for screen compatibility) ---
  /** @deprecated use vehicleType */
  type?: string;
  /** @deprecated use fuelType */
  fuel?: string;
  /** @deprecated use images[0] */
  image?: string;
  postedAt?: string;
  condition?: string;
  engine?: string;
  inquiries?: number;
};
