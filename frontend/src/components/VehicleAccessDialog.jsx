import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Checkbox,
  InputAdornment,
  Chip,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControlLabel,
} from '@mui/material';
import { Search, TwoWheeler, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';

export default function VehicleAccessDialog({ open, onClose, onSave, userName, selectedIds = [] }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  // טעינת כלים
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await vehiclesAPI.getAll();
        setVehicles(res.data.vehicles || []);
      } catch {
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  // איפוס בחירה עם פתיחת הדיאלוג
  useEffect(() => {
    if (open) {
      setSelected([...selectedIds]);
      setSearch('');
    }
  }, [open, selectedIds]);

  // סינון לפי חיפוש
  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const s = search.toLowerCase();
    return vehicles.filter(v =>
      (v.licensePlate || '').toLowerCase().includes(s) ||
      (v.internalNumber || '').toLowerCase().includes(s) ||
      (v.manufacturer || '').toLowerCase().includes(s) ||
      (v.model || '').toLowerCase().includes(s)
    );
  }, [vehicles, search]);

  // קבוצות לפי סוג
  const groups = useMemo(() => {
    const scooters = filtered.filter(v => v.type === 'scooter');
    const motorcycles = filtered.filter(v => v.type !== 'scooter');
    return [
      { label: 'אופנועים', vehicles: motorcycles },
      { label: 'קטנועים', vehicles: scooters },
    ].filter(g => g.vehicles.length > 0);
  }, [filtered]);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const allIds = filtered.map(v => v._id || v.id);
    const allSelected = allIds.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const allFilteredSelected = filtered.length > 0 &&
    filtered.every(v => selected.includes(v._id || v.id));
  const someFilteredSelected = filtered.some(v => selected.includes(v._id || v.id));

  const getTypeLabel = (type) => type === 'scooter' ? 'קטנוע' : 'אופנוע';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TwoWheeler sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              הרשאות צפייה בכלים
            </Typography>
            {userName && (
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {userName}
              </Typography>
            )}
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={`${selected.length} נבחרו`}
              size="small"
              sx={{
                bgcolor: selected.length > 0 ? 'rgba(99, 102, 241, 0.1)' : '#f1f5f9',
                color: selected.length > 0 ? '#6366f1' : '#94a3b8',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="חפש לפי ל&quot;ז, מספר פנימי, יצרן..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              bgcolor: '#f8fafc',
            },
          }}
        />
      </Box>

      <DialogContent sx={{ pt: 1, pb: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#6366f1' }} />
          </Box>
        ) : vehicles.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
            <TwoWheeler sx={{ fontSize: 48, mb: 1 }} />
            <Typography>לא נמצאו כלים</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell padding="checkbox" sx={{ pl: 2 }}>
                    <Checkbox
                      checked={allFilteredSelected}
                      indeterminate={!allFilteredSelected && someFilteredSelected}
                      onChange={toggleAll}
                      icon={<CheckBoxOutlineBlank sx={{ fontSize: 20 }} />}
                      checkedIcon={<CheckBox sx={{ fontSize: 20, color: '#6366f1' }} />}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>מספר רישוי (ל"ז)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>מספר פנימי</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>יצרן ודגם</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>סוג</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>סטטוס</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group) => (
                  <>
                    {/* כותרת קבוצה */}
                    <TableRow key={`group-${group.label}`} sx={{ bgcolor: '#f1f5f9' }}>
                      <TableCell colSpan={6} sx={{ py: 0.5, px: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {group.label} ({group.vehicles.length})
                        </Typography>
                      </TableCell>
                    </TableRow>

                    {group.vehicles.map((vehicle) => {
                      const vid = vehicle._id || vehicle.id;
                      const isChecked = selected.includes(vid);
                      return (
                        <TableRow
                          key={vid}
                          onClick={() => toggle(vid)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isChecked ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                            '&:hover': { bgcolor: isChecked ? 'rgba(99, 102, 241, 0.08)' : '#f8fafc' },
                            transition: 'background-color 0.15s',
                          }}
                        >
                          <TableCell padding="checkbox" sx={{ pl: 2 }}>
                            <Checkbox
                              checked={isChecked}
                              onChange={() => toggle(vid)}
                              onClick={(e) => e.stopPropagation()}
                              icon={<CheckBoxOutlineBlank sx={{ fontSize: 20 }} />}
                              checkedIcon={<CheckBox sx={{ fontSize: 20, color: '#6366f1' }} />}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: isChecked ? 600 : 400, color: '#1e293b' }}>
                            {vehicle.licensePlate || '-'}
                          </TableCell>
                          <TableCell sx={{ color: '#64748b' }}>
                            {vehicle.internalNumber || '-'}
                          </TableCell>
                          <TableCell sx={{ color: '#64748b' }}>
                            {vehicle.manufacturer} {vehicle.model}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getTypeLabel(vehicle.type)}
                              size="small"
                              sx={{
                                bgcolor: vehicle.type === 'scooter' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                color: vehicle.type === 'scooter' ? '#2563eb' : '#6366f1',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={vehicle.status === 'active' ? 'פעיל' : vehicle.status === 'waiting_for_rider' ? 'ממתין' : vehicle.status || '-'}
                              size="small"
                              sx={{
                                bgcolor: vehicle.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                color: vehicle.status === 'active' ? '#059669' : '#64748b',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button
          onClick={() => setSelected([])}
          variant="text"
          sx={{ color: '#ef4444', fontWeight: 600, mr: 'auto' }}
        >
          נקה הכול
        </Button>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px', px: 3, fontWeight: 600, borderColor: '#e2e8f0', color: '#64748b' }}>
          ביטול
        </Button>
        <Button
          onClick={() => onSave(selected)}
          variant="contained"
          sx={{
            borderRadius: '10px',
            px: 3,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          }}
        >
          שמור ({selected.length} כלים)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
