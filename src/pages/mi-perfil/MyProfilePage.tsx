/**
 * MyProfilePage
 *
 * Ambassador personal dashboard showing performance data,
 * guest activity, and invitation tracking.
 * Accessible via /mi-perfil (staff only).
 */

import { Box, Typography, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrentAsesor } from '../../hooks/useCurrentAsesor';
import { useTreasure } from '../../hooks/useTreasure';
import { useGuestActivity } from '../../hooks/useGuestActivity';
import { useMyInvitations } from '../../hooks/useMyInvitations';
import { primitiveSpacing as spacing } from '../../design-system';
import Breadcrumbs from '../../components/shared/Breadcrumbs';
import {
  MyProfileHeader,
  PortfolioStats,
  GuestActivityFeed,
  TopGuestProducts,
  InvitationSummary,
} from './components';

export default function MyProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: googleUser } = useGoogleAuth();
  const { asesor, isLoading: asesorLoading } = useCurrentAsesor();
  const { treasure } = useTreasure();
  const { guestViews, topProducts, isLoading: activityLoading } = useGuestActivity(asesor?.name, 500);
  const { invitations, metrics, isLoading: invitationsLoading, mutatingCodes, updateMultiplier, expireInvitation } = useMyInvitations(googleUser?.email);

  if (asesorLoading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12 }}>
        <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (!asesor) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mt: 8 }}>
          {t.profile.notFound}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: spacing.md, pb: 12 }}>
      <Breadcrumbs
        items={[
          { label: 'Inicio', path: '/home' },
          { label: 'Mi Perfil' },
        ]}
      />

      <MyProfileHeader
        asesor={asesor}
        googlePicture={googleUser?.picture}
      />

      <PortfolioStats
        asesorName={asesor.name}
        treasure={treasure}
      />

      <GuestActivityFeed
        guestViews={guestViews}
        isLoading={activityLoading}
        onInvite={() => navigate('/home')}
      />

      <TopGuestProducts topProducts={topProducts} />

      <InvitationSummary
        invitations={invitations}
        metrics={metrics}
        isLoading={invitationsLoading}
        mutatingCodes={mutatingCodes}
        onUpdateMultiplier={updateMultiplier}
        onExpire={expireInvitation}
      />
    </Box>
  );
}
