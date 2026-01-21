import { useState } from 'react';
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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Person,
  TwoWheeler,
  Assignment,
  Build,
  Warning,
  Assessment,
  Logout,
  AccountCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  People,
  Description,
  Lock,
  DirectionsBike,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordDialog from './ChangePasswordDialog';

const drawerWidth = 260;
const drawerWidthClosed = 65;

// תפריט לאופנוען - רק למשתמשים עם role 'rider'
const riderMenuItems = [
  { text: 'הכלי שלי', icon: <TwoWheeler />, path: '/my-vehicle' },
  { text: 'התקלות שלי', icon: <Warning />, path: '/my-faults' },
  { text: 'הפרופיל שלי', icon: <Person />, path: '/my-profile' },
];

// תפריט לניהול - למשתמשים עם הרשאות ניהול
const managementMenuItems = [
  { text: 'דשבורד', icon: <Dashboard />, path: '/dashboard' },
  { text: 'רוכבים', icon: <Person />, path: '/riders' },
  { text: 'כלים', icon: <TwoWheeler />, path: '/vehicles' },
  { text: 'משימות', icon: <Assignment />, path: '/tasks' },
  { text: 'בקרה חודשית', icon: <Build />, path: '/monthly-checks' },
  { text: 'תקלות', icon: <Warning />, path: '/faults' },
  { text: 'דוחות', icon: <Assessment />, path: '/reports' },
  { text: 'יוצר טפסים', icon: <Description />, path: '/form-builder' },
  { text: 'משתמשים', icon: <People />, path: '/users' },
  { text: 'הגדרות', icon: <Settings />, path: '/settings', adminOnly: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, logout, hasRole, hasAnyRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // בדיקה אם יש למשתמש הרשאות ניהול
  const hasManagementRole = hasAnyRole(['super_admin', 'manager', 'secretary', 'logistics', 'regional_manager']);
  // בדיקה אם המשתמש הוא רוכב
  const isRider = hasRole('rider');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path) => {
    // סגור את התפריט קודם
    setMobileOpen(false);
    // נווט אחרי שה-Drawer נסגר
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2,
        px: drawerOpen ? 2 : 1,
        minHeight: 64
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', flex: 1 }}>
          <TwoWheeler sx={{ fontSize: 40, color: 'primary.main', flexShrink: 0 }} />
          {drawerOpen && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                צי לוג ידידים
              </Typography>
              <Typography variant="caption" color="text.secondary">
                גרסה 3.17.0
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
            ml: 'auto'
          }}
        >
          {drawerOpen ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {/* קטגוריית אופנוען - רק אם יש role rider */}
        {isRider && (
          <>
            {drawerOpen && (
              <ListItem>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', px: 1 }}>
                  🏍️ אופנוען
                </Typography>
              </ListItem>
            )}
            {riderMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerOpen ? 'initial' : 'center',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: drawerOpen ? 2 : 'auto',
                      justifyContent: 'center'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {drawerOpen && <ListItemText primary={item.text} />}
                </ListItemButton>
              </ListItem>
            ))}
            {hasManagementRole && <Divider sx={{ my: 1 }} />}
          </>
        )}

        {/* קטגוריית ניהול - רק אם יש הרשאות ניהול */}
        {hasManagementRole && (
          <>
            {drawerOpen && (
              <ListItem>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', px: 1 }}>
                  📊 ניהול
                </Typography>
              </ListItem>
            )}
            {managementMenuItems.map((item) => {
              // אם הפריט מיועד רק לאדמין, בדוק אם המשתמש הוא super_admin
              if (item.adminOnly && !hasRole('super_admin')) {
                return null;
              }

              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: 2.5,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: drawerOpen ? 2 : 'auto',
                        justifyContent: 'center'
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {drawerOpen && <ListItemText primary={item.text} />}
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
          onClose={() => setMobileOpen(false)}
          anchor="right"
          ModalProps={{
            keepMounted: false,
            disableScrollLock: false,
            disablePortal: false,
            disableEnforceFocus: true,
            disableAutoFocus: true,
          }}
          transitionDuration={{ enter: 200, exit: 150 }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar sx={{ justifyContent: 'space-between', py: 2, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TwoWheeler sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                    צי לוג ידידים
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    גרסה 3.17.0
                  </Typography>
                </Box>
              </Box>
            </Toolbar>
            <Divider />
            <List sx={{ flexGrow: 1 }}>
              {/* קטגוריית אופנוען - מובייל */}
              {isRider && (
                <>
                  <ListItem>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', px: 1 }}>
                      🏍️ אופנוען
                    </Typography>
                  </ListItem>
                  {riderMenuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                      <ListItemButton
                        selected={location.pathname === item.path}
                        onClick={() => handleMenuClick(item.path)}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  {hasManagementRole && <Divider sx={{ my: 1 }} />}
                </>
              )}

              {/* קטגוריית ניהול - מובייל */}
              {hasManagementRole && (
                <>
                  <ListItem>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', px: 1 }}>
                      📊 ניהול
                    </Typography>
                  </ListItem>
                  {managementMenuItems.map((item) => {
                    // אם הפריט מיועד רק לאדמין, בדוק אם המשתמש הוא super_admin
                    if (item.adminOnly && !hasRole('super_admin')) {
                      return null;
                    }

                    return (
                      <ListItem key={item.text} disablePadding>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => handleMenuClick(item.path)}
                        >
                          <ListItemIcon>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} />
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
          sx={{
            width: { xs: '100%', sm: `calc(100% - ${drawerOpen ? drawerWidth : drawerWidthClosed}px)` },
            right: { xs: 0, sm: `${drawerOpen ? drawerWidth : drawerWidthClosed}px` },
            left: 'auto',
            transition: 'width 0.3s, right 0.3s',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ ml: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ display: { xs: 'none', md: 'block' }, mr: 2 }}>
              מערכת CRM - צי לוג ידידים
            </Typography>

            {/* Global Search - Desktop */}
            <Box sx={{ flexGrow: 1, maxWidth: 400, display: { xs: 'none', sm: 'block' } }}>
              <TextField
                size="small"
                placeholder="חיפוש כללי..."
                variant="outlined"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'white' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'white',
                    },
                  },
                }}
                sx={{
                  '& input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    opacity: 1,
                  },
                }}
              />
            </Box>

            {/* Search Icon - Mobile */}
            <Box sx={{ flexGrow: 1, display: { xs: 'block', sm: 'none' } }} />
            <IconButton
              color="inherit"
              onClick={() => setSearchOpen(true)}
              sx={{ display: { xs: 'flex', sm: 'none' }, mr: 1 }}
            >
              <Search />
            </IconButton>

            {/* User Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <IconButton
                size="large"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              dir="rtl"
            >
              <MenuItem disabled>
                <Typography variant="body2">
                  {(() => {
                    const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
                    const roleLabels = {
                      'super_admin': 'מנהל על',
                      'manager': 'מנהל',
                      'secretary': 'מזכירה',
                      'logistics': 'לוגיסטיקה',
                      'rider': 'רוכב',
                      'regional_manager': 'מנהל אזורי'
                    };
                    return userRoles.map(r => roleLabels[r] || r).join(' • ');
                  })()}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleChangePassword}>
                <ListItemIcon>
                  <Lock fontSize="small" />
                </ListItemIcon>
                <ListItemText>שינוי סיסמה</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>התנתק</ListItemText>
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
        onClose={() => setSearchOpen(false)}
        fullWidth
        maxWidth="sm"
        dir="rtl"
      >
        <DialogTitle>חיפוש</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            placeholder="חפש רוכבים, כלים, משימות..."
            variant="outlined"
            sx={{ mt: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
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
