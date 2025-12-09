/**
 * Home Page Component
 *
 * Daily emerald content hub with:
 * - Hero with streak counter
 * - Daily Oracle fact (rotates daily)
 * - Meditation card
 * - New products showcase
 * - Knowledge gems categories
 *
 * Design: Moksart (UX/Gamification) + Rachel (Trust Architecture)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  LocalFireDepartment,
  Share,
  Bookmark,
  BookmarkBorder,
  PlayArrow,
  Pause,
  ExpandMore,
  CheckCircle,
  CircleOutlined,
  ArrowForward,
  Close,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useInventory } from '../hooks/useInventory';
import { InventoryItem } from '../types';
import { DAILY_ORACLES, KNOWLEDGE_CATEGORIES, DAILY_MEDITATIONS } from '../data/homeContent';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { inventory } = useInventory();

  // Streak tracking
  const [streak] = useState(() => {
    const saved = localStorage.getItem('tierra-madre-streak');
    if (saved) {
      const data = JSON.parse(saved);
      const today = new Date().toDateString();
      const lastVisit = new Date(data.lastVisit).toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastVisit === today) {
        return data;
      } else if (lastVisit === yesterday) {
        return { current: data.current + 1, lastVisit: today, longest: Math.max(data.longest, data.current + 1) };
      } else {
        return { current: 1, lastVisit: today, longest: data.longest };
      }
    }
    return { current: 1, lastVisit: new Date().toDateString(), longest: 1 };
  });

  // Save streak on change
  useEffect(() => {
    localStorage.setItem('tierra-madre-streak', JSON.stringify(streak));
  }, [streak]);

  // Saved facts
  const [savedFacts, setSavedFacts] = useState<number[]>(() => {
    const saved = localStorage.getItem('tierra-madre-saved-facts');
    return saved ? JSON.parse(saved) : [];
  });

  // Meditation state
  const [meditationPlaying, setMeditationPlaying] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0);
  const [completedMeditations, setCompletedMeditations] = useState(() => {
    const saved = localStorage.getItem('tierra-madre-meditations');
    return saved ? parseInt(saved) : 0;
  });

  // Fact detail modal
  const [selectedFact, setSelectedFact] = useState<typeof DAILY_ORACLES[0] | null>(null);

  // Get daily oracle based on day of year
  const dailyOracle = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DAILY_ORACLES[dayOfYear % DAILY_ORACLES.length];
  }, []);

  // Get daily meditation
  const dailyMeditation = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    return DAILY_MEDITATIONS[dayOfWeek];
  }, []);

  // Get newest products (last 3)
  const newProducts = useMemo(() => {
    return [...inventory]
      .sort((a: InventoryItem, b: InventoryItem) => (b.item || 0) - (a.item || 0))
      .slice(0, 3);
  }, [inventory]);

  // Handle save fact
  const handleSaveFact = (factId: number) => {
    const newSaved = savedFacts.includes(factId)
      ? savedFacts.filter(id => id !== factId)
      : [...savedFacts, factId];
    setSavedFacts(newSaved);
    localStorage.setItem('tierra-madre-saved-facts', JSON.stringify(newSaved));
  };

  // Handle share
  const handleShare = async (text: string) => {
    if (navigator.share) {
      await navigator.share({
        title: 'Tierra Madre - Sabiduría Esmeralda',
        text: text,
        url: window.location.origin,
      });
    }
  };

  // Meditation timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (meditationPlaying && meditationTime < dailyMeditation.duration) {
      interval = setInterval(() => {
        setMeditationTime(prev => {
          if (prev + 1 >= dailyMeditation.duration) {
            setMeditationPlaying(false);
            const newCount = completedMeditations + 1;
            setCompletedMeditations(newCount);
            localStorage.setItem('tierra-madre-meditations', String(newCount));
            return dailyMeditation.duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meditationPlaying, meditationTime, dailyMeditation.duration, completedMeditations]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ pb: 12, minHeight: '100vh', bgcolor: 'var(--surface-primary)' }}>
      {/* Hero Section */}
      <Card
        sx={{
          m: 2,
          background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
          color: 'white',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t.pages.home.welcome} 🌿
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
            Tu viaje esmeralda continúa
          </Typography>

          {/* Streak Counter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<LocalFireDepartment sx={{ color: '#FF6B6B !important' }} />}
              label={`${streak.current} ${streak.current === 1 ? 'día' : 'días'}`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#FF6B6B' },
              }}
            />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Racha actual • Récord: {streak.longest} días
            </Typography>
          </Box>

          {/* Daily Quote */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
              "La esmeralda es el espejo del alma - refleja tu verdad interior"
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
              — Proverbio colombiano
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Daily Oracle */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t.pages.home.dailyFact}
        </Typography>
        <Card
          sx={{
            borderLeft: '4px solid #10B981',
            bgcolor: 'var(--surface-secondary)',
            cursor: 'pointer',
          }}
          onClick={() => setSelectedFact(dailyOracle)}
        >
          <CardContent sx={{ p: 2 }}>
            <Chip
              label="Descubrimiento del Día"
              size="small"
              sx={{ bgcolor: '#10B98120', color: '#10B981', mb: 1.5, fontWeight: 600 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#10B98120', width: 56, height: 56, fontSize: '1.8rem' }}>
                {dailyOracle.icon}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {dailyOracle.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'var(--text-secondary)', mt: 0.5, lineHeight: 1.5 }}
                >
                  {dailyOracle.content.substring(0, 100)}...
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button
                    size="small"
                    startIcon={savedFacts.includes(dailyOracle.id) ? <Bookmark /> : <BookmarkBorder />}
                    onClick={(e) => { e.stopPropagation(); handleSaveFact(dailyOracle.id); }}
                    sx={{ color: 'var(--text-secondary)' }}
                  >
                    {savedFacts.includes(dailyOracle.id) ? 'Guardado' : 'Guardar'}
                  </Button>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleShare(dailyOracle.content); }}
                  >
                    <Share fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Meditation Card */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t.pages.home.meditation}
        </Typography>
        <Card
          sx={{
            bgcolor: 'var(--surface-secondary)',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(4,120,87,0.1) 100%)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  🧘‍♀️ {dailyMeditation.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
                  {dailyMeditation.description}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                  {formatTime(dailyMeditation.duration - meditationTime)} restantes
                </Typography>
              </Box>
              <IconButton
                onClick={() => setMeditationPlaying(!meditationPlaying)}
                sx={{
                  bgcolor: '#10B981',
                  color: 'white',
                  width: 56,
                  height: 56,
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                {meditationPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(meditationTime / dailyMeditation.duration) * 100}
              sx={{ mt: 2, borderRadius: 1, bgcolor: 'rgba(16,185,129,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }}
            />
            <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', display: 'block', mt: 1 }}>
              {completedMeditations} meditaciones completadas este mes
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* New Products */}
      {newProducts.length > 0 && (
        <Box sx={{ px: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {t.pages.home.newProducts}
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/inventory')}
              sx={{ color: '#10B981' }}
            >
              Ver Todo
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
            {newProducts.map((product: InventoryItem) => (
              <Card
                key={product.item}
                sx={{
                  minWidth: 160,
                  bgcolor: 'var(--surface-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onClick={() => navigate(`/product/${product.item}`)}
              >
                <CardMedia
                  component="img"
                  height="120"
                  image={product.imagen || '/placeholder-emerald.jpg'}
                  alt={product.nombre}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }} noWrap>
                    {product.nombre}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                    {typeof product.peso === 'number' ? `${product.peso} ct` : product.peso}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Knowledge Gems */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          💎 Gemas de Conocimiento
        </Typography>
        {KNOWLEDGE_CATEGORIES.map((category) => (
          <Accordion
            key={category.id}
            sx={{
              bgcolor: 'var(--surface-secondary)',
              mb: 1,
              '&:before': { display: 'none' },
              borderRadius: '12px !important',
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ bgcolor: `${category.color}20`, color: category.color, width: 40, height: 40 }}>
                  {category.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {category.title}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (savedFacts.length / category.facts) * 100)}
                    sx={{
                      mt: 0.5,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: `${category.color}20`,
                      '& .MuiLinearProgress-bar': { bgcolor: category.color },
                    }}
                  />
                </Box>
                <Chip label={`${Math.min(savedFacts.length, category.facts)}/${category.facts}`} size="small" />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <List dense>
                {DAILY_ORACLES.filter(f => f.category === category.id).map((fact) => (
                  <ListItemButton
                    key={fact.id}
                    onClick={() => setSelectedFact(fact)}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {savedFacts.includes(fact.id) ? (
                        <CheckCircle sx={{ color: category.color }} />
                      ) : (
                        <CircleOutlined sx={{ color: 'var(--text-tertiary)' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={fact.title}
                      secondary={fact.content.substring(0, 60) + '...'}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Fact Detail Modal */}
      <Dialog
        open={!!selectedFact}
        onClose={() => setSelectedFact(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'var(--surface-secondary)' } }}
      >
        {selectedFact && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: '#10B98120', fontSize: '1.5rem' }}>{selectedFact.icon}</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedFact.title}</Typography>
              </Box>
              <IconButton onClick={() => setSelectedFact(null)}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'var(--text-primary)', mb: 2 }}>
                {selectedFact.content}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                Fuente: {selectedFact.source}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                <Button
                  variant={savedFacts.includes(selectedFact.id) ? 'contained' : 'outlined'}
                  startIcon={savedFacts.includes(selectedFact.id) ? <Bookmark /> : <BookmarkBorder />}
                  onClick={() => handleSaveFact(selectedFact.id)}
                  sx={{ flex: 1 }}
                >
                  {savedFacts.includes(selectedFact.id) ? 'Guardado' : 'Guardar'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={() => handleShare(selectedFact.content)}
                  sx={{ flex: 1 }}
                >
                  Compartir
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Home;
