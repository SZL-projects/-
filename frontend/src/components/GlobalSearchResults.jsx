import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Person,
  TwoWheeler,
  Warning,
  Assignment,
  Build,
} from '@mui/icons-material';

const TYPE_LABELS = {
  riders: 'רוכבים',
  vehicles: 'כלים',
  faults: 'תקלות',
  tasks: 'משימות',
  maintenance: 'טיפולים',
};

const TYPE_ICONS = {
  riders: <Person />,
  vehicles: <TwoWheeler />,
  faults: <Warning />,
  tasks: <Assignment />,
  maintenance: <Build />,
};

export default function GlobalSearchResults({
  results,
  totalCount,
  isLoading,
  isOpen,
  onClose,
  onNavigate,
  activeIndex,
  inline = false,
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleItemClick = (item) => {
    navigate(item.url);
    if (onClose) onClose();
    if (onNavigate) onNavigate(item);
  };

  // רשימה שטוחה לניווט מקלדת
  const allItems = [];
  Object.values(results).forEach((items) => {
    items.forEach((item) => allItems.push(item));
  });

  const hasResults = totalCount > 0;

  return (
    <Paper
      elevation={inline ? 0 : 6}
      sx={{
        position: inline ? 'static' : 'absolute',
        top: inline ? 'auto' : '100%',
        right: 0,
        left: 0,
        mt: 0.5,
        maxHeight: inline ? 'none' : 400,
        overflowY: 'auto',
        zIndex: inline ? 'auto' : 9999,
        borderRadius: inline ? '8px' : '12px',
        border: inline ? 'none' : '1px solid #e2e8f0',
        boxShadow: inline ? 'none' : undefined,
      }}
    >
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!isLoading && !hasResults && (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            לא נמצאו תוצאות
          </Typography>
        </Box>
      )}

      {!isLoading && hasResults && (
        <List dense sx={{ py: 0.5 }}>
          {Object.entries(results).map(([type, items], groupIdx) => {
            // חישוב אינדקס שטוח לתחילת הקבוצה
            let flatOffset = 0;
            const keys = Object.keys(results);
            for (let i = 0; i < groupIdx; i++) {
              flatOffset += results[keys[i]].length;
            }

            return (
              <Box key={type}>
                {groupIdx > 0 && <Divider />}
                <ListItem sx={{ py: 0.5, px: 2 }}>
                  <ListItemIcon sx={{ minWidth: 28, color: '#6366f1' }}>
                    {TYPE_ICONS[type]}
                  </ListItemIcon>
                  <Typography
                    variant="overline"
                    sx={{
                      fontWeight: 700,
                      color: '#6366f1',
                      letterSpacing: 1,
                      fontSize: '0.7rem',
                    }}
                  >
                    {TYPE_LABELS[type] || type}
                  </Typography>
                </ListItem>
                {items.map((item, itemIdx) => {
                  const flatIdx = flatOffset + itemIdx;
                  const isActive = flatIdx === activeIndex;
                  return (
                    <ListItemButton
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      selected={isActive}
                      sx={{
                        py: 1,
                        px: 2,
                        borderRadius: '8px',
                        mx: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(99, 102, 241, 0.08)',
                        },
                        '&:hover': {
                          bgcolor: 'rgba(99, 102, 241, 0.05)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={item.title}
                        secondary={item.subtitle}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          fontSize: '0.9rem',
                          noWrap: true,
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          noWrap: true,
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </Box>
            );
          })}
        </List>
      )}
    </Paper>
  );
}
