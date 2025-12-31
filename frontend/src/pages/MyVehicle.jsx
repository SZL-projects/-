import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TwoWheeler,
  DirectionsCar,
  CalendarMonth,
  Build,
  Warning,
  CheckCircle,
  Info,
  Speed,
  LocalGasStation,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { vehiclesAPI, ridersAPI, faultsAPI } from '../services/api';

export default function MyVehicle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [rider, setRider] = useState(null);
  const [recentFaults, setRecentFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyVehicle();
  }, [user]);

  const loadMyVehicle = async () => {
    try {
      setLoading(true);

      // בדיקה אם למשתמש יש riderId
      if (!user?.riderId) {
        setError('משתמש זה אינו משויך לרוכב');
        setLoading(false);
        return;
      }

      // טעינת פרטי הרוכב
      const riderResponse = await ridersAPI.getById(user.riderId);
      const riderData = riderResponse.data.rider;
      setRider(riderData);

      // בדיקה אם הרוכב משויך לכלי
      if (!riderData.isAssigned || !riderData.assignedVehicleId) {
        setError('אינך משויך לכלי כרגע');
        setLoading(false);
        return;
      }

      // טעינת פרטי הכלי
      const vehicleResponse = await vehiclesAPI.getById(riderData.assignedVehicleId);
      setVehicle(vehicleResponse.data.vehicle);

      // טעינת תקלות אחרונות
      try {
        const faultsResponse = await faultsAPI.getAll();
        const vehicleFaults = faultsResponse.data.faults
          .filter(fault => fault.vehicleId === riderData.assignedVehicleId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5); // 5 תקלות אחרונות
        setRecentFaults(vehicleFaults);
      } catch (err) {
        console.error('Error loading faults:', err);
      }

      setError('');
    } catch (err) {
      console.error('Error loading vehicle:', err);
      setError('שגיאה בטעינת פרטי הכלי');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      active: { label: 'פעיל', color: 'success', icon: <CheckCircle /> },
      maintenance: { label: 'בתחזוקה', color: 'warning', icon: <Build /> },
      out_of_service: { label: 'לא תקין', color: 'error', icon: <Warning /> },
      reserved: { label: 'שמור', color: 'info', icon: <Info /> },
    };
    const { label, color, icon } = statusMap[status] || { label: status, color: 'default', icon: null };
    return <Chip label={label} color={color} size="medium" icon={icon} />;
  };

  const getFaultStatusChip = (status) => {
    const statusMap = {
      open: { label: 'פתוחה', color: 'error' },
      in_progress: { label: 'בטיפול', color: 'warning' },
      resolved: { label: 'טופלה', color: 'success' },
      closed: { label: 'סגורה', color: 'default' },
    };
    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        {!user?.riderId && (
          <Typography variant="body2" color="textSecondary">
            אנא פנה למנהל המערכת לשיוך חשבון המשתמש לרוכב
          </Typography>
        )}
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <TwoWheeler sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          לא נמצא כלי משויך
        </Typography>
        <Typography color="textSecondary">
          כרגע אינך משויך לכלי רכב
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          הכלי שלי
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {rider?.firstName} {rider?.lastName}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* פרטי הכלי */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DirectionsCar /> פרטי הכלי
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    מספר כלי
                  </Typography>
                  <Typography variant="h5" fontWeight="500">
                    {vehicle.vehicleNumber || vehicle.internalNumber || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    סטטוס
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(vehicle.status)}
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    מספר רישוי
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.licensePlate || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    סוג כלי
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.type || 'אופנוע'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    יצרן ודגם
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.manufacturer || '-'} {vehicle.model || ''}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    שנת ייצור
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.year || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* תחזוקה ובדיקות */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Build /> תחזוקה ובדיקות
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    תחזוקה אחרונה
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.lastMaintenanceDate
                      ? new Date(vehicle.lastMaintenanceDate).toLocaleDateString('he-IL')
                      : 'לא בוצעה'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    תחזוקה הבאה
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.nextMaintenanceDate
                      ? new Date(vehicle.nextMaintenanceDate).toLocaleDateString('he-IL')
                      : 'לא נקבעה'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    קילומטר אחרון
                  </Typography>
                  <Typography variant="body1" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Speed fontSize="small" />
                    {vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} ק"מ` : '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    צריכת דלק
                  </Typography>
                  <Typography variant="body1" fontWeight="500" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocalGasStation fontSize="small" />
                    {vehicle.fuelConsumption ? `${vehicle.fuelConsumption} ל'/100` : '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    תוקף ביטוח
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {vehicle.insuranceExpiry
                      ? new Date(vehicle.insuranceExpiry).toLocaleDateString('he-IL')
                      : 'לא הוזן'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* תקלות אחרונות */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning /> תקלות אחרונות
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/my-faults')}
                >
                  צפה בכל התקלות
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {recentFaults.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
                  <Typography color="textSecondary">
                    אין תקלות רשומות
                  </Typography>
                </Box>
              ) : (
                <List>
                  {recentFaults.map((fault, index) => (
                    <ListItem
                      key={fault.id || index}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemIcon>
                        <Warning color={fault.severity === 'critical' ? 'error' : 'warning'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="500">
                              {fault.description || 'ללא תיאור'}
                            </Typography>
                            {getFaultStatusChip(fault.status)}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="textSecondary">
                            {fault.reportedDate
                              ? new Date(fault.reportedDate).toLocaleDateString('he-IL')
                              : new Date(fault.createdAt).toLocaleDateString('he-IL')}
                            {fault.severity && ` • חומרה: ${fault.severity === 'critical' ? 'קריטית' : fault.severity === 'high' ? 'גבוהה' : fault.severity === 'medium' ? 'בינונית' : 'נמוכה'}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* הערות */}
        {vehicle.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info /> הערות
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1">
                  {vehicle.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
