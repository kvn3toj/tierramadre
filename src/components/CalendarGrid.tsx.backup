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
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { Calendar, Instagram, Copy, Plus, Sparkles, Clock, FileEdit, LayoutGrid } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCalendar } from '../hooks/useCalendar';
import { useEmeralds } from '../hooks/useEmeralds';
import { useAI } from '../hooks/useAI';
import { Emerald, InstagramPost } from '../types';
import { studioColors, studioGradients, studioShadows } from './PremiumHeader';

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

  const weekPostsCount = posts.filter(p => {
    const postDate = new Date(p.scheduledDate);
    return postDate >= weekStart && postDate <= addDays(weekStart, 7);
  }).length;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* TM Studio Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 3,
          background: studioGradients.header,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: studioShadows.card,
        }}
      >
        {/* Emerald accent line */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: studioGradients.emerald,
          }}
        />
        <Box sx={{ p: 3, pt: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  bgcolor: alpha(studioColors.emerald, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${alpha(studioColors.emerald, 0.3)}`,
                }}
              >
                <Calendar size={26} color={studioColors.emerald} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: studioColors.emerald,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    mb: 0.25,
                  }}
                >
                  TM STUDIO
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Calendario Instagram
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 400 }}>
                  Planifica y programa tu contenido
                </Typography>
              </Box>
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(studioColors.emerald, 0.1),
                  border: `1px solid ${alpha(studioColors.emerald, 0.2)}`,
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1, fontFamily: 'monospace' }}>
                  {scheduledCount}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                  Programados
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(studioColors.emerald, 0.2),
                  border: `1px solid ${alpha(studioColors.emerald, 0.3)}`,
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: studioColors.emeraldLight, lineHeight: 1, fontFamily: 'monospace' }}>
                  {draftCount}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                  Borradores
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: `1px solid ${studioColors.border}`,
              bgcolor: studioColors.surface,
              boxShadow: studioShadows.card,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: alpha('#E4405F', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Instagram size={22} color="#E4405F" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: studioColors.textPrimary, lineHeight: 1, fontFamily: 'monospace' }}>
                  {weekPostsCount}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: studioColors.textSecondary, fontWeight: 500 }}>
                  Esta semana
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: alpha(studioColors.emerald, 0.06),
              border: `1px solid ${alpha(studioColors.emerald, 0.2)}`,
              boxShadow: studioShadows.card,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: alpha(studioColors.emerald, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={22} color={studioColors.emerald} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: studioColors.emerald, lineHeight: 1, fontFamily: 'monospace' }}>
                  {scheduledCount}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: studioColors.emerald, fontWeight: 500 }}>
                  Programados
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: alpha(studioColors.gold, 0.06),
              border: `1px solid ${alpha(studioColors.gold, 0.2)}`,
              boxShadow: studioShadows.card,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: alpha(studioColors.gold, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileEdit size={22} color={studioColors.gold} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: studioColors.gold, lineHeight: 1, fontFamily: 'monospace' }}>
                  {draftCount}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: studioColors.gold, fontWeight: 500 }}>
                  Borradores
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: `1px solid ${studioColors.border}`,
              bgcolor: studioColors.surface,
              boxShadow: studioShadows.card,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: alpha(studioColors.dark, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LayoutGrid size={22} color={studioColors.darkSoft} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: studioColors.textPrimary, lineHeight: 1, fontFamily: 'monospace' }}>
                  {emeralds.filter(e => e.status === 'available').length}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: studioColors.textSecondary, fontWeight: 500 }}>
                  Disponibles
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Week Calendar View */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2.5,
          border: `1px solid ${studioColors.border}`,
          bgcolor: studioColors.surface,
          boxShadow: studioShadows.card,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(studioColors.emerald, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={18} color={studioColors.emerald} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: studioColors.textPrimary }}>
            Esta Semana
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {weekDays.map((day) => {
            const dayPosts = getPostsForDay(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <Grid item xs={12} sm={6} md key={day.toString()}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    minHeight: 150,
                    borderRadius: 2,
                    border: isToday ? `2px solid ${studioColors.emerald}` : `1px solid ${studioColors.border}`,
                    bgcolor: isToday ? alpha(studioColors.emerald, 0.04) : studioColors.surfaceMuted,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: studioColors.emerald,
                      boxShadow: studioShadows.md,
                    },
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: isToday ? studioColors.emerald : studioColors.textSecondary,
                      fontWeight: isToday ? 700 : 600,
                      textTransform: 'capitalize',
                      mb: 1.5,
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
                            p: 1.5,
                            bgcolor: studioColors.surface,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            border: `1px solid ${studioColors.border}`,
                            boxShadow: studioShadows.sm,
                          }}
                        >
                          {emerald && (
                            <img
                              src={emerald.imageUrl}
                              alt={emerald.name}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                objectFit: 'cover',
                              }}
                            />
                          )}
                          <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{ fontWeight: 600, color: studioColors.textPrimary }}
                            >
                              {emerald?.name || 'Post'}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyCaption(post)}
                            sx={{
                              color: copied ? studioColors.emerald : studioColors.textMuted,
                              '&:hover': { bgcolor: alpha(studioColors.emerald, 0.1) },
                            }}
                          >
                            {copied ? <CheckIcon fontSize="small" /> : <Copy size={16} />}
                          </IconButton>
                        </Box>
                      );
                    })
                  ) : (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        textAlign: 'center',
                        borderRadius: 2,
                        border: `2px dashed ${studioColors.border}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: studioColors.textMuted }}>
                        Sin posts
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Instagram Grid Preview */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2.5,
          border: `1px solid ${studioColors.border}`,
          bgcolor: studioColors.surface,
          boxShadow: studioShadows.card,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha('#E4405F', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LayoutGrid size={18} color="#E4405F" />
          </Box>
          <Typography sx={{ fontWeight: 700, color: studioColors.textPrimary }}>
            Vista de Grid Instagram (3x3)
          </Typography>
        </Box>

        <Box
          sx={{
            maxWidth: 400,
            mx: 'auto',
            borderRadius: 2.5,
            overflow: 'hidden',
            border: `1px solid ${studioColors.border}`,
          }}
        >
          <Grid container spacing={0.5} sx={{ bgcolor: studioColors.surfaceMuted }}>
            {Array.from({ length: 9 }).map((_, i) => {
              const post = posts.filter(p => p.status === 'scheduled')[i];
              const emerald = post ? getEmeraldForPost(post) : null;

              return (
                <Grid item xs={4} key={i}>
                  <Box
                    sx={{
                      aspectRatio: '1',
                      bgcolor: emerald ? 'transparent' : studioColors.surfaceElevated,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      '&:hover': emerald ? {
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          bgcolor: 'rgba(0,0,0,0.3)',
                        },
                      } : {},
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
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          bgcolor: studioColors.border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.75rem', color: studioColors.textMuted, fontWeight: 600 }}>
                          {i + 1}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Paper>

      {/* Available Emeralds to Schedule */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2.5,
          border: `1px solid ${studioColors.border}`,
          bgcolor: studioColors.surface,
          boxShadow: studioShadows.card,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(studioColors.emerald, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color={studioColors.emerald} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: studioColors.textPrimary }}>
            Esmeraldas disponibles para publicar
          </Typography>
        </Box>

        {emeralds.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: alpha(studioColors.emerald, 0.04),
              border: `1px solid ${alpha(studioColors.emerald, 0.1)}`,
            }}
          >
            <Typography sx={{ color: studioColors.emerald, fontWeight: 500 }}>
              No hay esmeraldas en la galería. Sube algunas primero.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {emeralds
              .filter(e => e.status === 'available')
              .slice(0, 8)
              .map((emerald) => (
                <Grid item xs={6} sm={4} md={3} key={emerald.id}>
                  <Card
                    elevation={0}
                    onClick={() => handleEmeraldSelect(emerald)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2.5,
                      border: `1px solid ${studioColors.border}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: studioShadows.lg,
                        borderColor: studioColors.emerald,
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={emerald.imageUrl}
                      alt={emerald.name}
                      sx={{ borderRadius: '10px 10px 0 0' }}
                    />
                    <CardContent sx={{ p: 2 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 600, color: studioColors.textPrimary, mb: 1 }}
                      >
                        {emerald.name}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Plus size={16} />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          color: studioColors.emerald,
                          bgcolor: alpha(studioColors.emerald, 0.08),
                          borderRadius: 2,
                          px: 2,
                          '&:hover': {
                            bgcolor: alpha(studioColors.emerald, 0.15),
                          },
                        }}
                      >
                        Programar
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        )}
      </Paper>

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
            sx={{ bgcolor: studioColors.emerald, '&:hover': { bgcolor: studioColors.emeraldDark } }}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
