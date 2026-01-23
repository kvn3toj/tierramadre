/**
 * ProductViewers Types
 * Shared type definitions for product analytics components.
 */

export interface Viewer {
  name: string;
  email: string | null;
  role: string;
  isLoggedIn: boolean;
  views: number;
  firstView: string;
  lastView: string;
  devices: string[];
  browsers: string[];
  countries: string[];
}

export interface RecentView {
  timestamp: string;
  userName: string;
  userEmail: string | null;
  userRole: string;
  isLoggedIn: boolean;
  deviceType: string;
  browser: string;
  country: string;
  referrer: string | null;
}

export interface QuotedByAsesor {
  email: string;
  name: string;
  count: number;
  totalValue: number;
  firstQuote: string;
  lastQuote: string;
}

export interface RecentQuote {
  cotizacionId: string;
  asesorEmail: string;
  price: number;
  createdAt: string;
}

export interface ProductCotizaciones {
  success: boolean;
  itemNumber: number;
  productName: string | null;
  totalCotizaciones: number;
  totalValue: number;
  uniqueAsesores: number;
  quotedBy: QuotedByAsesor[];
  recentQuotes: RecentQuote[];
}

export interface ProductDetailViews {
  success: boolean;
  itemId: number;
  productName: string | null;
  totalViews: number;
  uniqueViewers: number;
  loggedInViewers: number;
  guestViewers: number;
  viewers: Viewer[];
  viewsByDate: Array<{ date: string; views: number }>;
  viewsByDevice: Record<string, number>;
  viewsByBrowser: Record<string, number>;
  viewsByCountry: Record<string, number>;
  recentViews: RecentView[];
}
