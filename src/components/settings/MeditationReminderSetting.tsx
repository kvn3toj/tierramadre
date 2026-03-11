/**
 * MeditationReminderSetting Component
 *
 * Settings UI for configuring daily meditation reminders.
 * Includes time picker and enable/disable toggle.
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import { AccessTime, Notifications } from '@mui/icons-material';
import { useMeditationReminder } from '../../hooks/useMeditationReminder';
import { requestPermission, getPermissionStatus } from '../../services/notifications';
import { fontWeights } from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';

export default function MeditationReminderSetting() {
  const {
    enabled,
    hour,
    minute,
    formattedTime,
    setReminder,
    disableReminder,
    isNotificationEnabled,
  } = useMeditationReminder();

  const { t } = useLanguage();
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  const handleToggle = async () => {
    if (enabled) {
      disableReminder();
    } else {
      // Check notification permission first
      if (!isNotificationEnabled) {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }
      setTimeDialogOpen(true);
    }
  };

  const handleSaveTime = () => {
    setReminder(selectedHour, selectedMinute);
    setTimeDialogOpen(false);
  };

  const handleEditTime = () => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setTimeDialogOpen(true);
  };

  const permissionStatus = getPermissionStatus();

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
          px: 2,
          bgcolor: 'var(--surface-secondary)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: enabled ? 'primary.main' : 'action.disabledBackground',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Notifications sx={{ color: 'common.white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight={fontWeights.medium}>
              {t.settings.meditationReminder}
            </Typography>
            {enabled ? (
              <Button
                size="small"
                startIcon={<AccessTime />}
                onClick={handleEditTime}
                sx={{ mt: 0.5, p: 0, minWidth: 'auto', textTransform: 'none' }}
              >
                {formattedTime}
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {t.settings.dailyReminderHint}
              </Typography>
            )}
          </Box>
        </Box>
        <Switch
          checked={enabled}
          onChange={handleToggle}
          disabled={permissionStatus === 'denied'}
          inputProps={{ 'aria-label': t.settings.meditationReminder }}
        />
      </Box>

      {permissionStatus === 'denied' && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t.settings.notificationPermissionRequired}
        </Alert>
      )}

      {/* Time Picker Dialog */}
      <Dialog open={timeDialogOpen} onClose={() => setTimeDialogOpen(false)}>
        <DialogTitle>{t.settings.reminderTime}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t.settings.reminderTimePrompt}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <TextField
              label={t.settings.timeHour}
              type="number"
              value={selectedHour}
              onChange={(e) => setSelectedHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
              inputProps={{ min: 0, max: 23 }}
              sx={{ width: 100 }}
            />
            <TextField
              label={t.settings.timeMinute}
              type="number"
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: 100 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            {t.settings.timeFormatHint}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeDialogOpen(false)}>{t.actions.cancel}</Button>
          <Button variant="contained" onClick={handleSaveTime}>
            {t.actions.save}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
