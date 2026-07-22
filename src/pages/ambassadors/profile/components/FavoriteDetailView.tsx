/**
 * FavoriteDetailView Component
 * Hero image, product specs, description, and "Contactar Embajador" CTA.
 */

import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
} from "@mui/material";
import { ArrowLeft, MessageCircle, Scale, MapPin, Award } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { qeFont } from "../../../../design-system";
import { formatFullCurrency, formatCarats } from "../../../../utils/formatting";
import { useReducedMotion } from "../../../../hooks/useReducedMotion";
import ProgressiveImage from "../../../../components/shared/ProgressiveImage";
import type { TreasureItem } from "../../../../types";
import type { Asesor } from "../../../../hooks/useAsesores";

interface FavoriteDetailViewProps {
  item: TreasureItem;
  asesor: Asesor;
  onBack: () => void;
}

export function FavoriteDetailView({
  item,
  asesor,
  onBack,
}: FavoriteDetailViewProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const weightDisplay =
    typeof item.peso === "number"
      ? `${formatCarats(item.peso)} ct`
      : item.peso || "";

  const handleContact = () => {
    if (asesor.whatsapp) {
      const digits = asesor.whatsapp.replace(/\D/g, "");
      const fullNumber = digits.startsWith("57") ? digits : `57${digits}`;
      const text = `Hola ${asesor.name}, me interesa la esmeralda "${item.nombre}" (Item #${item.item})`;
      window.open(
        `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`,
        "_blank",
      );
    }
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: "var(--tm-well)",
            border: "1px solid var(--tm-border)",
            color: "var(--tm-text)",
            width: 38,
            height: 38,
            "&:hover": {
              bgcolor: "var(--tm-well)",
              borderColor: "var(--tm-accent)",
            },
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
      </Box>

      {/* Hero Image */}
      <Box
        sx={{
          borderRadius: "var(--tm-radius-card)",
          overflow: "hidden",
          mb: 2.5,
          aspectRatio: "4/3",
          bgcolor: "var(--tm-well)",
          border: "1px solid var(--tm-border)",
        }}
      >
        <ProgressiveImage
          src={item.thumbnailUrl || item.imagen}
          alt={item.nombre}
          width={400}
          height={300}
          layout="full"
          quality="good"
          enableLQIP
        />
      </Box>

      {/* Name & Price */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          letterSpacing: "-0.02em",
          fontSize: "1.3rem",
        }}
      >
        {item.nombre}
      </Typography>
      <Typography
        sx={{
          fontFamily: qeFont.serif,
          fontWeight: 600,
          fontSize: "1.5rem",
          letterSpacing: "0.01em",
          color: "var(--tm-accent)",
          fontVariantNumeric: "lining-nums tabular-nums",
          mb: 2,
        }}
      >
        {formatFullCurrency(item.precioCOP)}
      </Typography>

      {/* Tags */}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        {item.isJewelry && (
          <Chip
            label="JOYA"
            size="small"
            sx={{
              bgcolor: "var(--tm-well)",
              color: "var(--tm-muted)",
              fontWeight: 700,
              fontSize: "0.58rem",
              letterSpacing: "0.04em",
              borderRadius: "var(--tm-radius-well)",
            }}
          />
        )}
        {item.ubicacion && (
          <Chip
            label={item.ubicacion.toUpperCase()}
            size="small"
            sx={{
              bgcolor: "var(--tm-accent-wash)",
              color: "var(--tm-accent)",
              fontWeight: 700,
              fontSize: "0.58rem",
              letterSpacing: "0.04em",
              borderRadius: "var(--tm-radius-well)",
            }}
          />
        )}
        {item.color && (
          <Chip
            label={item.color}
            size="small"
            sx={{
              bgcolor: "var(--tm-well)",
              color: "var(--tm-muted)",
              fontWeight: 500,
              fontSize: "0.6rem",
              borderRadius: "var(--tm-radius-well)",
            }}
          />
        )}
      </Box>

      {/* Specs - 3 columns */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1.5,
          mb: 2.5,
          p: 2,
          borderRadius: "var(--tm-radius-card)",
          bgcolor: "var(--tm-surface)",
          border: "1px solid",
          borderColor: "var(--tm-border)",
        }}
      >
        <SpecItem
          icon={<Scale size={16} />}
          label="Peso"
          value={weightDisplay || "-"}
        />
        <SpecItem
          icon={<MapPin size={16} />}
          label="Origen"
          value={item.ubicacion || "-"}
        />
        <SpecItem
          icon={<Award size={16} />}
          label="Calidad"
          value={item.calidad || "-"}
        />
      </Box>

      {/* Description */}
      {item.description && (
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          {item.description}
        </Typography>
      )}

      {/* Contact CTA */}
      <Button
        variant="contained"
        fullWidth
        startIcon={<MessageCircle size={18} />}
        onClick={handleContact}
        disabled={!asesor.whatsapp}
        sx={{
          bgcolor: "var(--tm-accent-strong)",
          color: "var(--tm-on-accent)",
          "&:hover": { bgcolor: "var(--tm-accent)" },
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.9rem",
          py: 1.5,
          borderRadius: "var(--tm-radius-control)",
          boxShadow: "none",
        }}
      >
        {t.ambassador.museum?.contactAmbassador ?? "Contactar Embajador"}
      </Button>
    </motion.div>
  );
}

function SpecItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Box
        sx={{
          color: "text.secondary",
          mb: 0.5,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: "0.58rem",
          color: "text.secondary",
          mb: 0.25,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 650, fontSize: "0.78rem" }}>
        {value}
      </Typography>
    </Box>
  );
}

export default FavoriteDetailView;
