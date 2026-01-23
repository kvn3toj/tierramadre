/**
 * AuctionRecordsCard - Display notable emerald auction records
 */

import React from 'react';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import { emeraldCore, goldAccent } from '../../../design-system/tokens/colors';
import { applyGlass, GlassEffect } from '../../../design-system/tokens/glass';
import { AUCTION_RECORDS } from '../../../data/emerald-valuation';

interface AuctionRecordsCardProps {
  glassEffect: GlassEffect;
  isDarkMode: boolean;
}

export const AuctionRecordsCard: React.FC<AuctionRecordsCardProps> = ({ glassEffect, isDarkMode }) => (
  <Card sx={{ ...applyGlass(glassEffect), borderRadius: 4, mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <EmojiEvents sx={{ color: goldAccent.primary }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Records en Subastas
        </Typography>
      </Box>

      {AUCTION_RECORDS.map((record, index) => (
        <Box
          key={record.name}
          sx={{
            p: 1.5,
            mb: index < AUCTION_RECORDS.length - 1 ? 1.5 : 0,
            borderRadius: 2,
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {record.name}
            </Typography>
            <Chip
              label={record.year}
              size="small"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {record.house} - {record.carats} ct
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: goldAccent.primary }}
            >
              ${record.price.toLocaleString()}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: emeraldCore.primary, fontWeight: 500 }}
          >
            ${record.pricePerCarat.toLocaleString()}/ct
          </Typography>
        </Box>
      ))}
    </CardContent>
  </Card>
);

export default AuctionRecordsCard;
