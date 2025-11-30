import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Slider,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Button,
  Autocomplete,
  Avatar,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  Calculator,
  TrendingUp,
  Gem,
  CircleDollarSign,
  Award,
  FileCheck,
  Gift,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  RotateCcw,
  Info,
  Download,
  FileText,
  Image,
  Percent,
  DollarSign,
  ArrowUpRight,
  ShoppingBag,
  Layers,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useEmeralds } from '../hooks/useEmeralds';
import { Emerald, InventoryItem } from '../types';
import { inventoryData } from '../data/inventory';
import {
  studioColors,
  studioGradients,
  studioShadows,
  studioCardStyles,
} from './PremiumHeader';

// Investment item interface
interface InvestmentItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  unit?: string;
  unitLabel?: string;
  placeholder?: string;
}

// Pricing tier presets with brand colors
const PRICING_TIERS = [
  { factor: 2.0, margin: 50, roi: 100, label: 'Mínimo', color: '#64748B' },
  { factor: 2.5, margin: 60, roi: 150, label: 'Base', color: '#3B82F6' },
  { factor: 3.0, margin: 66.7, roi: 200, label: 'Ideal', color: studioColors.emerald },
  { factor: 3.5, margin: 71.4, roi: 250, label: 'Premium', color: studioColors.gold },
];

// Format currency in COP
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Product source type
type ProductSource = 'gallery' | 'inventory';

export default function PriceSimulator() {
  // Get emeralds from gallery
  const { emeralds } = useEmeralds();

  // Selected product from gallery or inventory
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [productSource, setProductSource] = useState<ProductSource>('gallery');

  // Multi-select mode for collections (enabled by default)
  const [multiSelectMode, setMultiSelectMode] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<(Emerald | InventoryItem)[]>([]);

  // Inventory filters
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('todas');
  const [shapeFilter, setShapeFilter] = useState<string>('all');

  // Filter inventory by status
  const statusFilteredInventory = useMemo(() => {
    if (statusFilter === 'todas') return inventoryData;
    if (statusFilter === 'disponibles') return inventoryData.filter(item => item.estado === 'DISPONIBLE');
    if (statusFilter === 'vendidas') return inventoryData.filter(item => item.estado === 'VENDIDA');
    return inventoryData;
  }, [statusFilter]);

  // Filter by product type
  const typeFilteredInventory = useMemo(() => {
    if (productTypeFilter === 'todas') return statusFilteredInventory;
    if (productTypeFilter === 'gemas') return statusFilteredInventory.filter(item => !item.isJewelry && item.cantidad === 1);
    if (productTypeFilter === 'joyas') return statusFilteredInventory.filter(item => item.isJewelry);
    if (productTypeFilter === 'lotes') return statusFilteredInventory.filter(item => !item.isJewelry && item.cantidad > 1);
    return statusFilteredInventory;
  }, [statusFilteredInventory, productTypeFilter]);

  // Get unique shapes from type-filtered inventory
  const uniqueShapes = useMemo(() => {
    const shapes = new Set(typeFilteredInventory.map(item => item.talla).filter(Boolean));
    return ['all', ...Array.from(shapes).sort()];
  }, [typeFilteredInventory]);

  // Filter inventory by shape
  const filteredInventory = useMemo(() => {
    if (shapeFilter === 'all') return typeFilteredInventory;
    return typeFilteredInventory.filter(item => item.talla === shapeFilter);
  }, [typeFilteredInventory, shapeFilter]);

  // Investment items state
  const [investments, setInvestments] = useState<InvestmentItem[]>([
    { id: 'emerald', label: 'Valor de la Esmeralda', icon: <Gem size={18} />, value: 300000, unit: 'Precio Total', unitLabel: 'precio total', placeholder: '0' },
    { id: 'gold', label: 'Oro (Estructura)', icon: <Award size={18} />, value: 0, unit: 'Precio Total', unitLabel: 'precio total', placeholder: '0' },
    { id: 'silver', label: 'Plata (Estructura)', icon: <CircleDollarSign size={18} />, value: 320000, unit: 'Precio Total', unitLabel: 'precio total', placeholder: '0' },
    { id: 'setting', label: 'Engaste', icon: <Sparkles size={18} />, value: 60000, placeholder: '0' },
    { id: 'certification', label: 'Certificación', icon: <FileCheck size={18} />, value: 0, placeholder: '0' },
    { id: 'packaging', label: 'Empaque', icon: <Gift size={18} />, value: 0, placeholder: '0' },
  ]);

  // Custom items
  const [customItems, setCustomItems] = useState<{ label: string; value: number }[]>([
    { label: 'Otro', value: 50000 },
  ]);

  // Price factor slider
  const [priceFactor, setPriceFactor] = useState(1.9);

  // Show advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Product name for quotation
  const [productName, setProductName] = useState('');

  // Export loading state
  const [isExporting, setIsExporting] = useState(false);

  // Carat weight for price per carat calculation
  const [caratWeight, setCaratWeight] = useState<number>(0);

  // Calculate total investment from multiple products
  const totalProductsValue = useMemo(() => {
    if (!multiSelectMode || selectedProducts.length === 0) return 0;

    return selectedProducts.reduce((sum, product) => {
      if ('priceCOP' in product && product.priceCOP) {
        return sum + product.priceCOP;
      }
      return sum;
    }, 0);
  }, [multiSelectMode, selectedProducts]);

  // Calculate total investment
  const totalInvestment = useMemo(() => {
    const baseTotal = investments.reduce((sum, item) => sum + item.value, 0);
    const customTotal = customItems.reduce((sum, item) => sum + item.value, 0);
    const productsTotal = multiSelectMode ? totalProductsValue : 0;
    return baseTotal + customTotal + productsTotal;
  }, [investments, customItems, multiSelectMode, totalProductsValue]);

  // Calculate pricing metrics
  const pricingMetrics = useMemo(() => {
    const salePrice = totalInvestment * priceFactor;
    const margin = ((salePrice - totalInvestment) / salePrice) * 100;
    const roi = ((salePrice - totalInvestment) / totalInvestment) * 100;
    const profit = salePrice - totalInvestment;
    const pricePerCarat = caratWeight > 0 ? salePrice / caratWeight : 0;

    return {
      salePrice,
      margin,
      roi,
      profit,
      pricePerCarat,
    };
  }, [totalInvestment, priceFactor, caratWeight]);

  // Get tier based on current factor
  const currentTier = useMemo(() => {
    return PRICING_TIERS.reduce((closest, tier) => {
      return Math.abs(tier.factor - priceFactor) < Math.abs(closest.factor - priceFactor)
        ? tier
        : closest;
    }, PRICING_TIERS[0]);
  }, [priceFactor]);

  // Update investment value
  const updateInvestment = (id: string, value: number) => {
    setInvestments(prev =>
      prev.map(item => (item.id === id ? { ...item, value } : item))
    );
  };

  // Update custom item
  const updateCustomItem = (index: number, field: 'label' | 'value', value: string | number) => {
    setCustomItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Add custom item
  const addCustomItem = () => {
    setCustomItems(prev => [...prev, { label: 'Otro', value: 0 }]);
  };

  // Reset all values
  const resetValues = () => {
    setInvestments(prev =>
      prev.map(item => ({ ...item, value: 0 }))
    );
    setCustomItems([{ label: 'Otro', value: 0 }]);
    setPriceFactor(2.5);
    setProductName('');
    setSelectedEmerald(null);
  };

  // Handle emerald selection from gallery
  const handleEmeraldSelect = (emerald: Emerald | null) => {
    if (multiSelectMode && emerald) {
      // Add to collection
      handleAddProduct(emerald);
      // Clear the input and selection to allow adding more products
      setProductName('');
      setSelectedEmerald(null);
    } else {
      setSelectedEmerald(emerald);
      setSelectedInventoryItem(null);
      setProductSource('gallery');
      if (emerald) {
        setProductName(emerald.name);

        // Load price
        if (emerald.priceCOP && emerald.priceCOP > 0) {
          updateInvestment('emerald', emerald.priceCOP);
        }

        // Set carat weight if available
        if (emerald.weightCarats) {
          setCaratWeight(emerald.weightCarats);
        }
      }
    }
  };

  // Handle inventory selection
  const handleInventorySelect = (item: InventoryItem | null) => {
    if (multiSelectMode && item) {
      // Add to collection
      handleAddProduct(item);
      // Clear the input and selection to allow adding more products
      setProductName('');
      setSelectedInventoryItem(null);
    } else {
      setSelectedInventoryItem(item);
      setSelectedEmerald(null);
      setProductSource('inventory');
      if (item) {
        setProductName(item.nombre);

        // Load price - handle both number and potential string formats
        const price = typeof item.precioCOP === 'number' ? item.precioCOP :
                     (item.precioCOP ? Number(item.precioCOP) : 0);

        if (price > 0) {
          updateInvestment('emerald', price);
        }

        // Set carat weight if available
        if (typeof item.peso === 'number') {
          setCaratWeight(item.peso);
        } else if (typeof item.peso === 'string' && !item.isJewelry) {
          // Try to parse string weight for non-jewelry items
          const parsedWeight = parseFloat(item.peso.replace(',', '.'));
          if (!isNaN(parsedWeight)) {
            setCaratWeight(parsedWeight);
          }
        }

        // Pre-fill metal cost if it's jewelry
        if (item.isJewelry && item.metalType) {
          if (item.metalType === 'Plata') {
            updateInvestment('silver', item.costoTM || 0);
          } else if (item.metalType === 'Oro 18k') {
            updateInvestment('gold', item.costoTM || 0);
          }
        }
      }
    }
  };

  // Add product to multi-select collection
  const handleAddProduct = (product: Emerald | InventoryItem) => {
    const productId = 'item' in product ? product.item : product.id;
    const isAlreadyAdded = selectedProducts.some(p =>
      ('item' in p ? p.item : p.id) === productId
    );

    if (!isAlreadyAdded) {
      setSelectedProducts(prev => [...prev, product]);
    }
  };

  // Remove product from multi-select collection
  const handleRemoveProduct = (product: Emerald | InventoryItem) => {
    const productId = 'item' in product ? product.item : product.id;
    setSelectedProducts(prev =>
      prev.filter(p => ('item' in p ? p.item : p.id) !== productId)
    );
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    if (!multiSelectMode) {
      // Entering multi-select mode
      setSelectedProducts([]);
      setProductName('Colección de Productos');
    } else {
      // Exiting multi-select mode
      setSelectedProducts([]);
    }
  };

  // Get category label in Spanish
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      loose: 'Suelta',
      ring: 'Anillo',
      pendant: 'Dije',
      earrings: 'Aretes',
    };
    return labels[category] || category;
  };

  // Export quotation as PDF with Tierra Madre branding (Catalog Style)
  const exportQuotation = async () => {
    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Brand colors (RGB)
      const emeraldGreen = [0, 174, 122];
      const gold = [212, 175, 55];
      const darkSlate = [30, 41, 59];
      const lightGray = [241, 245, 249];
      const mediumGray = [148, 163, 184];

      let y = margin;

      // ==================== PREMIUM HEADER ====================
      pdf.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
      pdf.rect(0, 0, pageWidth, 45, 'F');

      // Company name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TIERRA MADRE', margin, 20);

      // Tagline
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Esmeraldas Colombianas | Colombian Emeralds', margin, 28);

      // Quotation info box (top right)
      const quotationBoxX = pageWidth - margin - 60;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(quotationBoxX, 12, 60, 23, 2, 2, 'F');

      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const docTitle = multiSelectMode && selectedProducts.length > 0 ? 'CATÁLOGO' : 'COTIZACIÓN';
      pdf.text(docTitle, quotationBoxX + 30, 18, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const quotationNumber = `TM-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Date.now()).slice(-3)}`;
      pdf.text(`No. ${quotationNumber}`, quotationBoxX + 30, 23, { align: 'center' });

      const today = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.text(today, quotationBoxX + 30, 32, { align: 'center' });

      y = 55;

      // ==================== PRODUCT CATALOG SECTION ====================
      if (multiSelectMode && selectedProducts.length > 0) {
        // Catalog header
        pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        pdf.roundedRect(margin, y, contentWidth, 12, 3, 3, 'F');

        pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Catálogo de Productos (${selectedProducts.length} items)`, margin + 5, y + 8);

        y += 20;

        // List each product in catalog
        selectedProducts.forEach((product, index) => {
          const isInventory = 'item' in product;
          const name = isInventory ? product.nombre : product.name;
          const price = isInventory ? product.precioCOP : product.priceCOP || 0;
          const weight = isInventory
            ? (typeof product.peso === 'number' ? `${product.peso} ct` : '')
            : (product.weightCarats ? `${product.weightCarats} ct` : '');
          const category = !isInventory && product.category ? getCategoryLabel(product.category) : '';

          // Product card
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

          // Product number badge
          pdf.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
          pdf.circle(margin + 8, y + 8, 4, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}`, margin + 8, y + 9.5, { align: 'center' });

          // Product name
          pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(name, margin + 15, y + 8);

          // Product details
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
          let details = [];
          if (weight) details.push(weight);
          if (category) details.push(category);
          if (isInventory) details.push(`#${product.item}`);
          if (details.length > 0) {
            pdf.text(details.join(' • '), margin + 15, y + 14);
          }

          // Price
          pdf.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(formatCurrency(price), pageWidth - margin - 5, y + 11, { align: 'right' });

          y += 25;
        });

        y += 5;
      } else {
        // Single product section
        if (productName) {
          pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          pdf.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');

          pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text(productName, margin + 5, y + 10);

          if (caratWeight > 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
            pdf.text(`Peso: ${caratWeight} quilates`, margin + 5, y + 18);
          }

          y += 35;
        }
      }

      // ==================== INVESTMENT BREAKDOWN ====================
      pdf.setDrawColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 12;

      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detalle de Inversión', margin, y);
      y += 10;

      // Investment items
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      investments.forEach((item, index) => {
        if (item.value > 0) {
          if (index % 2 === 0) {
            pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
            pdf.rect(margin, y - 5, contentWidth, 8, 'F');
          }
          pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
          pdf.text(item.label, margin + 5, y);
          pdf.setFont('helvetica', 'bold');
          pdf.text(formatCurrency(item.value), pageWidth - margin - 5, y, { align: 'right' });
          pdf.setFont('helvetica', 'normal');
          y += 8;
        }
      });

      customItems.forEach((item, index) => {
        if (item.value > 0) {
          const adjustedIndex = investments.filter(i => i.value > 0).length + index;
          if (adjustedIndex % 2 === 0) {
            pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
            pdf.rect(margin, y - 5, contentWidth, 8, 'F');
          }
          pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
          pdf.text(item.label, margin + 5, y);
          pdf.setFont('helvetica', 'bold');
          pdf.text(formatCurrency(item.value), pageWidth - margin - 5, y, { align: 'right' });
          pdf.setFont('helvetica', 'normal');
          y += 8;
        }
      });

      y += 5;
      pdf.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Subtotal
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(11);
      pdf.text('Subtotal:', margin + 5, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(totalInvestment), pageWidth - margin - 5, y, { align: 'right' });

      y += 15;

      // ==================== MAIN PRICE SECTION ====================
      pdf.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
      pdf.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');

      y += 12;

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('PRECIO TOTAL CON FACTOR DE CAMBIO', margin + 10, y);

      y += 10;

      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatCurrency(pricingMetrics.salePrice)} COP`, margin + 10, y);

      y += 8;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Factor aplicado: ${priceFactor.toFixed(1)}x (${currentTier.label})`, margin + 10, y);

      y += 20;

      // ==================== METRICS CARDS ====================
      const cardWidth = (contentWidth - 10) / 3;
      const cardHeight = 25;
      const cardSpacing = 5;

      const metrics = [
        {
          label: 'Precio por Quilate',
          value: caratWeight > 0 ? formatCurrency(pricingMetrics.pricePerCarat) : 'N/A',
          icon: '💎'
        },
        {
          label: 'Margen s/Venta',
          value: formatPercent(pricingMetrics.margin),
          icon: '📊'
        },
        {
          label: 'Ganancia Neta',
          value: formatCurrency(pricingMetrics.profit),
          icon: '💰'
        }
      ];

      metrics.forEach((metric, index) => {
        const cardX = margin + (index * (cardWidth + cardSpacing));

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'FD');

        pdf.setFontSize(16);
        pdf.text(metric.icon, cardX + 5, y + 10);

        pdf.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(metric.label, cardX + 5, y + 16, { maxWidth: cardWidth - 10 });

        pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(metric.value, cardX + 5, y + 22);
      });

      y += cardHeight + 15;

      // ==================== TRUST ELEMENTS ====================
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

      y += 8;

      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓', margin + 5, y);
      pdf.text('Certificado de Autenticidad Incluido', margin + 12, y);

      y += 6;

      pdf.text('✓', margin + 5, y);
      pdf.text('Garantía de Origen Colombiano', margin + 12, y);

      y += 6;

      pdf.text('✓', margin + 5, y);
      pdf.text('Evaluación Gemológica Profesional', margin + 12, y);

      // ==================== FOOTER ====================
      const footerY = pageHeight - 40;

      pdf.setDrawColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
      pdf.setLineWidth(1);
      pdf.line(margin, footerY, pageWidth - margin, footerY);

      y = footerY + 8;

      // Company info
      pdf.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Tierra Madre - Esmeraldas Colombianas', margin, y);

      y += 5;
      pdf.text('Bogotá, Colombia | contacto@tierramadre.co', margin, y);

      y += 5;
      pdf.text('+57 (1) 234 5678 | www.tierramadre.co', margin, y);

      // Validity notice
      y = footerY + 8;
      pdf.setFontSize(8);
      pdf.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);
      const expiryStr = expiryDate.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      pdf.text('Esta cotización es válida hasta:', pageWidth - margin, y, { align: 'right' });
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
      pdf.text(expiryStr, pageWidth - margin, y, { align: 'right' });

      y += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      pdf.text('Los precios pueden variar según disponibilidad', pageWidth - margin, y, { align: 'right' });

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = multiSelectMode && selectedProducts.length > 0
        ? `Catalogo_TierraMadre_${selectedProducts.length}_Items_${dateStr}.pdf`
        : productName
          ? `Cotizacion_${productName.replace(/\s+/g, '_')}_${dateStr}.pdf`
          : `Cotizacion_TierraMadre_${dateStr}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const marginProgress = Math.min((pricingMetrics.margin / 75) * 100, 100);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {/* Jewelry Studio Header */}
      <Box
        sx={{
          mb: 4,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: studioShadows.lg,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 0,
            background: studioGradients.header,
            position: 'relative',
            overflow: 'hidden',
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
              background: studioGradients.emerald,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 300,
              height: '100%',
              background: `radial-gradient(circle at 100% 0%, ${alpha(studioColors.emerald, 0.08)} 0%, transparent 60%)`,
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  background: alpha(studioColors.emerald, 0.15),
                  border: `1px solid ${alpha(studioColors.emerald, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calculator size={26} color={studioColors.emerald} />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    color: studioColors.emerald,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    fontSize: '0.625rem',
                    display: 'block',
                    mb: 0.25,
                  }}
                >
                  TM STUDIO
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    color: '#FFFFFF',
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    letterSpacing: '-0.02em',
                    fontSize: '1.5rem',
                  }}
                >
                  Simulador de Precios
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha('#FFFFFF', 0.7),
                    fontWeight: 400,
                    fontSize: '0.875rem',
                  }}
                >
                  Calcula el precio de venta ideal para tus esmeraldas
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Download size={18} />}
              onClick={exportQuotation}
              disabled={isExporting || totalInvestment === 0}
              sx={{
                background: studioGradients.emerald,
                color: '#FFFFFF',
                fontWeight: 600,
                px: 3,
                py: 1.25,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.875rem',
                boxShadow: studioShadows.emerald,
                '&:hover': {
                  background: `linear-gradient(135deg, ${studioColors.emeraldLight} 0%, ${studioColors.emerald} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(studioColors.emerald, 0.35)}`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: alpha('#FFFFFF', 0.1),
                  color: alpha('#FFFFFF', 0.4),
                },
                transition: 'all 0.2s ease',
              }}
            >
              {isExporting ? 'Exportando...' : 'Exportar Cotización'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Left Column - Investments */}
        <Box>
          <Paper elevation={0} sx={{ ...studioCardStyles.card }}>
            {/* Product Name Field */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FileText size={18} color={studioColors.emerald} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.emerald }}>
                    Nombre del Producto
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    icon={<Image size={12} />}
                    label={`Galería (${emeralds.length})`}
                    size="small"
                    onClick={() => setProductSource('gallery')}
                    sx={{
                      height: 22,
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      bgcolor: productSource === 'gallery' ? studioColors.emerald : alpha(studioColors.emerald, 0.1),
                      color: productSource === 'gallery' ? '#FFFFFF' : studioColors.emerald,
                      cursor: 'pointer',
                      '& .MuiChip-icon': { color: productSource === 'gallery' ? '#FFFFFF' : studioColors.emerald },
                      '&:hover': {
                        bgcolor: productSource === 'gallery' ? studioColors.emerald : alpha(studioColors.emerald, 0.2),
                      },
                    }}
                  />
                  <Chip
                    icon={<ShoppingBag size={12} />}
                    label={`Inventario (${filteredInventory.length})`}
                    size="small"
                    onClick={() => setProductSource('inventory')}
                    sx={{
                      height: 22,
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      bgcolor: productSource === 'inventory' ? studioColors.emerald : alpha(studioColors.emerald, 0.1),
                      color: productSource === 'inventory' ? '#FFFFFF' : studioColors.emerald,
                      cursor: 'pointer',
                      '& .MuiChip-icon': { color: productSource === 'inventory' ? '#FFFFFF' : studioColors.emerald },
                      '&:hover': {
                        bgcolor: productSource === 'inventory' ? studioColors.emerald : alpha(studioColors.emerald, 0.2),
                      },
                    }}
                  />
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: studioColors.border }} />
                  <Chip
                    icon={<Layers size={12} />}
                    label="Multi-selección"
                    size="small"
                    onClick={toggleMultiSelectMode}
                    sx={{
                      height: 22,
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      bgcolor: multiSelectMode ? '#8B5CF6' : alpha('#8B5CF6', 0.1),
                      color: multiSelectMode ? '#FFFFFF' : '#8B5CF6',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: multiSelectMode ? '#8B5CF6' : alpha('#8B5CF6', 0.3),
                      '& .MuiChip-icon': { color: multiSelectMode ? '#FFFFFF' : '#8B5CF6' },
                      '&:hover': {
                        bgcolor: multiSelectMode ? '#8B5CF6' : alpha('#8B5CF6', 0.2),
                        borderColor: '#8B5CF6',
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Gallery Autocomplete */}
              {productSource === 'gallery' && (
              <Autocomplete
                freeSolo
                options={emeralds}
                value={selectedEmerald}
                inputValue={productName}
                onInputChange={(_, newValue) => setProductName(newValue)}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setProductName(newValue);
                    setSelectedEmerald(null);
                  } else {
                    handleEmeraldSelect(newValue);
                  }
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.name;
                }}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1,
                      '&:hover': { bgcolor: alpha(studioColors.emerald, 0.06) },
                    }}
                  >
                    <Avatar
                      src={option.imageUrl}
                      variant="rounded"
                      sx={{ width: 40, height: 40, borderRadius: 1.5 }}
                    >
                      <Gem size={20} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: studioColors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {option.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
                          {getCategoryLabel(option.category)}
                        </Typography>
                        {option.weightCarats && (
                          <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 500 }}>
                            {option.weightCarats} ct
                          </Typography>
                        )}
                        {option.priceCOP && option.priceCOP > 0 && (
                          <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 500 }}>
                            {formatCurrency(option.priceCOP)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={emeralds.length > 0 ? "Escribe o selecciona de la galería..." : "Ej: Anillo Esmeralda Colombiana 2.5ct"}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: studioColors.surface,
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: studioColors.border },
                        '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.5) },
                        '&.Mui-focused fieldset': { borderColor: studioColors.emerald, borderWidth: 2 },
                      },
                    }}
                  />
                )}
                PaperComponent={(props) => (
                  <Paper
                    {...props}
                    sx={{
                      mt: 0.5,
                      boxShadow: studioShadows.lg,
                      border: `1px solid ${studioColors.border}`,
                      borderRadius: 2,
                    }}
                  />
                )}
                noOptionsText={
                  <Box sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: studioColors.textSecondary }}>
                      No hay esmeraldas en la galería
                    </Typography>
                    <Typography variant="caption" sx={{ color: studioColors.textMuted }}>
                      Agrega esmeraldas en la sección "Subir"
                    </Typography>
                  </Box>
                }
              />
              )}

              {/* Inventory Autocomplete */}
              {productSource === 'inventory' && (
                <>
                {/* Status Filter */}
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 600, mb: 0.75, display: 'block' }}>
                    Estado
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['todas', 'disponibles', 'vendidas'].map(status => (
                      <Chip
                        key={status}
                        label={status.charAt(0).toUpperCase() + status.slice(1)}
                        size="small"
                        onClick={() => setStatusFilter(status)}
                        sx={{
                          height: 26,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          bgcolor: statusFilter === status ? studioColors.emerald : alpha(studioColors.emerald, 0.08),
                          color: statusFilter === status ? '#FFFFFF' : studioColors.textSecondary,
                          border: '1px solid',
                          borderColor: statusFilter === status ? studioColors.emerald : 'transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: statusFilter === status ? studioColors.emerald : alpha(studioColors.emerald, 0.15),
                            borderColor: studioColors.emerald,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Product Type Filter */}
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 600, mb: 0.75, display: 'block' }}>
                    Tipo
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {[
                      { value: 'todas', label: 'Todas' },
                      { value: 'gemas', label: 'Gemas' },
                      { value: 'joyas', label: 'Joyas' },
                      { value: 'lotes', label: 'Lotes' },
                    ].map(type => (
                      <Chip
                        key={type.value}
                        label={type.label}
                        size="small"
                        onClick={() => setProductTypeFilter(type.value)}
                        sx={{
                          height: 26,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          bgcolor: productTypeFilter === type.value ? alpha(studioColors.emerald, 0.15) : alpha(studioColors.emerald, 0.05),
                          color: productTypeFilter === type.value ? studioColors.emerald : studioColors.textSecondary,
                          border: '1px solid',
                          borderColor: productTypeFilter === type.value ? studioColors.emerald : 'transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: alpha(studioColors.emerald, 0.15),
                            borderColor: studioColors.emerald,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Shape Filter */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 600, mb: 0.75, display: 'block' }}>
                    Talla
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {uniqueShapes.map(shape => (
                    <Chip
                      key={shape}
                      label={shape === 'all' ? 'Todas' : shape}
                      size="small"
                      onClick={() => setShapeFilter(shape)}
                      sx={{
                        height: 24,
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        bgcolor: shapeFilter === shape ? alpha(studioColors.emerald, 0.15) : alpha(studioColors.emerald, 0.05),
                        color: shapeFilter === shape ? studioColors.emerald : studioColors.textSecondary,
                        border: '1px solid',
                        borderColor: shapeFilter === shape ? studioColors.emerald : 'transparent',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(studioColors.emerald, 0.15),
                          borderColor: studioColors.emerald,
                        },
                      }}
                    />
                  ))}
                  </Box>
                </Box>
                <Autocomplete
                  freeSolo
                  options={filteredInventory}
                  value={selectedInventoryItem}
                  inputValue={productName}
                  onInputChange={(_, newValue) => setProductName(newValue)}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      setProductName(newValue);
                      setSelectedInventoryItem(null);
                    } else {
                      handleInventorySelect(newValue);
                    }
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return `${option.nombre} - ${option.item}`;
                  }}
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      {...props}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                        '&:hover': { bgcolor: alpha(studioColors.emerald, 0.06) },
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: alpha(studioColors.emerald, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: studioColors.emerald,
                        }}
                      >
                        <Gem size={20} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: studioColors.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {option.nombre}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
                            #{option.item}
                          </Typography>
                          {option.isJewelry && option.metalType && (
                            <Chip
                              label={option.metalType}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                bgcolor: alpha(studioColors.gold, 0.1),
                                color: studioColors.gold,
                              }}
                            />
                          )}
                          {!option.isJewelry && option.cantidad > 1 && (
                            <Chip
                              label={`Lote x${option.cantidad}`}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                bgcolor: alpha('#8B5CF6', 0.1),
                                color: '#8B5CF6',
                                fontWeight: 600,
                              }}
                            />
                          )}
                          {!option.isJewelry && typeof option.peso === 'number' && (
                            <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 500 }}>
                              {option.peso} ct
                            </Typography>
                          )}
                          {option.precioCOP && option.precioCOP > 0 && (
                            <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 500 }}>
                              {formatCurrency(option.precioCOP)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Busca en inventario por nombre o número..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: studioColors.surface,
                          fontSize: '0.875rem',
                          '& fieldset': { borderColor: studioColors.border },
                          '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.5) },
                          '&.Mui-focused fieldset': { borderColor: studioColors.emerald, borderWidth: 2 },
                        },
                      }}
                    />
                  )}
                  PaperComponent={(props) => (
                    <Paper
                      {...props}
                      sx={{
                        mt: 0.5,
                        boxShadow: studioShadows.lg,
                        border: `1px solid ${studioColors.border}`,
                        borderRadius: 2,
                      }}
                    />
                  )}
                  noOptionsText={
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: studioColors.textSecondary }}>
                        No hay productos disponibles en inventario
                      </Typography>
                      <Typography variant="caption" sx={{ color: studioColors.textMuted }}>
                        Verifica el estado de los items
                      </Typography>
                    </Box>
                  }
                />
                </>
              )}

              {/* Selected Product Badge */}
              {selectedEmerald && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 1,
                    p: 1,
                    bgcolor: alpha(studioColors.emerald, 0.06),
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(studioColors.emerald, 0.2)}`,
                  }}
                >
                  <Avatar
                    src={selectedEmerald.imageUrl}
                    variant="rounded"
                    sx={{ width: 32, height: 32, borderRadius: 1 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 600 }}>
                      Seleccionado de galería
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedEmerald(null);
                      setProductName('');
                    }}
                    sx={{ color: studioColors.textMuted, '&:hover': { color: '#EF4444' } }}
                  >
                    <RotateCcw size={14} />
                  </IconButton>
                </Box>
              )}

              {selectedInventoryItem && !multiSelectMode && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 1,
                    p: 1,
                    bgcolor: alpha('#3B82F6', 0.06),
                    borderRadius: 1.5,
                    border: `1px solid ${alpha('#3B82F6', 0.2)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: alpha('#3B82F6', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3B82F6',
                    }}
                  >
                    <ShoppingBag size={16} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 600 }}>
                      Seleccionado de inventario #{selectedInventoryItem.item}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedInventoryItem(null);
                      setProductName('');
                    }}
                    sx={{ color: studioColors.textMuted, '&:hover': { color: '#EF4444' } }}
                  >
                    <RotateCcw size={14} />
                  </IconButton>
                </Box>
              )}

              {/* Multi-Select Collection Display */}
              {multiSelectMode && selectedProducts.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: alpha('#8B5CF6', 0.04),
                    borderRadius: 2,
                    border: `1px solid ${alpha('#8B5CF6', 0.2)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Layers size={16} color="#8B5CF6" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#8B5CF6' }}>
                        Colección ({selectedProducts.length} productos)
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 600 }}>
                      {formatCurrency(totalProductsValue)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedProducts.map((product) => {
                      const isInventory = 'item' in product;
                      const productId = isInventory ? product.item : product.id;
                      const productName = isInventory ? product.nombre : product.name;
                      const productPrice = ('priceCOP' in product ? product.priceCOP : 0) || 0;

                      return (
                        <Box
                          key={productId}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1,
                            bgcolor: alpha('#FFFFFF', 0.8),
                            borderRadius: 1,
                            border: `1px solid ${alpha('#8B5CF6', 0.1)}`,
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: studioColors.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {productName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 500 }}>
                              {formatCurrency(productPrice)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveProduct(product)}
                            sx={{
                              color: studioColors.textMuted,
                              '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.1) },
                            }}
                          >
                            <X size={14} />
                          </IconButton>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ borderColor: studioColors.border, mb: 2.5 }} />

            {/* Carat Weight Input */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Gem size={16} color={studioColors.emerald} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
                  Peso en Quilates (opcional)
                </Typography>
                <Tooltip title="Ingresa el peso total en quilates para calcular el precio por quilate">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Info size={14} color={studioColors.textMuted} />
                  </Box>
                </Tooltip>
              </Box>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={caratWeight || ''}
                onChange={(e) => setCaratWeight(Number(e.target.value) || 0)}
                placeholder="Ej: 2.5"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ fontSize: '0.75rem', color: studioColors.emerald, fontWeight: 600 }}>
                          ct
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: studioColors.surface,
                    fontSize: '0.875rem',
                    '& fieldset': { borderColor: studioColors.border },
                    '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
                    '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
                  },
                }}
              />
            </Box>

            <Divider sx={{ borderColor: studioColors.border, mb: 2.5 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ ...studioCardStyles.sectionTitle }}>
                Inversión
              </Typography>
              <Tooltip title="Reiniciar valores">
                <IconButton size="small" onClick={resetValues} sx={{ color: studioColors.textMuted }}>
                  <RotateCcw size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {investments.map((item) => (
                <Box key={item.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                    <Box sx={{ color: studioColors.textSecondary }}>{item.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: studioColors.textPrimary, flex: 1 }}>
                      {item.label}
                    </Typography>
                    {item.unit && (
                      <Chip
                        label={item.unit}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          bgcolor: alpha(studioColors.emerald, 0.1),
                          color: studioColors.emerald,
                        }}
                      />
                    )}
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={item.value || ''}
                    onChange={(e) => updateInvestment(item.id, Number(e.target.value) || 0)}
                    placeholder={item.placeholder}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: studioColors.surface,
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: studioColors.border },
                        '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
                        '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>

            {/* Custom Items */}
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  py: 1,
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textSecondary }}>
                  Costos adicionales
                </Typography>
                {showAdvanced ? <ChevronUp size={18} color={studioColors.textSecondary} /> : <ChevronDown size={18} color={studioColors.textSecondary} />}
              </Box>

              <Collapse in={showAdvanced}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {customItems.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField
                        size="small"
                        value={item.label}
                        onChange={(e) => updateCustomItem(index, 'label', e.target.value)}
                        placeholder="Concepto"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: studioColors.surface,
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: studioColors.border },
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        value={item.value || ''}
                        onChange={(e) => updateCustomItem(index, 'value', Number(e.target.value) || 0)}
                        placeholder="0"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          width: 150,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: studioColors.surface,
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: studioColors.border },
                          },
                        }}
                      />
                    </Box>
                  ))}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      color: studioColors.emerald,
                      '&:hover': { color: studioColors.emeraldLight },
                    }}
                    onClick={addCustomItem}
                  >
                    <Plus size={16} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Agregar costo
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>

            <Divider sx={{ borderColor: studioColors.border, my: 2.5 }} />

            {/* Total Investment */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
                Total Inversión
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: studioColors.textPrimary,
                  fontFamily: 'monospace',
                }}
              >
                {formatCurrency(totalInvestment)}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Right Column - Pricing */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Factor Slider */}
          <Paper elevation={0} sx={{ ...studioCardStyles.card, position: 'relative', overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 150,
                height: 150,
                background: `radial-gradient(circle, ${alpha(currentTier.color, 0.06)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, position: 'relative' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: alpha(currentTier.color, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target size={18} color={currentTier.color} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
                  Factor sobre Inversión
                </Typography>
                <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
                  Multiplicador de precio
                </Typography>
              </Box>
              <Tooltip title="Multiplicador que se aplica al total de inversión para calcular el precio de venta">
                <IconButton size="small" sx={{ color: studioColors.textMuted }}>
                  <Info size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Large Factor Display */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3, mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 0.5,
                  px: 4,
                  py: 2,
                  borderRadius: 3,
                  bgcolor: alpha(currentTier.color, 0.08),
                  border: `2px solid ${alpha(currentTier.color, 0.2)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: currentTier.color,
                    lineHeight: 1,
                    fontFamily: 'monospace',
                  }}
                >
                  {priceFactor.toFixed(1)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: currentTier.color,
                    opacity: 0.7,
                  }}
                >
                  x
                </Typography>
              </Box>
            </Box>

            <Box sx={{ px: 2, mb: 3 }}>
              <Slider
                value={priceFactor}
                onChange={(_, value) => setPriceFactor(value as number)}
                min={1.5}
                max={4.0}
                step={0.1}
                marks={PRICING_TIERS.map(tier => ({
                  value: tier.factor,
                  label: tier.label,
                }))}
                sx={{
                  color: currentTier.color,
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: studioColors.textMuted,
                    top: 30,
                  },
                  '& .MuiSlider-mark': {
                    bgcolor: studioColors.border,
                    height: 12,
                    width: 2,
                    borderRadius: 1,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    boxShadow: `0 2px 8px ${alpha(currentTier.color, 0.4)}`,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: `0 0 0 6px ${alpha(currentTier.color, 0.16)}, 0 2px 8px ${alpha(currentTier.color, 0.4)}`,
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 6,
                    borderRadius: 3,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    height: 6,
                    borderRadius: 3,
                    bgcolor: studioColors.border,
                    opacity: 1,
                  },
                }}
              />
            </Box>

            {/* Quick Select Tiers */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {PRICING_TIERS.map((tier) => (
                <Chip
                  key={tier.label}
                  label={tier.label}
                  onClick={() => setPriceFactor(tier.factor)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.1),
                    color: Math.abs(priceFactor - tier.factor) < 0.05 ? '#FFFFFF' : tier.color,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 28,
                    border: '1px solid',
                    borderColor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.3),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.15),
                      transform: 'translateY(-1px)',
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Results Card */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${studioColors.border}`,
              boxShadow: studioShadows.emerald,
            }}
          >
            {/* Main Price Section */}
            <Box
              sx={{
                p: 3,
                background: studioGradients.header,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: studioGradients.emerald,
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: -100,
                  right: -100,
                  width: 250,
                  height: 250,
                  borderRadius: '50%',
                  background: alpha(studioColors.emerald, 0.08),
                  pointerEvents: 'none',
                }}
              />

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha(studioColors.emerald, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp size={18} color={studioColors.emerald} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: alpha('#FFFFFF', 0.9) }}>
                    Precio de Venta Sugerido
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: studioColors.emerald,
                      fontFamily: 'monospace',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {formatCurrency(pricingMetrics.salePrice)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      bgcolor: alpha(studioColors.emerald, 0.15),
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                    }}
                  >
                    <ArrowUpRight size={14} color={studioColors.emerald} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: studioColors.emerald }}>
                      {priceFactor.toFixed(1)}x
                    </Typography>
                  </Box>
                </Box>

                {/* Price per Carat Display */}
                {caratWeight > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(studioColors.gold, 0.08),
                        border: `1px solid ${alpha(studioColors.gold, 0.2)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Gem size={16} color={studioColors.gold} />
                        <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.85), fontWeight: 500 }}>
                          Precio por Quilate
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: studioColors.gold,
                          fontFamily: 'monospace',
                        }}
                      >
                        {formatCurrency(pricingMetrics.pricePerCarat)}/ct
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Margin Progress Bar */}
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                      Margen de ganancia
                    </Typography>
                    <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 600 }}>
                      {formatPercent(pricingMetrics.margin)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={marginProgress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha('#FFFFFF', 0.15),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: studioGradients.emerald,
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Metrics Grid */}
            <Box sx={{ p: 2.5, bgcolor: studioColors.surface }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {/* Margin */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#3B82F6', 0.06),
                    textAlign: 'center',
                    border: `1px solid ${alpha('#3B82F6', 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha('#3B82F6', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Percent size={16} color="#3B82F6" />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#3B82F6',
                      fontFamily: 'monospace',
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    {formatPercent(pricingMetrics.margin)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
                    Margen s/Venta
                  </Typography>
                </Box>

                {/* ROI */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#8B5CF6', 0.06),
                    textAlign: 'center',
                    border: `1px solid ${alpha('#8B5CF6', 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha('#8B5CF6', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <TrendingUp size={16} color="#8B5CF6" />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#8B5CF6',
                      fontFamily: 'monospace',
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    {formatPercent(pricingMetrics.roi)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
                    ROI (Retorno)
                  </Typography>
                </Box>

                {/* Profit */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(studioColors.emerald, 0.06),
                    textAlign: 'center',
                    border: `1px solid ${alpha(studioColors.emerald, 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha(studioColors.emerald, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <DollarSign size={16} color={studioColors.emerald} />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: studioColors.emerald,
                      fontFamily: 'monospace',
                      lineHeight: 1.2,
                      mb: 0.5,
                    }}
                  >
                    {formatCurrency(pricingMetrics.profit)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
                    Ganancia Neta
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Formula Info */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              bgcolor: studioColors.surfaceMuted,
              border: `1px solid ${studioColors.border}`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  bgcolor: alpha('#3B82F6', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Info size={14} color="#3B82F6" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#3B82F6' }}>
                Fórmulas Aplicadas
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                pb: 2,
                pt: 0,
                borderTop: `1px solid ${studioColors.border}`,
                bgcolor: studioColors.surface,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    Precio = Inversión × Factor
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#8B5CF6' }} />
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    Margen = (Precio - Inversión) / Precio × 100
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: studioColors.emerald }} />
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    ROI = (Precio - Inversión) / Inversión × 100
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
