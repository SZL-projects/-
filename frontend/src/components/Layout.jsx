import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Person,
  TwoWheeler,
  Assignment,
  Build,
  Warning,
  Logout,
  AccountCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  Lock,
  Settings,
  AccountBalance,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordDialog from './ChangePasswordDialog';
import GlobalSearchResults from './GlobalSearchResults';
import NotificationBell from './NotificationBell';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

const drawerWidth = 280;
const drawerWidthClosed = 72;

// תפריט לאופנוען - רק למשתמשים עם role 'rider'
const riderMenuItems = [
  { text: 'הכלי שלי', icon: <TwoWheeler />, path: '/my-vehicle' },
  { text: 'התקלות שלי', icon: <Warning />, path: '/my-faults' },
  { text: 'הפרופיל שלי', icon: <Person />, path: '/my-profile' },
];

// תפריט לניהול - למשתמשים עם הרשאות ניהול
// permission: שם הישות שצריך הרשאת צפייה אליה כדי לראות את הפריט
const managementMenuItems = [
  { text: 'דשבורד', icon: <Dashboard />, path: '/dashboard' },
  { text: 'רוכבים', icon: <Person />, path: '/riders', permission: 'riders' },
  { text: 'כלים', icon: <TwoWheeler />, path: '/vehicles', permission: 'vehicles' },
  { text: 'משימות', icon: <Assignment />, path: '/tasks', permission: 'tasks' },
  { text: 'בקרה חודשית', icon: <Build />, path: '/monthly-checks', permission: 'monthly_checks' },
  { text: 'תקלות', icon: <Warning />, path: '/faults', permission: 'faults' },
  { text: 'טיפולים', icon: <Build />, path: '/maintenance', permission: 'maintenance' },
  { text: 'תביעות ביטוח', icon: <Assignment />, path: '/insurance-claims', permission: 'insurance_claims' },
  { text: 'קופה', icon: <AccountBalance />, path: '/donations', permission: 'donations' },
  { text: 'הגדרות', icon: <Settings />, path: '/settings', permission: 'settings' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, logout, hasRole, hasAnyRole, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // חיפוש גלובלי
  const search = useGlobalSearch();
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // רשימה שטוחה לניווט מקלדת
  const flatResults = [];
  Object.values(search.results).forEach(items => {
    items.forEach(item => flatResults.push(item));
  });

  // סגירת dropdown בלחיצה מחוץ לאזור
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        search.setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // איפוס אינדקס מקלדת כשהתוצאות משתנות
  useEffect(() => {
    setActiveIndex(-1);
  }, [search.results]);

  // ניווט מקלדת בחיפוש
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      search.setIsOpen(false);
      searchInputRef.current?.blur();
      return;
    }

    if (!search.isOpen || flatResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % flatResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatResults.length) {
          navigate(flatResults[activeIndex].url);
          search.clearSearch();
          setSearchOpen(false);
        }
        break;
    }
  };

  // כשנבחרת תוצאה
  const handleSearchNavigate = () => {
    search.clearSearch();
    setSearchOpen(false);
  };

  // בדיקה אם יש למשתמש הרשאות ניהול (לפחות הרשאת צפייה על משהו)
  const hasManagementAccess = hasRole('super_admin') || managementMenuItems.some(
    item => item.permission && hasPermission(item.permission, 'view')
  );
  // בדיקה אם המשתמש הוא רוכב
  const isRider = hasRole('rider');

  const handleDrawerOpen = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleMenuClick = useCallback((path) => {
    setMobileOpen(false);
    navigate(path);
  }, [navigate]);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = () => {
    setChangePasswordOpen(true);
    handleProfileMenuClose();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
      <Toolbar sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2.5,
        px: drawerOpen ? 2.5 : 1.5,
        minHeight: 72,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden', flex: 1 }}>
          <Box sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}>
            <TwoWheeler sx={{ fontSize: 26, color: '#ffffff' }} />
          </Box>
          {drawerOpen && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1e293b' }}>
                צי לוג
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                v3.23.0
              </Typography>
            </Box>
          )}
        </Box>
        <IconButton
          onClick={() => setDrawerOpen(!drawerOpen)}
          size="small"
          sx={{
            display: { xs: 'none', sm: 'inline-flex' },
            flexShrink: 0,
            ml: 'auto',
            bgcolor: 'rgba(99, 102, 241, 0.08)',
            '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.15)' },
          }}
        >
          {drawerOpen ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <List sx={{ flexGrow: 1, px: 1.5, pt: 2 }}>
        {/* קטגוריית אופנוען - רק אם יש role rider */}
        {isRider && (
          <>
            {drawerOpen && (
              <ListItem sx={{ pb: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 600, color: '#94a3b8', letterSpacing: 1.2, fontSize: '0.7rem' }}>
                  אופנוען
                </Typography>
              </ListItem>
            )}
            {riderMenuItems.map((item) => {
              const isSelected = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: 2,
                      borderRadius: '10px',
                      transition: 'all 0.2s ease-in-out',
                      ...(isSelected && {
                        bgcolor: 'rgba(99, 102, 241, 0.12)',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.18)' },
                      }),
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: drawerOpen ? 2 : 'auto',
                        justifyContent: 'center',
                        color: isSelected ? '#6366f1' : '#64748b',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {drawerOpen && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#6366f1' : '#1e293b',
                          fontSize: '0.9rem',
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
            {hasManagementAccess && <Divider sx={{ my: 2, mx: 1 }} />}
          </>
        )}

        {/* קטגוריית ניהול - רק אם יש הרשאות ניהול */}
        {hasManagementAccess && (
          <>
            {drawerOpen && (
              <ListItem sx={{ pb: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 600, color: '#94a3b8', letterSpacing: 1.2, fontSize: '0.7rem' }}>
                  ניהול
                </Typography>
              </ListItem>
            )}
            {managementMenuItems.map((item) => {
              // בדיקת הרשאות לכל פריט תפריט
              if (item.superAdminOnly && !hasRole('super_admin')) return null;
              if (item.permission && !hasPermission(item.permission, 'view')) return null;

              const isSelected = item.path === '/settings'
                ? location.pathname.startsWith('/settings')
                : location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: 2,
                      borderRadius: '10px',
                      transition: 'all 0.2s ease-in-out',
                      ...(isSelected && {
                        bgcolor: 'rgba(99, 102, 241, 0.12)',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.18)' },
                      }),
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: drawerOpen ? 2 : 'auto',
                        justifyContent: 'center',
                        color: isSelected ? '#6366f1' : '#64748b',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {drawerOpen && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#6366f1' : '#1e293b',
                          fontSize: '0.9rem',
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{
      display: 'flex',
      direction: 'rtl',
      minHeight: '100vh',
      minHeight: '100dvh',
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* Drawer */}
      <Box
        component="nav"
        sx={{
          width: { xs: 0, sm: drawerOpen ? drawerWidth : drawerWidthClosed },
          flexShrink: { sm: 0 },
          transition: 'width 0.3s',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          anchor="right"
          ModalProps={{
            keepMounted: false,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
            },
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
            <Toolbar sx={{
              justifyContent: 'space-between',
              py: 2.5,
              px: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}>
                  <TwoWheeler sx={{ fontSize: 26, color: '#ffffff' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1e293b' }}>
                    צי לוג
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                    v3.23.0
                  </Typography>
                </Box>
              </Box>
            </Toolbar>
            <List sx={{ flexGrow: 1, px: 1.5, pt: 2 }}>
              {/* קטגוריית אופנוען - מובייל */}
              {isRider && (
                <>
                  <ListItem sx={{ pb: 1 }}>
                    <Typography variant="overline" sx={{ fontWeight: 600, color: '#94a3b8', letterSpacing: 1.2, fontSize: '0.7rem' }}>
                      אופנוען
                    </Typography>
                  </ListItem>
                  {riderMenuItems.map((item) => {
                    const isSelected = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => handleMenuClick(item.path)}
                          sx={{
                            borderRadius: '10px',
                            py: 1.5,
                            ...(isSelected && {
                              bgcolor: 'rgba(99, 102, 241, 0.12)',
                              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.18)' },
                            }),
                          }}
                        >
                          <ListItemIcon sx={{ color: isSelected ? '#6366f1' : '#64748b' }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? '#6366f1' : '#1e293b',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                  {hasManagementAccess && <Divider sx={{ my: 2, mx: 1 }} />}
                </>
              )}

              {/* קטגוריית ניהול - מובייל */}
              {hasManagementAccess && (
                <>
                  <ListItem sx={{ pb: 1 }}>
                    <Typography variant="overline" sx={{ fontWeight: 600, color: '#94a3b8', letterSpacing: 1.2, fontSize: '0.7rem' }}>
                      ניהול
                    </Typography>
                  </ListItem>
                  {managementMenuItems.map((item) => {
                    // בדיקת הרשאות לכל פריט תפריט
                    if (item.superAdminOnly && !hasRole('super_admin')) return null;
                    if (item.permission && !hasPermission(item.permission, 'view')) return null;

                    const isSelected = item.path === '/settings'
                      ? location.pathname.startsWith('/settings')
                      : location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => handleMenuClick(item.path)}
                          sx={{
                            borderRadius: '10px',
                            py: 1.5,
                            ...(isSelected && {
                              bgcolor: 'rgba(99, 102, 241, 0.12)',
                              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.18)' },
                            }),
                          }}
                        >
                          <ListItemIcon sx={{ color: isSelected ? '#6366f1' : '#64748b' }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? '#6366f1' : '#1e293b',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </>
              )}
            </List>
          </Box>
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerOpen ? drawerWidth : drawerWidthClosed,
              transition: 'width 0.3s',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { xs: '100%', sm: `calc(100% - ${drawerOpen ? drawerWidth : drawerWidthClosed}px)` },
          transition: 'width 0.3s, margin 0.3s',
          marginRight: { sm: 0 },
          minHeight: '100vh',
          minHeight: '100dvh',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          pb: { xs: 10, sm: 3 },
        }}
      >
        {/* AppBar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { xs: '100%', sm: `calc(100% - ${drawerOpen ? drawerWidth : drawerWidthClosed}px)` },
            right: { xs: 0, sm: `${drawerOpen ? drawerWidth : drawerWidthClosed}px` },
            left: 'auto',
            transition: 'width 0.3s, right 0.3s',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerOpen}
              sx={{
                ml: 2,
                display: { sm: 'none' },
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                display: { xs: 'none', md: 'block' },
                mr: 2,
                fontWeight: 600,
                letterSpacing: '-0.5px',
              }}
            >
              מערכת ניהול צי
            </Typography>

            {/* Global Search - Desktop */}
            <Box
              ref={searchContainerRef}
              sx={{
                flexGrow: 1,
                maxWidth: 400,
                display: { xs: 'none', sm: 'block' },
                position: 'relative',
              }}
            >
              <TextField
                inputRef={searchInputRef}
                size="small"
                placeholder="חיפוש רוכבים, כלים, משימות..."
                variant="outlined"
                fullWidth
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                onFocus={() => {
                  if (search.query.trim().length >= 2) search.setIsOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {search.isLoading ? (
                        <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      ) : (
                        <Search sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      )}
                    </InputAdornment>
                  ),
                  sx: {
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'transparent',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      borderWidth: 1,
                    },
                    transition: 'all 0.2s ease-in-out',
                  },
                }}
                sx={{
                  '& input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.6)',
                    opacity: 1,
                  },
                  '& input::selection': {
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    color: 'white',
                  },
                }}
              />
              <GlobalSearchResults
                results={search.results}
                totalCount={search.totalCount}
                isLoading={search.isLoading}
                isOpen={search.isOpen && search.query.trim().length >= 2}
                onClose={() => search.setIsOpen(false)}
                onNavigate={handleSearchNavigate}
                activeIndex={activeIndex}
              />
            </Box>

            {/* Search Icon - Mobile */}
            <Box sx={{ flexGrow: 1, display: { xs: 'block', sm: 'none' } }} />
            <IconButton
              color="inherit"
              onClick={() => setSearchOpen(true)}
              sx={{
                display: { xs: 'flex', sm: 'none' },
                mr: 1,
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <Search />
            </IconButton>

            {/* פעמון התראות */}
            <NotificationBell />

            {/* User Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                  {(() => {
                    const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
                    const roleLabels = {
                      'super_admin': 'מנהל על',
                      'manager': 'מנהל',
                      'secretary': 'מזכיר',
                      'logistics': 'לוגיסטיקה',
                      'rider': 'רוכב',
                      'regional_manager': 'מנהל אזורי'
                    };
                    return roleLabels[userRoles[0]] || userRoles[0];
                  })()}
                </Typography>
              </Box>
              <IconButton
                size="large"
                onClick={handleProfileMenuOpen}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  color: 'white',
                }}
              >
                <AccountCircle />
              </IconButton>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              dir="rtl"
              PaperProps={{
                sx: {
                  mt: 1.5,
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  minWidth: 200,
                }
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(() => {
                    const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
                    const roleLabels = {
                      'super_admin': 'מנהל על',
                      'manager': 'מנהל',
                      'secretary': 'מזכיר',
                      'logistics': 'לוגיסטיקה',
                      'rider': 'רוכב',
                      'regional_manager': 'מנהל אזורי'
                    };
                    return userRoles.map(r => roleLabels[r] || r).join(' • ');
                  })()}
                </Typography>
              </Box>
              <MenuItem onClick={handleChangePassword} sx={{ py: 1.5, mt: 0.5 }}>
                <ListItemIcon>
                  <Lock fontSize="small" sx={{ color: '#6366f1' }} />
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.9rem' }}>שינוי סיסמה</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#ef4444' }}>
                <ListItemIcon>
                  <Logout fontSize="small" sx={{ color: '#ef4444' }} />
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.9rem' }}>התנתק</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <Outlet />
      </Box>

      {/* Mobile Search Dialog */}
      <Dialog
        open={searchOpen}
        onClose={() => { setSearchOpen(false); search.clearSearch(); }}
        fullWidth
        maxWidth="sm"
        dir="rtl"
      >
        <DialogTitle>חיפוש</DialogTitle>
        <DialogContent sx={{ minHeight: 200 }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="חפש רוכבים, כלים, משימות..."
            variant="outlined"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{ mt: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {search.isLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Search />
                  )}
                </InputAdornment>
              ),
            }}
          />
          {search.query.trim().length >= 2 && (
            <GlobalSearchResults
              results={search.results}
              totalCount={search.totalCount}
              isLoading={search.isLoading}
              isOpen={true}
              onClose={() => { setSearchOpen(false); search.clearSearch(); }}
              onNavigate={handleSearchNavigate}
              activeIndex={activeIndex}
              inline
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </Box>
  );
}
