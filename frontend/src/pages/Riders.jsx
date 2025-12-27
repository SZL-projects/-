import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { ridersAPI } from '../services/api';

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadRiders();
  }, []);

  const loadRiders = async () => {
    try {
      setLoading(true);
      const response = await ridersAPI.getAll({ search: searchTerm });
      setRiders(response.data.riders || []);
    } catch (err) {
      setError('שגיאה בטעינת רוכבים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadRiders();
  };

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success' },
      inactive: { label: 'לא פעיל', color: 'default' },
      frozen: { label: 'מוקפא', color: 'warning' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getAssignmentChip = (status) => {
    const statusMap = {
      assigned: { label: 'משויך', color: 'primary' },
      unassigned: { label: 'לא משויך', color: 'default' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול רוכבים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
        >
          רוכב חדש
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* חיפוש */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="חפש לפי שם, ת''ז או טלפון..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            dir="rtl"
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ minWidth: 120 }}
          >
            חיפוש
          </Button>
        </Box>
      </Paper>

      {/* טבלת רוכבים */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם מלא</TableCell>
              <TableCell>ת"ז</TableCell>
              <TableCell>טלפון</TableCell>
              <TableCell>מחוז</TableCell>
              <TableCell>סטטוס רוכב</TableCell>
              <TableCell>סטטוס שיוך</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : riders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary">
                    לא נמצאו רוכבים
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              riders.map((rider) => (
                <TableRow key={rider.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {rider.firstName} {rider.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{rider.idNumber}</TableCell>
                  <TableCell dir="ltr" sx={{ textAlign: 'right' }}>
                    {rider.phone}
                  </TableCell>
                  <TableCell>{rider.region?.district || '-'}</TableCell>
                  <TableCell>{getStatusChip(rider.riderStatus)}</TableCell>
                  <TableCell>{getAssignmentChip(rider.assignmentStatus)}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" size="small">
                      <Visibility />
                    </IconButton>
                    <IconButton color="secondary" size="small">
                      <Edit />
                    </IconButton>
                    <IconButton color="error" size="small">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* סטטיסטיקה */}
      {!loading && riders.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {riders.length} רוכבים
          </Typography>
        </Box>
      )}
    </Box>
  );
}
