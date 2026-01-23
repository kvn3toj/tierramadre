/**
 * ViewerStats Component
 * Stats overview grid showing total views, unique viewers, etc.
 */

import React from 'react';
import { Box } from '@mui/material';
import { Eye, Users, UserCheck, User } from 'lucide-react';
import { emeraldCore, goldAccent } from '../../../../design-system/tokens/colors';
import { StatBox } from '../../../../components/shared';

interface ViewerStatsProps {
  totalViews: number;
  uniqueViewers: number;
  loggedInViewers: number;
  guestViewers: number;
}

export const ViewerStats: React.FC<ViewerStatsProps> = ({
  totalViews,
  uniqueViewers,
  loggedInViewers,
  guestViewers,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1.5,
        mb: 3,
      }}
    >
      <StatBox
        label="Total Vistas"
        value={totalViews}
        icon={Eye}
        color="#3B82F6"
      />
      <StatBox
        label="Viewers Únicos"
        value={uniqueViewers}
        icon={Users}
        color={emeraldCore.primary}
      />
      <StatBox
        label="Registrados"
        value={loggedInViewers}
        icon={UserCheck}
        color={goldAccent.primary}
      />
      <StatBox
        label="Invitados"
        value={guestViewers}
        icon={User}
        color="#6B7280"
      />
    </Box>
  );
};
