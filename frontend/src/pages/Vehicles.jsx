import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TwoWheeler,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll({ search: searchTerm });
      setVehicles(response.data.vehicles || []);
    } catch (err) {
      setError('שגיאה בטעינת כלים');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadVehicles();
  };

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success' },
      waiting_for_rider: { label: 'ממתין לרוכב', color: 'warning' },
      faulty: { label: 'תקול', color: 'error' },
      unfit: { label: 'לא כשיר', color: 'error' },
      stolen_lost: { label: 'גנוב/אבוד', color: 'error' },
      decommissioned: { label: 'מושבת', color: 'default' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getTypeLabel = (type) => {
    return type === 'scooter' ? 'קטנוע' : 'אופנוע';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול כלים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
        >
          כלי חדש
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
            placeholder="חפש לפי מספר רישוי, מספר פנימי או דגם..."
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

      {/* טבלת כלים */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>מס' רישוי</TableCell>
              <TableCell>מס' פנימי</TableCell>
              <TableCell>סוג</TableCell>
              <TableCell>יצרן</TableCell>
              <TableCell>דגם</TableCell>
              <TableCell>שנה</TableCell>
              <TableCell>ק"מ נוכחי</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Box sx={{ py: 4 }}>
                    <TwoWheeler sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography color="textSecondary">
                      לא נמצאו כלים
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="500">
                      {vehicle.licensePlate}
                    </Typography>
                  </TableCell>
                  <TableCell>{vehicle.internalNumber || '-'}</TableCell>
                  <TableCell>{getTypeLabel(vehicle.type)}</TableCell>
                  <TableCell>{vehicle.manufacturer}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell>
                    {vehicle.currentKilometers?.toLocaleString('he-IL') || '0'}
                  </TableCell>
                  <TableCell>{getStatusChip(vehicle.status)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    >
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
      {!loading && vehicles.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            נמצאו {vehicles.length} כלים
          </Typography>
        </Box>
      )}
    </Box>
  );
}
