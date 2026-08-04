/**
 * ClientInfoSection Component
 * Form section for client and asesor information with autocomplete.
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Autocomplete,
  Avatar,
  Chip,
  alpha,
} from '@mui/material';
import { TextField } from '../../../design-system/components/TextField';
import { User } from 'lucide-react';
import { brandColors } from '../constants';
import type { ClientInfoSectionProps } from '../types';
import type { ClientOption } from '../../../types/creatorInvitations';
import type { RecentClient } from '../../../hooks/useRecentClients';

export const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  clientEmail,
  setClientEmail,
  clientDocument,
  setClientDocument,
  asesorName,
  setAsesorName,
  asesores,
  isLoadingAsesores = false,
  googleUser,
  recentClients = [],
  onSelectClient,
  invitedGuests = [],
  isLoadingInvitations = false,
  onSelectInvitedGuest,
}) => {
  // Auto-detect asesor by matching Google user's email with asesores email/instagram field
  const matchedAsesor = React.useMemo(() => {
    if (!googleUser?.email || asesores.length === 0) {
      return null;
    }
    const userEmailLower = googleUser.email.toLowerCase().trim();
    const match = asesores.find(
      (a) => a.email?.toLowerCase().trim() === userEmailLower,
    );
    return match;
  }, [googleUser?.email, asesores]);

  // Auto-set asesor name when match is found (only once)
  React.useEffect(() => {
    if (matchedAsesor && !asesorName) {
      setAsesorName(matchedAsesor.name);
    }
  }, [matchedAsesor, asesorName, setAsesorName]);

  // Get role label from matched asesor
  const asesorLabel = matchedAsesor?.role || 'Asesor';

  // Combine invited guests and recent clients into grouped options
  const combinedOptions = React.useMemo((): ClientOption[] => {
    const options: ClientOption[] = [];

    // Add invited guests first (priority) - only those with names
    invitedGuests?.forEach((guest) => {
      if (guest.guestName) {
        options.push({
          name: guest.guestName,
          phone:
            guest.contactType === 'phone'
              ? guest.guestContact || undefined
              : undefined,
          email:
            guest.contactType === 'email'
              ? guest.guestContact || undefined
              : undefined,
          source: 'invited',
          shortCode: guest.shortCode,
          invitationStatus: guest.status,
        });
      }
    });

    // Add recent clients (excluding duplicates by name)
    recentClients?.forEach((client) => {
      const alreadyExists = options.some(
        (o) => o.name.toLowerCase() === client.name.toLowerCase(),
      );
      if (!alreadyExists) {
        options.push({
          ...client,
          source: 'recent',
        });
      }
    });

    return options;
  }, [invitedGuests, recentClients]);

  return (
    <>
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.primary',
          mb: 2,
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 700,
          fontSize: '0.875rem',
        }}
      >
        Información del Cliente
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Autocomplete
            freeSolo
            size="small"
            options={combinedOptions}
            groupBy={(option) =>
              option.source === 'invited'
                ? 'Invitaciones Activas'
                : 'Clientes Recientes'
            }
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : option.name
            }
            value={clientName}
            onChange={(_, value) => {
              if (typeof value === 'string') {
                setClientName(value);
              } else if (value) {
                if (value.source === 'invited' && onSelectInvitedGuest) {
                  const invitation = invitedGuests?.find(
                    (g) => g.shortCode === value.shortCode,
                  );
                  if (invitation) onSelectInvitedGuest(invitation);
                } else if (value.source === 'recent' && onSelectClient) {
                  onSelectClient(value as RecentClient);
                }
              }
            }}
            onInputChange={(_, value) => setClientName(value)}
            loading={isLoadingInvitations}
            renderGroup={(params) => (
              <li key={params.key}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 0.5,
                    display: 'block',
                    bgcolor: alpha(brandColors.emerald, 0.05),
                    color: 'text.disabled',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: '0.65rem',
                  }}
                >
                  {params.group}
                </Typography>
                <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
              </li>
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {option.name}
                    </Typography>
                    {option.source === 'invited' && (
                      <Chip
                        label={
                          option.invitationStatus === 'active'
                            ? 'Activa'
                            : 'Pendiente'
                        }
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          bgcolor:
                            option.invitationStatus === 'active'
                              ? alpha(brandColors.emerald, 0.15)
                              : alpha(brandColors.gold, 0.15),
                          color:
                            option.invitationStatus === 'active'
                              ? brandColors.emerald
                              : brandColors.gold,
                        }}
                      />
                    )}
                  </Box>
                  {(option.phone || option.email) && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled' }}
                    >
                      {option.phone}
                      {option.phone && option.email ? ' · ' : ''}
                      {option.email}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                size="sm"
                label="Nombre del Cliente"
                placeholder="Ej: Juan Perez (o selecciona de la lista)"
                helperText={
                  clientName && clientName.length < 3
                    ? 'El nombre debe tener al menos 3 caracteres'
                    : combinedOptions.length > 0
                      ? 'Sugerencias disponibles'
                      : ''
                }
                error={clientName !== '' && clientName.length < 3}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Teléfono"
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            size="sm"
            placeholder="+57 300 123 4567"
            inputProps={{ autoComplete: 'tel' }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            size="sm"
            placeholder="cliente@ejemplo.com"
            inputProps={{ autoComplete: 'email' }}
            error={clientEmail !== '' && !clientEmail.includes('@')}
            helperText={
              clientEmail !== '' && !clientEmail.includes('@')
                ? 'Ingresa un email válido'
                : ''
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Documento (Cédula/Pasaporte)"
            value={clientDocument}
            onChange={(e) => setClientDocument(e.target.value)}
            size="sm"
            placeholder="Ej: 123456789"
          />
        </Grid>
        <Grid item xs={12}>
          {/* Asesor field - Auto-detected from Google account, read-only */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              bgcolor: alpha(brandColors.emerald, 0.06),
              borderRadius: 2,
              border: `1px solid ${alpha(brandColors.emerald, 0.2)}`,
            }}
          >
            <Avatar
              src={
                googleUser
                  ? `https://ui-avatars.com/api/?name=${encodeURIComponent(asesorName || googleUser.name)}&background=00C992&color=fff`
                  : undefined
              }
              sx={{
                width: 40,
                height: 40,
                bgcolor: alpha(brandColors.emerald, 0.15),
              }}
            >
              <User size={20} color={brandColors.emerald} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}
              >
                {asesorLabel}
              </Typography>
              {isLoadingAsesores ? (
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  Verificando...
                </Typography>
              ) : asesorName ? (
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  {asesorName}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: brandColors.error }}>
                  No verificado - Contacta al administrador
                </Typography>
              )}
            </Box>
            {matchedAsesor && (
              <Chip
                label="Verificado"
                size="small"
                sx={{
                  bgcolor: alpha(brandColors.emerald, 0.15),
                  color: brandColors.emerald,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default ClientInfoSection;
