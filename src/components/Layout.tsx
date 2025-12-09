import { ReactNode, useState, useMemo } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
  Breadcrumbs,
  Link,
  Divider,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
  alpha,
  AppBar,
  Toolbar,
  Autocomplete,
  Paper,
} from '@mui/material';
import {
  Images,
  FileText,
  Instagram,
  Presentation,
  Wand2,
  Receipt,
  Library,
  Calculator,
  Settings,
  ChevronLeft,
  Search,
  Command,
  Menu,
  Sun,
  Moon,
  Package,
  Users,
} from 'lucide-react';
import { TabValue } from '../App';
import { useThemeMode } from '../contexts/ThemeContext';
// Design System Tokens
import { emeraldCore, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

// Professional sidebar dimensions
const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

interface LayoutProps {
  children: ReactNode;
  currentTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

// Navigation configuration with professional grouping
interface NavItem {
  id: TabValue;
  label: string;
  icon: React.ReactNode;
  group: 'primary' | 'tools';
}

const NAVIGATION_ITEMS: NavItem[] = [
  // Primary workflow
  { id: 'gallery', label: 'Galería', icon: <Images size={20} />, group: 'primary' },
  { id: 'inventory', label: 'Inventario', icon: <Package size={20} />, group: 'primary' },
  { id: 'biblioteca', label: 'Show Room', icon: <Library size={20} />, group: 'primary' },
  { id: 'catalog', label: 'Crear Catálogo', icon: <FileText size={20} />, group: 'primary' },
  { id: 'calendar', label: 'Instagram', icon: <Instagram size={20} />, group: 'primary' },
  // Tools
  { id: 'ambassadors', label: 'Asesores', icon: <Users size={20} />, group: 'tools' },
  { id: 'slides', label: 'Crear Presentaciones', icon: <Presentation size={20} />, group: 'tools' },
  { id: 'normalizer', label: 'Normalizar', icon: <Wand2 size={20} />, group: 'tools' },
  { id: 'receipts', label: 'Recibos', icon: <Receipt size={20} />, group: 'tools' },
  { id: 'simulator', label: 'Simulador', icon: <Calculator size={20} />, group: 'tools' },
];

export default function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState<NavItem | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');

  // All navigation items for search
  const allNavItems = useMemo(() => NAVIGATION_ITEMS, []);

  // Theme-aware colors using design system tokens
  const isLight = mode === 'light';
  const colors = {
    sidebar: isLight ? surfacesLight.background.secondary : surfacesDark.background.primary,
    background: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
    text: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
    textActive: emeraldCore.dark,
    textMuted: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
    border: isLight ? surfacesLight.surface.overlay : surfacesDark.surface.overlay,
    hover: isLight ? surfacesLight.surface.overlay : surfacesDark.surface.overlay,
    activeHover: isLight ? alpha(emeraldCore.dark, 0.18) : alpha(emeraldCore.dark, 0.25),
    activeBg: isLight ? alpha(emeraldCore.dark, 0.12) : alpha(emeraldCore.dark, 0.2),
    searchBg: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
    searchBorder: isLight ? surfacesLight.border.light : surfacesDark.border.light,
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (tabId: TabValue) => {
    onTabChange(tabId);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const currentPage = NAVIGATION_ITEMS.find(item => item.id === currentTab);
  const drawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const primaryItems = NAVIGATION_ITEMS.filter(item => item.group === 'primary');
  const toolsItems = NAVIGATION_ITEMS.filter(item => item.group === 'tools');

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: colors.sidebar,
        borderRight: '1px solid',
        borderColor: colors.border,
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: sidebarCollapsed ? 2 : 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/logo-tierra-madre.png"
              alt="Tierra Madre"
              sx={{
                height: 32,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                letterSpacing: '-0.01em',
              }}
            >
              Studio
            </Typography>
          </Box>
        )}
        {sidebarCollapsed && (
          <Box
            component="img"
            src="/logo-tierra-madre.png"
            alt="TM"
            sx={{ height: 28, width: 'auto' }}
          />
        )}
        {!isMobile && (
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: alpha('#000', 0.04) },
            }}
          >
            <ChevronLeft
              size={18}
              style={{
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Primary Navigation */}
      <Box sx={{ px: sidebarCollapsed ? 1 : 1.5, pt: 2 }}>
        {!sidebarCollapsed && (
          <Typography
            variant="overline"
            sx={{
              px: 1.5,
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: colors.textMuted,
              letterSpacing: '0.08em',
            }}
          >
            Principal
          </Typography>
        )}
        <List sx={{ py: 1 }}>
          {primaryItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <Tooltip
                key={item.id}
                title={sidebarCollapsed ? item.label : ''}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.id)}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    minHeight: 42,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    px: sidebarCollapsed ? 1.5 : 2,
                    bgcolor: isActive ? colors.activeBg : 'transparent',
                    color: isActive ? colors.textActive : colors.text,
                    '&:hover': {
                      bgcolor: isActive ? colors.activeHover : colors.hover,
                      color: isActive ? colors.textActive : theme.palette.text.primary,
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: sidebarCollapsed ? 'auto' : 36,
                      color: 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Tools Navigation */}
      <Box sx={{ px: sidebarCollapsed ? 1 : 1.5, pt: 1 }}>
        {!sidebarCollapsed && (
          <Typography
            variant="overline"
            sx={{
              px: 1.5,
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: colors.textMuted,
              letterSpacing: '0.08em',
            }}
          >
            Herramientas
          </Typography>
        )}
        <List sx={{ py: 1 }}>
          {toolsItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <Tooltip
                key={item.id}
                title={sidebarCollapsed ? item.label : ''}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.id)}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    minHeight: 42,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    px: sidebarCollapsed ? 1.5 : 2,
                    bgcolor: isActive ? colors.activeBg : 'transparent',
                    color: isActive ? colors.textActive : colors.text,
                    '&:hover': {
                      bgcolor: isActive ? colors.activeHover : colors.hover,
                      color: isActive ? colors.textActive : theme.palette.text.primary,
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: sidebarCollapsed ? 'auto' : 36,
                      color: 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Divider />

      {/* Settings */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 1.5, pb: 2 }}>
        <Tooltip title={sidebarCollapsed ? 'Configuración' : ''} placement="right" arrow>
          <ListItemButton
            sx={{
              borderRadius: 2,
              minHeight: 42,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              px: sidebarCollapsed ? 1.5 : 2,
              '&:hover': { bgcolor: alpha('#000', 0.04) },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: sidebarCollapsed ? 'auto' : 36,
                color: 'text.secondary',
              }}
            >
              <Settings size={20} />
            </ListItemIcon>
            {!sidebarCollapsed && (
              <ListItemText
                primary="Configuración"
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.background }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: colors.background,
            borderBottom: '1px solid',
            borderColor: colors.border,
          }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: 'text.primary' }}
            >
              <Menu size={22} />
            </IconButton>
            <Box
              component="img"
              src="/logo-tierra-madre.png"
              alt="Tierra Madre"
              sx={{ height: 28, mr: 1.5 }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', flex: 1 }}>
              {currentPage?.label}
            </Typography>
            <IconButton onClick={toggleTheme} sx={{ color: 'text.primary' }}>
              {isLight ? <Moon size={20} /> : <Sun size={20} />}
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: 'none',
              transition: 'width 0.2s ease',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: colors.background,
        }}
      >
        {/* Desktop Header */}
        {!isMobile && (
          <Box
            sx={{
              height: 64,
              borderBottom: '1px solid',
              borderColor: colors.border,
              display: 'flex',
              alignItems: 'center',
              px: 3,
              gap: 3,
              bgcolor: colors.background,
            }}
          >
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ flex: 1 }}>
              <Link
                color="text.secondary"
                href="#"
                onClick={(e) => e.preventDefault()}
                sx={{
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Studio
              </Link>
              <Typography
                color="text.primary"
                sx={{ fontSize: '0.8125rem', fontWeight: 600 }}
              >
                {currentPage?.label}
              </Typography>
            </Breadcrumbs>

            {/* Search Autocomplete */}
            <Autocomplete
              size="small"
              options={allNavItems}
              getOptionLabel={(option) => option.label}
              value={searchValue}
              onChange={(_, newValue) => {
                if (newValue) {
                  handleNavigation(newValue.id);
                  setSearchValue(null);
                  setSearchInputValue('');
                }
              }}
              inputValue={searchInputValue}
              onInputChange={(_, newInputValue) => {
                setSearchInputValue(newInputValue);
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color: colors.textMuted }}>{option.icon}</Box>
                  <Typography sx={{ fontSize: '0.875rem' }}>{option.label}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: colors.textMuted, ml: 'auto' }}>
                    {option.group === 'primary' ? 'Principal' : 'Herramientas'}
                  </Typography>
                </Box>
              )}
              PaperComponent={(props) => (
                <Paper {...props} sx={{ mt: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
              )}
              sx={{ width: 280 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Buscar..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} color={colors.textMuted} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <InputAdornment position="end">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              color: colors.textMuted,
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.border.light,
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 0.75,
                            }}
                          >
                            <Command size={10} />K
                          </Box>
                        </InputAdornment>
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.8125rem',
                      bgcolor: colors.searchBg,
                      '& fieldset': { borderColor: colors.searchBorder },
                      '&:hover fieldset': { borderColor: isLight ? surfacesLight.border.default : surfacesDark.border.default },
                      '&.Mui-focused fieldset': { borderColor: emeraldCore.dark },
                    },
                  }}
                />
              )}
            />

            {/* Theme Toggle */}
            <Tooltip title={isLight ? 'Modo oscuro' : 'Modo claro'}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: colors.textMuted,
                  '&:hover': { bgcolor: colors.hover },
                }}
              >
                {isLight ? <Moon size={20} /> : <Sun size={20} />}
              </IconButton>
            </Tooltip>

            {/* User Avatar */}
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: emeraldCore.dark,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { opacity: 0.9 },
              }}
            >
              TM
            </Avatar>
          </Box>
        )}

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 'calc(56px + 16px)', md: 4 },
            maxWidth: 1400,
            width: '100%',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
