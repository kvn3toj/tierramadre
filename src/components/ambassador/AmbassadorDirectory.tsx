/**
 * AmbassadorDirectory Component
 * Curated gallery of ambassador cards. Search only appears with 6+ ambassadors.
 * Minimal chrome — content speaks for itself.
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Search, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAsesores, Asesor } from '../../hooks/useAsesores';
import { useTreasure } from '../../hooks/useTreasure';
import AsesorCard from './AsesorCard';
import { qeFont } from '../../design-system/index';
import {
  staggerContainer,
  staggerItem,
} from '../../design-system/tokens/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/** Threshold: show search bar only when this many or more ambassadors */
const SEARCH_THRESHOLD = 6;

interface AmbassadorDirectoryProps {
  onViewProducts?: (asesor: Asesor) => void;
  maxVisible?: number;
}

export default function AmbassadorDirectory({
  onViewProducts,
  maxVisible,
}: AmbassadorDirectoryProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const [searchQuery, setSearchQuery] = useState('');

  const { treasure } = useTreasure();
  const { asesores, isLoading, error } = useAsesores(treasure);

  const embajadores = useMemo(() => {
    return asesores.filter((a) =>
      (a.role || '').toLowerCase().includes('embajador'),
    );
  }, [asesores]);

  const filteredAsesores = useMemo(() => {
    let result = [...embajadores];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(query));
    }

    result.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));

    if (maxVisible) {
      result = result.slice(0, maxVisible);
    }

    return result;
  }, [embajadores, searchQuery, maxVisible]);

  const hasActiveFilters = !!searchQuery;
  const showSearch = embajadores.length >= SEARCH_THRESHOLD;

  if (isLoading) {
    return (
      <Box>
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <CircularProgress
            size={14}
            aria-label={t.loading.general}
            sx={{ color: 'var(--tm-accent)' }}
          />
          <Typography
            sx={{
              color: 'var(--tm-muted)',
              fontFamily: qeFont.ui,
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {t.loading.ambassadors}
          </Typography>
        </Box>
        <AmbassadorDirectorySkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
        {t.ambassador.loadError}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Editorial intro — gives the directory a sense of place */}
      <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 2.5 }, mt: 0.5 }}>
        <Typography
          sx={{
            fontFamily: qeFont.serif,
            fontStyle: 'italic',
            fontSize: { xs: '1.15rem', sm: '1.28rem' },
            lineHeight: 1.35,
            color: 'text.primary',
            opacity: 0.9,
            maxWidth: 360,
            mx: 'auto',
          }}
        >
          {t.ambassador.directoryTagline}
        </Typography>

        {/* Delicate gem divider */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mt: 1.25,
          }}
        >
          <Box
            sx={{
              height: '1px',
              width: 32,
              background:
                'linear-gradient(90deg, transparent, var(--tm-border))',
            }}
          />
          <Gem size={11} style={{ color: 'var(--tm-subtle)' }} />
          <Box
            sx={{
              height: '1px',
              width: 32,
              background:
                'linear-gradient(90deg, var(--tm-border), transparent)',
            }}
          />
        </Box>

        {/* Count whisper */}
        {!hasActiveFilters && embajadores.length > 0 && (
          <Typography
            sx={{
              mt: 1.25,
              fontSize: '0.62rem',
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.65,
            }}
          >
            {embajadores.length}{' '}
            {embajadores.length === 1 ? 'embajador' : 'embajadores'}
          </Typography>
        )}
      </Box>

      {/* Search — only for larger lists */}
      {showSearch && (
        <TextField
          fullWidth
          placeholder={t.ambassador.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={15} strokeWidth={1.5} style={{ opacity: 0.3 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 'var(--tm-radius-control)',
              bgcolor: 'var(--tm-well)',
              fontSize: '0.8rem',
              '& fieldset': {
                borderColor: 'var(--tm-border)',
                transition: 'border-color var(--tm-base) var(--tm-ease)',
              },
              '&:hover fieldset': {
                borderColor: 'var(--tm-muted)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--tm-accent)',
                borderWidth: '1px !important',
              },
            },
          }}
        />
      )}

      {/* Grid */}
      {filteredAsesores.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            borderRadius: 'var(--tm-radius-card)',
            border: '1px solid',
            borderColor: 'var(--tm-border)',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '1px solid',
              borderColor: 'var(--tm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <Gem size={20} strokeWidth={1} style={{ color: 'var(--tm-subtle)' }} />
          </Box>
          <Typography
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.9rem',
              mb: 0.5,
            }}
          >
            {t.ambassador.noResults}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              opacity: 0.6,
              mb: 2.5,
            }}
          >
            {hasActiveFilters
              ? t.ambassador.tryOtherCriteria
              : t.ambassador.noAmbassadors}
          </Typography>
          {hasActiveFilters && (
            <Button
              variant="outlined"
              onClick={() => setSearchQuery('')}
              sx={{
                textTransform: 'none',
                borderColor: 'var(--tm-border)',
                color: 'var(--tm-accent)',
                fontSize: '0.75rem',
                fontWeight: 500,
                px: 2.5,
                py: 0.5,
                borderRadius: 'var(--tm-radius-control)',
                '&:hover': {
                  borderColor: 'var(--tm-accent)',
                  bgcolor: 'var(--tm-accent-wash)',
                },
              }}
            >
              {t.ambassador.clearFilters}
            </Button>
          )}
        </Box>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial={prefersReducedMotion ? false : 'initial'}
          animate="animate"
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: { xs: '12px', sm: '16px' },
            }}
          >
            {filteredAsesores.map((asesor, index) => (
              <motion.div key={asesor.id} variants={staggerItem}>
                <AsesorCard
                  asesor={asesor}
                  onViewProducts={onViewProducts}
                  isTopRanked={!hasActiveFilters && index === 0}
                />
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}
    </Box>
  );
}

/** Skeleton */
export function AmbassadorDirectorySkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: { xs: '12px', sm: '16px' },
      }}
    >
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            borderRadius: 'var(--tm-radius-card)',
            bgcolor: 'var(--tm-surface)',
            border: '1px solid',
            borderColor: 'var(--tm-border)',
            overflow: 'hidden',
          }}
        >
          {/* Top row skeleton */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: '12px 14px 10px 14px',
            }}
          >
            <Box sx={{ flexShrink: 0 }}>
              <Skeleton variant="circle" width={44} height={44} />
            </Box>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              <Skeleton variant="text" width="75%" height={16} />
              <Skeleton variant="text" width="50%" height={14} />
              <Skeleton variant="rect" width={70} height={20} />
            </Box>
          </Box>
          {/* Gallery skeleton */}
          <Box sx={{ display: 'flex', gap: '6px', px: '10px', pb: '10px' }}>
            {[1, 2, 3].map((j) => (
              <Box key={j} sx={{ flex: 1, aspectRatio: '4/3' }}>
                <Skeleton variant="rect" width="100%" height="100%" />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
