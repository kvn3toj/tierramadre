import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as AIIcon,
  Add as AddIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCalendar } from '../hooks/useCalendar';
import { useEmeralds } from '../hooks/useEmeralds';
import { useAI } from '../hooks/useAI';
import { Emerald, InstagramPost } from '../types';
import { brandColors } from '../theme';

export default function CalendarGrid() {
  const { posts, addPost, scheduledCount, draftCount } = useCalendar();
  const { emeralds } = useEmeralds();
  const { generateCaption } = useAI();

  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#TierraMadre #EsmeraldasColombianas #Esmeraldas');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get week days for calendar
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleEmeraldSelect = (emerald: Emerald) => {
    setSelectedEmerald(emerald);
    setCaption(emerald.aiDescription || '');
    setDialogOpen(true);
  };

  const handleGenerateCaption = async () => {
    if (!selectedEmerald) return;
    setGeneratingCaption(true);
    const generated = await generateCaption(selectedEmerald.name, selectedEmerald.aiDescription || '');
    if (generated) {
      setCaption(generated);
    }
    setGeneratingCaption(false);
  };

  const handleSchedule = () => {
    if (!selectedEmerald) return;

    addPost({
      emeraldId: selectedEmerald.id,
      caption,
      hashtags: hashtags.split(' ').filter(h => h.startsWith('#')),
      scheduledDate,
      status: 'scheduled',
    });

    setDialogOpen(false);
    setSelectedEmerald(null);
    setCaption('');
  };

  const handleCopyCaption = (post: InstagramPost) => {
    const fullCaption = `${post.caption}\n\n${post.hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPostsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return posts.filter(p => p.scheduledDate?.startsWith(dateStr));
  };

  const getEmeraldForPost = (post: InstagramPost) => {
    return emeralds.find(e => e.id === post.emeraldId);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: '"Libre Baskerville", serif' }}>
            Calendario de Instagram
          </Typography>
          <Typography variant="body2" color="grey.500">
            Planifica y programa tu contenido
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip label={`${scheduledCount} programados`} color="primary" />
          <Chip label={`${draftCount} borradores`} variant="outlined" />
        </Box>
      </Box>

      {/* Stats */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: brandColors.darkSurface }}>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <InstagramIcon sx={{ fontSize: 40, color: '#E4405F' }} />
          <Box>
            <Typography variant="caption" color="grey.500">
              Posts programados esta semana
            </Typography>
            <Typography variant="h4" sx={{ color: brandColors.gold }}>
              {posts.filter(p => {
                const postDate = new Date(p.scheduledDate);
                return postDate >= weekStart && postDate <= addDays(weekStart, 7);
              }).length}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Week Calendar View */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Esta Semana
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {weekDays.map((day) => {
          const dayPosts = getPostsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <Grid item xs={12} sm={6} md key={day.toString()}>
              <Paper
                sx={{
                  p: 2,
                  minHeight: 150,
                  border: isToday ? `2px solid ${brandColors.emeraldGreen}` : 'none',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isToday ? brandColors.emeraldGreen : 'grey.400',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {format(day, 'EEE d', { locale: es })}
                </Typography>

                {dayPosts.length > 0 ? (
                  dayPosts.map((post) => {
                    const emerald = getEmeraldForPost(post);
                    return (
                      <Box
                        key={post.id}
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: brandColors.darkBg,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        {emerald && (
                          <img
                            src={emerald.imageUrl}
                            alt={emerald.name}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 4,
                              objectFit: 'cover',
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                          <Typography variant="caption" noWrap>
                            {emerald?.name || 'Post'}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyCaption(post)}
                        >
                          {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                        </IconButton>
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="caption" color="grey.600" sx={{ mt: 2, display: 'block' }}>
                    Sin posts
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Instagram Grid Preview */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Vista de Grid Instagram (3x3)
      </Typography>
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={0.5} sx={{ maxWidth: 400 }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const post = posts.filter(p => p.status === 'scheduled')[i];
            const emerald = post ? getEmeraldForPost(post) : null;

            return (
              <Grid item xs={4} key={i}>
                <Box
                  sx={{
                    aspectRatio: '1',
                    bgcolor: emerald ? 'transparent' : brandColors.darkSurface,
                    border: `1px solid ${brandColors.emeraldGreen}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {emerald ? (
                    <img
                      src={emerald.imageUrl}
                      alt={emerald.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Typography variant="caption" color="grey.600">
                      {i + 1}
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Available Emeralds to Schedule */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Esmeraldas disponibles para publicar
      </Typography>
      {emeralds.length === 0 ? (
        <Alert severity="info">
          No hay esmeraldas en la galería. Sube algunas primero.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {emeralds
            .filter(e => e.status === 'available')
            .slice(0, 8)
            .map((emerald) => (
              <Grid item xs={6} sm={4} md={3} key={emerald.id}>
                <Card
                  onClick={() => handleEmeraldSelect(emerald)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { transform: 'scale(1.02)' },
                    transition: 'transform 0.2s',
                  }}
                >
                  <CardMedia
                    component="img"
                    height="120"
                    image={emerald.imageUrl}
                    alt={emerald.name}
                  />
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="body2" noWrap>
                      {emerald.name}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      sx={{ mt: 1 }}
                    >
                      Programar
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Programar Post: {selectedEmerald?.name}
        </DialogTitle>
        <DialogContent>
          {selectedEmerald && (
            <Box sx={{ mb: 2 }}>
              <img
                src={selectedEmerald.imageUrl}
                alt={selectedEmerald.name}
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
            </Box>
          )}

          <TextField
            fullWidth
            label="Fecha de publicación"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2">Caption</Typography>
            <Button
              size="small"
              startIcon={<AIIcon />}
              onClick={handleGenerateCaption}
              disabled={generatingCaption}
            >
              {generatingCaption ? 'Generando...' : 'Generar con IA'}
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escribe el caption para Instagram..."
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#TierraMadre #Esmeraldas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSchedule}
            variant="contained"
            disabled={!caption}
            sx={{ bgcolor: brandColors.emeraldGreen }}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
