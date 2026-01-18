/**
 * Cotizacion Form Types
 * Shared prop interfaces for form components.
 */

import { TreasureItem } from '../../types';
import {
  BusinessSettings,
  ManualProductState,
  CotizacionProduct,
  CotizacionInvestment,
  CustomCost,
} from '../../hooks/useCotizacion';
import { Asesor } from '../../hooks/useAsesores';
import { RecentClient } from '../../hooks/useRecentClients';
import type { CreatorInvitation } from '../../types/creatorInvitations';

// =============================================================================
// SETTINGS
// =============================================================================

export interface SettingsAccordionProps {
  quotationNumber: string;
  setQuotationNumber: (num: string) => void;
  regenerateQuotationNumber: () => void;
  businessSettings: BusinessSettings;
  setBusinessSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;
}

// =============================================================================
// CLIENT INFO
// =============================================================================

export interface ClientInfoSectionProps {
  clientName: string;
  setClientName: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientDocument: string;
  setClientDocument: (v: string) => void;
  asesorName: string;
  setAsesorName: (v: string) => void;
  asesores: Asesor[];
  isLoadingAsesores?: boolean;
  googleUser?: { email: string; name: string } | null;
  recentClients?: RecentClient[];
  onSelectClient?: (client: RecentClient) => void;
  invitedGuests?: CreatorInvitation[];
  isLoadingInvitations?: boolean;
  onSelectInvitedGuest?: (guest: CreatorInvitation) => void;
}

// =============================================================================
// PRODUCT ENTRY
// =============================================================================

export interface ProductEntrySectionProps {
  productEntryMode: 'treasure' | 'manual';
  setProductEntryMode: (mode: 'treasure' | 'manual') => void;
  availableTreasure: TreasureItem[];
  selectedItem: TreasureItem | null;
  setSelectedItem: (item: TreasureItem | null) => void;
  handleAddProduct: () => void;
  manualProduct: ManualProductState;
  setManualProduct: React.Dispatch<React.SetStateAction<ManualProductState>>;
  handleAddManualProduct: () => void;
  quotationNumber: string;
  isUploadingImage: boolean;
  setIsUploadingImage: (v: boolean) => void;
  imagePreview: string | null;
  setImagePreview: (v: string | null) => void;
  isVideoPreview: boolean;
  setIsVideoPreview: (v: boolean) => void;
  onImageUpload: (file: File) => Promise<void>;
  canUseManualEntry?: boolean;
}

// =============================================================================
// PRODUCT LIST
// =============================================================================

export interface ProductListSectionProps {
  products: CotizacionProduct[];
  handleRemoveProduct: (id: string) => void;
}

export interface ProductThumbnailProps {
  src?: string;
  isJewelry: boolean;
  size?: number;
}

// =============================================================================
// INVESTMENT
// =============================================================================

export interface InvestmentFormSectionProps {
  investments: CotizacionInvestment[];
  handleInvestmentChange: (id: string, value: number) => void;
  handleResetInvestments: () => void;
  customCosts: CustomCost[];
  handleRemoveCustomCost: (id: string) => void;
  newCustomLabel: string;
  setNewCustomLabel: (v: string) => void;
  newCustomValue: number;
  setNewCustomValue: (v: number) => void;
  handleAddCustomCost: () => void;
  totalInvestment: number;
}

// =============================================================================
// DISCOUNT & VALIDITY
// =============================================================================

export interface DiscountValiditySectionProps {
  discountPercent: number;
  setDiscountPercent: (v: number) => void;
  validDays: number;
  setValidDays: (v: number) => void;
  notes: string;
  setNotes: (v: string) => void;
}

// =============================================================================
// ACTIONS
// =============================================================================

export interface ActionButtonsProps {
  handleExportPDF: () => void;
  handlePrint: () => void;
  handleNewQuotation: () => void;
  disabled: boolean;
}
