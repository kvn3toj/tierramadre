/**
 * OriginComparisonTable - Price comparison by emerald origin
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Public, Verified } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { applyGlass, GlassEffect } from '../../../design-system/tokens/glass';
import { ORIGIN_COMPARISON } from '../../../data/emerald-valuation';

interface OriginComparisonTableProps {
  glassEffect: GlassEffect;
}

export const OriginComparisonTable: React.FC<OriginComparisonTableProps> = ({ glassEffect }) => (
  <Card sx={{ ...applyGlass(glassEffect), borderRadius: 4, mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Public sx={{ color: emeraldCore.primary }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Comparacion por Origen (2025)
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Origen</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                Comercial
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                Inversion
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ORIGIN_COMPARISON.map((row) => (
              <TableRow key={row.origin}>
                <TableCell sx={{ fontSize: '0.8rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{row.flag}</span>
                    <span>{row.origin}</span>
                    {row.origin === 'Colombia' && (
                      <Verified sx={{ fontSize: 14, color: emeraldCore.primary }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                  ${row.commercial.min.toLocaleString()}-${row.commercial.max.toLocaleString()}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: row.origin === 'Colombia' ? 600 : 400,
                    color: row.origin === 'Colombia' ? emeraldCore.primary : 'inherit',
                  }}
                >
                  ${row.investment.min.toLocaleString()}-${row.investment.max.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}
      >
        Las esmeraldas colombianas comandan un premium de 2-4x sobre otras fuentes
      </Typography>
    </CardContent>
  </Card>
);

export default OriginComparisonTable;
