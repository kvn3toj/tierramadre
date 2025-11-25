import { ReactNode } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Container,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Collections as GalleryIcon,
  CalendarMonth as CalendarIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { TabValue } from '../App';
import { brandColors } from '../theme';

interface LayoutProps {
  children: ReactNode;
  currentTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

export default function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const handleTabChange = (_: React.SyntheticEvent, newValue: TabValue) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="static"
        sx={{
          bgcolor: brandColors.darkSurface,
          borderBottom: `1px solid ${brandColors.emeraldGreen}30`,
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: brandColors.emeraldGreen,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                TM
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Libre Baskerville", serif',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                TIERRA MADRE
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: brandColors.gold,
                  letterSpacing: '0.15em',
                  fontWeight: 500,
                }}
              >
                ESENCIA Y PODER
              </Typography>
            </Box>
          </Box>
        </Toolbar>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            bgcolor: brandColors.darkBg,
            '& .MuiTab-root': {
              color: 'grey.500',
              '&.Mui-selected': {
                color: brandColors.emeraldLight,
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: brandColors.emeraldGreen,
            },
          }}
        >
          <Tab
            value="upload"
            label="Subir"
            icon={<UploadIcon />}
            iconPosition="start"
          />
          <Tab
            value="gallery"
            label="Galería"
            icon={<GalleryIcon />}
            iconPosition="start"
          />
          <Tab
            value="calendar"
            label="Instagram"
            icon={<CalendarIcon />}
            iconPosition="start"
          />
          <Tab
            value="catalog"
            label="Catálogo"
            icon={<PdfIcon />}
            iconPosition="start"
          />
        </Tabs>
      </AppBar>
      <Container
        maxWidth="xl"
        sx={{
          flex: 1,
          py: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Container>
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: 'center',
          borderTop: `1px solid ${brandColors.emeraldGreen}20`,
          bgcolor: brandColors.darkSurface,
        }}
      >
        <Typography variant="caption" color="grey.600">
          Tierra Madre Studio - Internal Advertising Agency
        </Typography>
      </Box>
    </Box>
  );
}
