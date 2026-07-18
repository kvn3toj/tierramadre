/**
 * ViewerStats Component
 * Stats overview grid showing total views, unique viewers, etc.
 */

import React from 'react';
import { Box } from '@mui/material';
import { Eye, Users, UserCheck, User } from 'lucide-react';
import { MetricCard } from '../../../../design-system';

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
      <MetricCard label="Total Vistas" value={totalViews} icon={Eye} compact />
      <MetricCard
        label="Viewers Únicos"
        value={uniqueViewers}
        icon={Users}
        compact
      />
      <MetricCard
        label="Registrados"
        value={loggedInViewers}
        icon={UserCheck}
        compact
      />
      <MetricCard label="Invitados" value={guestViewers} icon={User} compact />
    </Box>
  );
};
