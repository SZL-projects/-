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
} from '@mui/material';
import { Search, Person, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { ridersAPI } from '../services/api';

export default function RiderAccessDialog({ open, onClose, onSave, userName, selectedIds = [] }) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await ridersAPI.getAll({ limit: 500 });
        setRiders(res.data.riders || res.data || []);
      } catch {
        setRiders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (open) {
      setSelected([...selectedIds]);
      setSearch('');
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return riders;
    const s = search.toLowerCase();
    return riders.filter(r =>
      (r.firstName || '').toLowerCase().includes(s) ||
      (r.lastName || '').toLowerCase().includes(s) ||
      (r.idNumber || '').toLowerCase().includes(s) ||
      (r.phone || '').toLowerCase().includes(s)
    );
  }, [riders, search]);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const allIds = filtered.map(r => r._id || r.id);
    const allSelected = allIds.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const allFilteredSelected = filtered.length > 0 &&
    filtered.every(r => selected.includes(r._id || r.id));
  const someFilteredSelected = filtered.some(r => selected.includes(r._id || r.id));

  const getStatusLabel = (r) => {
    if (r.riderStatus === 'active' || r.status === 'active') return 'פעיל';
    if (r.riderStatus === 'inactive' || r.status === 'inactive') return 'לא פעיל';
    return r.riderStatus || r.status || '-';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Person sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              הרשאות צפייה ברוכבים
            </Typography>
            {userName && (
              <Typography variant="caption" sx={{ color: '#64748b' }}>{userName}</Typography>
            )}
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={`${selected.length} נבחרו`}
              size="small"
              sx={{
                bgcolor: selected.length > 0 ? 'rgba(16, 185, 129, 0.1)' : '#f1f5f9',
                color: selected.length > 0 ? '#059669' : '#94a3b8',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <TextField
          fullWidth size="small"
          placeholder="חפש לפי שם, ת.ז, טלפון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#f8fafc' } }}
        />
      </Box>

      <DialogContent sx={{ pt: 1, pb: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#10b981' }} />
          </Box>
        ) : riders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
            <Person sx={{ fontSize: 48, mb: 1 }} />
            <Typography>לא נמצאו רוכבים</Typography>
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
                      checkedIcon={<CheckBox sx={{ fontSize: 20, color: '#10b981' }} />}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>שם</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>ת.ז</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>טלפון</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>סטטוס</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((rider) => {
                  const rid = rider._id || rider.id;
                  const isChecked = selected.includes(rid);
                  return (
                    <TableRow
                      key={rid}
                      onClick={() => toggle(rid)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isChecked ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                        '&:hover': { bgcolor: isChecked ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc' },
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ pl: 2 }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggle(rid)}
                          onClick={(e) => e.stopPropagation()}
                          icon={<CheckBoxOutlineBlank sx={{ fontSize: 20 }} />}
                          checkedIcon={<CheckBox sx={{ fontSize: 20, color: '#10b981' }} />}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: isChecked ? 600 : 400, color: '#1e293b' }}>
                        {rider.firstName} {rider.lastName}
                      </TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{rider.idNumber || '-'}</TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{rider.phone || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(rider)}
                          size="small"
                          sx={{
                            bgcolor: (rider.riderStatus === 'active' || rider.status === 'active')
                              ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                            color: (rider.riderStatus === 'active' || rider.status === 'active')
                              ? '#059669' : '#64748b',
                            fontWeight: 600, fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        <Button onClick={onClose} variant="outlined"
          sx={{ borderRadius: '10px', px: 3, fontWeight: 600, borderColor: '#e2e8f0', color: '#64748b' }}>
          ביטול
        </Button>
        <Button
          onClick={() => onSave(selected)}
          variant="contained"
          sx={{
            borderRadius: '10px', px: 3, fontWeight: 600,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}
        >
          שמור ({selected.length} רוכבים)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
