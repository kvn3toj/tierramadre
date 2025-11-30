// Ambassador Profile Page Component
// Full profile view for an ambassador with all sections

import { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Rating,
  Divider,
  IconButton,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  MapPin,
  MessageCircle,
  Star,
  Clock,
  ShoppingBag,
  Globe,
  Phone,
  Mail,
  Instagram,
  ArrowLeft,
  Share2,
  Heart,
  CheckCircle,
  Calendar,
  Award,
} from 'lucide-react';
import { AmbassadorProfile as AmbassadorProfileType, Testimonial } from '../../types/ambassador';
import { loadTestimonials } from '../../data/ambassadors';
import AmbassadorTrustBadge, { AmbassadorBadgeDisplay } from './AmbassadorTrustBadge';
import { getAmbassadorTrustLevel, getAmbassadorTrustColor } from '../../utils/ambassadorTrust';

interface AmbassadorProfileProps {
  ambassador: AmbassadorProfileType;
  onBack?: () => void;
  onContact?: (ambassador: AmbassadorProfileType) => void;
}

type TabValue = 'about' | 'reviews' | 'portfolio';

export default function AmbassadorProfile({
  ambassador,
  onBack,
  onContact,
}: AmbassadorProfileProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [activeTab, setActiveTab] = useState<TabValue>('about');
  const [isFavorite, setIsFavorite] = useState(false);

  const trustLevel = ambassador.trustScore
    ? getAmbassadorTrustLevel(ambassador.trustScore.overall)
    : null;

  const testimonials = loadTestimonials(ambassador.id);

  return (
    <Box>
      {/* Header with Back Button */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ color: 'text.primary' }}>
            <ArrowLeft size={20} />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          Perfil del Asesor
        </Typography>
        <IconButton onClick={() => setIsFavorite(!isFavorite)}>
          <Heart size={20} fill={isFavorite ? '#EF4444' : 'none'} color={isFavorite ? '#EF4444' : undefined} />
        </IconButton>
        <IconButton>
          <Share2 size={20} />
        </IconButton>
      </Box>

      {/* Hero Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        {/* Banner */}
        <Box
          sx={{
            height: 160,
            background: ambassador.bannerUrl
              ? `url(${ambassador.bannerUrl}) center/cover`
              : `linear-gradient(135deg, ${trustLevel?.color || '#059669'} 0%, ${alpha(trustLevel?.color || '#059669', 0.6)} 100%)`,
          }}
        />

        <CardContent sx={{ pt: 0 }}>
          {/* Avatar + Basic Info Row */}
          <Box sx={{ display: 'flex', gap: 3, mt: -6, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <Avatar
              src={ambassador.photoUrl}
              alt={ambassador.displayName}
              sx={{
                width: 120,
                height: 120,
                bgcolor: '#059669',
                border: '4px solid',
                borderColor: isLight ? '#FFFFFF' : '#1C1C1E',
                fontSize: '3rem',
                fontWeight: 700,
              }}
            >
              {ambassador.displayName.charAt(0)}
            </Avatar>

            {/* Info */}
            <Box sx={{ flex: 1, pt: 7 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {ambassador.displayName}
                </Typography>
                {ambassador.trustScore && (
                  <AmbassadorTrustBadge trustScore={ambassador.trustScore} size="medium" showLabel />
                )}
                {ambassador.verificationStatus.level !== 'unverified' && (
                  <Chip
                    icon={<CheckCircle size={14} />}
                    label="Verificado"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>

              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {ambassador.tagline}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MapPin size={16} style={{ color: isLight ? '#6B7280' : '#9CA3AF' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {ambassador.location.city}, {ambassador.location.country}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Calendar size={16} style={{ color: isLight ? '#6B7280' : '#9CA3AF' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Miembro desde {new Date(ambassador.joinedDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Globe size={16} style={{ color: isLight ? '#6B7280' : '#9CA3AF' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {ambassador.languages.map(l => l.toUpperCase()).join(', ')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Contact Button */}
            <Box sx={{ pt: 7 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<MessageCircle size={20} />}
                onClick={() => onContact?.(ambassador)}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                }}
              >
                Contactar
              </Button>
            </Box>
          </Box>

          {/* Stats Row */}
          {ambassador.reputation && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                mt: 3,
                py: 2,
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
              }}
            >
              <StatBox
                icon={<ShoppingBag size={20} />}
                value={ambassador.reputation.totalSales.toString()}
                label="Ventas Totales"
              />
              <StatBox
                icon={<Star size={20} fill="#F59E0B" color="#F59E0B" />}
                value={ambassador.reputation.averageRating.toFixed(1)}
                label={`${ambassador.reputation.totalReviews} Resenas`}
              />
              <StatBox
                icon={<Clock size={20} />}
                value={`${ambassador.reputation.avgResponseTime}h`}
                label="Tiempo Respuesta"
              />
              <StatBox
                icon={<Heart size={20} />}
                value={`${Math.round(ambassador.reputation.repeatCustomerRate * 100)}%`}
                label="Clientes Recurrentes"
              />
            </Box>
          )}

          {/* Badges */}
          {ambassador.verificationStatus.badges.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <AmbassadorBadgeDisplay badges={ambassador.verificationStatus.badges} maxVisible={6} size="medium" />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 48,
            },
            '& .Mui-selected': {
              color: '#059669',
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#059669',
            },
          }}
        >
          <Tab label="Acerca de" value="about" />
          <Tab label={`Resenas (${testimonials.length})`} value="reviews" />
          <Tab label="Portafolio" value="portfolio" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 'about' && (
        <AboutTab ambassador={ambassador} />
      )}

      {activeTab === 'reviews' && (
        <ReviewsTab ambassador={ambassador} testimonials={testimonials} />
      )}

      {activeTab === 'portfolio' && (
        <PortfolioTab ambassador={ambassador} />
      )}
    </Box>
  );
}

// Stat Box Component
function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
        {icon}
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Box>
  );
}

// About Tab
function AboutTab({ ambassador }: { ambassador: AmbassadorProfileType }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Grid container spacing={3}>
      {/* Bio */}
      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Biografia
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              {ambassador.bio || 'Este asesor aun no ha agregado una biografia.'}
            </Typography>
          </CardContent>
        </Card>

        {/* Specialties */}
        {ambassador.specialties.length > 0 && (
          <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Especialidades
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ambassador.specialties.map((specialty, idx) => (
                  <Box key={idx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Award size={16} color="#059669" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {specialty.name}
                      </Typography>
                      {specialty.yearsExperience && (
                        <Chip
                          label={`${specialty.yearsExperience} anos`}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', pl: 3 }}>
                      {specialty.description}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {ambassador.certifications.length > 0 && (
          <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Certificaciones
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ambassador.certifications.map((cert, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: alpha('#059669', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                      }}
                    >
                      <CheckCircle size={20} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {cert.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {cert.issuingBody} • {new Date(cert.dateIssued).getFullYear()}
                      </Typography>
                    </Box>
                    {cert.verified && (
                      <Chip label="Verificado" size="small" color="success" sx={{ ml: 'auto' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* Sidebar */}
      <Grid item xs={12} md={4}>
        {/* Contact Info */}
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Contacto
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {ambassador.contactMethods.map((contact, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {contact.type === 'whatsapp' && <Phone size={16} />}
                  {contact.type === 'email' && <Mail size={16} />}
                  {contact.type === 'instagram' && <Instagram size={16} />}
                  <Typography variant="body2">{contact.value}</Typography>
                  {contact.verified && <CheckCircle size={12} color="#059669" />}
                </Box>
              ))}
            </Box>

            {ambassador.socialLinks.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Redes Sociales
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {ambassador.socialLinks.map((social, idx) => (
                    <IconButton
                      key={idx}
                      size="small"
                      href={social.url}
                      target="_blank"
                      sx={{
                        bgcolor: isLight ? '#F3F4F6' : '#2C2C2E',
                        '&:hover': { bgcolor: alpha('#059669', 0.1) },
                      }}
                    >
                      {social.platform === 'instagram' && <Instagram size={18} />}
                      {social.platform === 'website' && <Globe size={18} />}
                    </IconButton>
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trust Score Breakdown */}
        {ambassador.trustScore && (
          <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Indice de Confianza
              </Typography>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    color: getAmbassadorTrustColor(ambassador.trustScore.overall),
                  }}
                >
                  {ambassador.trustScore.overall}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  de 100 puntos
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TrustScoreRow label="Historial" value={ambassador.trustScore.components.transactionHistory} />
                <TrustScoreRow label="Satisfaccion" value={ambassador.trustScore.components.customerSatisfaction} />
                <TrustScoreRow label="Respuesta" value={ambassador.trustScore.components.responseTime} />
                <TrustScoreRow label="Experiencia" value={ambassador.trustScore.components.expertise} />
                <TrustScoreRow label="Autenticidad" value={ambassador.trustScore.components.authenticity} />
              </Box>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}

function TrustScoreRow({ label, value }: { label: string; value: number }) {
  const color = getAmbassadorTrustColor(value);
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: alpha(color, 0.15),
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 2,
          },
        }}
      />
    </Box>
  );
}

// Reviews Tab
function ReviewsTab({ ambassador, testimonials }: { ambassador: AmbassadorProfileType; testimonials: Testimonial[] }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  if (testimonials.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Star size={48} style={{ color: '#D1D5DB', marginBottom: 16 }} />
        <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
          Sin resenas aun
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Este asesor aun no ha recibido resenas de clientes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Rating Summary */}
      {ambassador.reputation && (
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 800 }}>
                  {ambassador.reputation.averageRating.toFixed(1)}
                </Typography>
                <Rating value={ambassador.reputation.averageRating} precision={0.1} readOnly />
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {ambassador.reputation.totalReviews} resenas
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = ambassador.reputation?.ratingDistribution[stars as keyof typeof ambassador.reputation.ratingDistribution] || 0;
                  const percentage = ambassador.reputation?.totalReviews
                    ? (count / ambassador.reputation.totalReviews) * 100
                    : 0;
                  return (
                    <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ minWidth: 20 }}>
                        {stars}
                      </Typography>
                      <Star size={12} fill="#F59E0B" color="#F59E0B" />
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: isLight ? '#E5E7EB' : '#2C2C2E',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#F59E0B',
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ minWidth: 30, textAlign: 'right' }}>
                        {count}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {testimonials.map(review => (
          <Card key={review.id} sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#059669' }}>
                    {review.customerName.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {review.customerName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {new Date(review.createdAt).toLocaleDateString('es-CO')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={review.rating} size="small" readOnly />
                  {review.verified && (
                    <Chip
                      icon={<CheckCircle size={12} />}
                      label="Compra Verificada"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {review.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {review.comment}
              </Typography>

              {review.response && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                    borderRadius: 2,
                    borderLeft: '3px solid #059669',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#059669' }}>
                    Respuesta de {ambassador.displayName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {review.response.text}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

// Portfolio Tab
function PortfolioTab({ ambassador }: { ambassador: AmbassadorProfileType }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Award size={48} style={{ color: '#D1D5DB', marginBottom: 16 }} />
      <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
        Portafolio en construccion
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Pronto podras ver el trabajo destacado de {ambassador.displayName}.
      </Typography>
    </Box>
  );
}
