/**
 * QuotationPreview Component
 * Renders the printable quotation document with iOS-style minimalist design.
 * Updated to use actual Tierra Madre logo and match the app's UI system.
 *
 * This is a thin orchestrator that composes the section sub-components.
 */

import { forwardRef } from 'react';
import { Box, Paper } from '@mui/material';
import {
  documentShadows,
  primitiveColors,
} from '../../../design-system/tokens';
import { brandColors, quotationStyles } from '../constants';
import {
  CotizacionProduct,
  CotizacionInvestment,
  CustomCost,
  BusinessSettings,
} from '../../../hooks/useCotizacion';

import { HeaderSection } from './HeaderSection';
import { ProductsSection } from './ProductsSection';
import { InvestmentSection } from './InvestmentSection';
import { TotalsSection } from './TotalsSection';
import { NotesSection, ValiditySection, CertificationLogosSection } from './NotesSection';
import { FooterSection } from './FooterSection';

export interface QuotationPreviewProps {
  quotationNumber: string;
  clientName: string;
  asesorName: string;
  expiryStr: string;
  notes: string;
  products: CotizacionProduct[];
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;
  businessSettings: BusinessSettings;
}

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  (props, ref) => {
    const {
      quotationNumber,
      clientName,
      asesorName,
      expiryStr,
      notes,
      products,
      investments,
      customCosts,
      totalInvestment,
      productSubtotal,
      discountPercent,
      subtotal,
      discount,
      total,
      businessSettings,
    } = props;

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: quotationStyles.surfaceMuted,
          border: `1px solid ${quotationStyles.borderLight}`,
          boxShadow: documentShadows.paper,
          minHeight: 700,
        }}
      >
        <Box
          ref={ref}
          className="quotation-preview"
          sx={{
            bgcolor: quotationStyles.surface,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              border: `1px solid ${quotationStyles.borderLight}`,
              bgcolor: quotationStyles.surface,
              boxShadow: quotationStyles.cardShadow,
            }}
          >
            {/* Emerald accent line */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${brandColors.emerald}, ${primitiveColors.emerald[400]})`,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            />

            {/* Content */}
            <Box sx={{ p: 3, pt: 4, minHeight: 650, bgcolor: quotationStyles.surface }}>
              <HeaderSection
                quotationNumber={quotationNumber}
                clientName={clientName}
                asesorName={asesorName}
              />
              <ProductsSection products={products} />
              {totalInvestment > 0 && (
                <InvestmentSection
                  investments={investments}
                  customCosts={customCosts}
                  totalInvestment={totalInvestment}
                />
              )}
              {(products.length > 0 || totalInvestment > 0) && (
                <TotalsSection
                  products={products}
                  totalInvestment={totalInvestment}
                  productSubtotal={productSubtotal}
                  discountPercent={discountPercent}
                  subtotal={subtotal}
                  discount={discount}
                  total={total}
                />
              )}
              {notes && <NotesSection notes={notes} />}
              <ValiditySection expiryStr={expiryStr} footerNote={businessSettings.footerNote} />
              <CertificationLogosSection />
              <FooterSection businessSettings={businessSettings} />
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }
);

QuotationPreview.displayName = 'QuotationPreview';

export default QuotationPreview;
