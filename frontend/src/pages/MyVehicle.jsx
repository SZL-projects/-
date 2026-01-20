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
  FolderOpen,
  OpenInNew,
  Description,
  Visibility,
  Download,
  Assignment,
  HourglassEmpty,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { vehiclesAPI, ridersAPI, faultsAPI, monthlyChecksAPI } from '../services/api';

export default function MyVehicle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [rider, setRider] = useState(null);
  const [recentFaults, setRecentFaults] = useState([]);
  const [monthlyChecks, setMonthlyChecks] = useState([]);
  const [insuranceFiles, setInsuranceFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyVehicle();
  }, [user]);

  const loadInsuranceFiles = async (folderId, vehicleId) => {
    try {
      setFilesLoading(true);
      // רוכבים רואים את כל הקבצים בתיקיית הביטוחים הנוכחיים
      const response = await vehiclesAPI.listFiles(folderId, vehicleId, true);
      setInsuranceFiles(response.data.files || []);
    } catch (err) {
      console.error('ERROR loading files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  const loadMyVehicle = async () => {
    try {
      setLoading(true);

      let vehicleId = null;
      let riderData = null;

      // נסיון 1: אם למשתמש יש riderId - נסה לטעון את הכלי המשויך לרוכב
      if (user?.riderId) {
        try {
          const riderResponse = await ridersAPI.getById(user.riderId);
          riderData = riderResponse.data.rider;
          setRider(riderData);

          if (riderData.assignmentStatus === 'assigned' && riderData.assignedVehicleId) {
            vehicleId = riderData.assignedVehicleId;
          }
        } catch (err) {
          console.error('Error loading rider:', err);
        }
      }

      // נסיון 2: אם אין riderId, נחפש את הרוכב לפי username
      if (!riderData && user?.username) {
        try {
          // חיפוש כל הרוכבים
          const ridersResponse = await ridersAPI.getAll();
          const allRiders = ridersResponse.data.riders || ridersResponse.data;

          // חיפוש רוכב עם username תואם או שם תואם
          const matchedRider = allRiders.find(r =>
            (r.username && r.username.toLowerCase() === user.username.toLowerCase()) ||
            (`${r.firstName} ${r.lastName}`.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase())
          );

          if (matchedRider) {
            riderData = matchedRider;
            setRider(riderData);

            if (riderData.assignmentStatus === 'assigned' && riderData.assignedVehicleId) {
              vehicleId = riderData.assignedVehicleId;
            } else if (riderData.isAssigned && riderData.assignedVehicleId) {
              vehicleId = riderData.assignedVehicleId;
            }
          }
        } catch (err) {
          console.error('Error searching for rider:', err);
        }
      }

      // נסיון 3: אם לא נמצא כלי משויך, בדוק אם יש הרשאות גישה לכלים
      if (!vehicleId && user?.vehicleAccess && user.vehicleAccess.length > 0) {
        // נבחר את הכלי הראשון ברשימת ההרשאות
        vehicleId = user.vehicleAccess[0];
      }

      // אם אין כלי - הצג הודעה ידידותית
      if (!vehicleId) {
        setError('אינך משויך לכלי כרגע. אנא פנה למנהל המערכת לשיוך לכלי.');
        setLoading(false);
        return;
      }

      // טעינת פרטי הכלי
      const vehicleResponse = await vehiclesAPI.getById(vehicleId);
      const vehicleData = vehicleResponse.data.vehicle;
      setVehicle(vehicleData);

      // טעינת קבצי ביטוח (אם יש תיקיית ביטוח)
      if (vehicleData.insuranceFolderId) {
        loadInsuranceFiles(vehicleData.insuranceFolderId, vehicleId);
      }

      // טעינת תקלות אחרונות
      try {
        const faultsResponse = await faultsAPI.getAll();
        const vehicleFaults = faultsResponse.data.faults
          .filter(fault => fault.vehicleId === vehicleId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5); // 5 תקלות אחרונות
        setRecentFaults(vehicleFaults);
      } catch (err) {
        console.error('Error loading faults:', err);
      }

      // טעינת בקרות חודשיות - לפי vehicleId או riderId
      try {
        const riderId = riderData?.id || riderData?._id;
        const checksResponse = await monthlyChecksAPI.getAll({ vehicleId, riderId });
        const checks = checksResponse.data.monthlyChecks || [];
        // מיון לפי תאריך - החדשות קודם
        checks.sort((a, b) => {
          const dateA = a.checkDate?.seconds ? new Date(a.checkDate.seconds * 1000) : new Date(a.checkDate);
          const dateB = b.checkDate?.seconds ? new Date(b.checkDate.seconds * 1000) : new Date(b.checkDate);
          return dateB - dateA;
        });
        setMonthlyChecks(checks);
      } catch (err) {
        console.error('Error loading monthly checks:', err);
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
        <Typography variant="body2" color="textSecondary">
          אנא פנה למנהל המערכת לשיוך חשבון המשתמש לרוכב או להוספת הרשאות גישה לכלים
        </Typography>
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

        {/* בקרות חודשיות */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment /> בקרות חודשיות
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {monthlyChecks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Assignment sx={{ fontSize: 60, color: 'text.secondary', mb: 1, opacity: 0.3 }} />
                  <Typography color="textSecondary">
                    אין בקרות חודשיות
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {monthlyChecks.slice(0, 6).map((check) => {
                    const checkDate = check.checkDate?.seconds
                      ? new Date(check.checkDate.seconds * 1000)
                      : new Date(check.checkDate);
                    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
                    const monthName = monthNames[checkDate.getMonth()];
                    const year = checkDate.getFullYear();

                    const statusConfig = {
                      pending: { label: 'ממתין', color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
                      in_progress: { label: 'בתהליך', color: 'info', icon: <HourglassEmpty fontSize="small" /> },
                      completed: { label: 'הושלם', color: 'success', icon: <CheckCircle fontSize="small" /> },
                      overdue: { label: 'באיחור', color: 'error', icon: <Warning fontSize="small" /> },
                      issues: { label: 'יש בעיות', color: 'error', icon: <Warning fontSize="small" /> },
                    };
                    const status = statusConfig[check.status] || statusConfig.pending;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={check.id}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            cursor: check.status === 'pending' ? 'pointer' : 'default',
                            '&:hover': check.status === 'pending' ? {
                              backgroundColor: 'action.hover',
                              borderColor: 'primary.main',
                            } : {},
                          }}
                          onClick={() => {
                            if (check.status === 'pending') {
                              navigate(`/monthly-check/${check.id}`);
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {monthName} {year}
                            </Typography>
                            <Chip
                              label={status.label}
                              color={status.color}
                              size="small"
                              icon={status.icon}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            כלי: {check.vehicleLicensePlate || check.vehiclePlate || vehicle?.licensePlate || '-'}
                          </Typography>
                          {check.status === 'pending' && (
                            <Button
                              variant="contained"
                              size="small"
                              fullWidth
                              sx={{ mt: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/monthly-check/${check.id}`);
                              }}
                            >
                              מלא בקרה
                            </Button>
                          )}
                          {check.status === 'completed' && check.completedAt && (
                            <Typography variant="caption" color="textSecondary">
                              הושלם: {new Date(check.completedAt?.seconds ? check.completedAt.seconds * 1000 : check.completedAt).toLocaleDateString('he-IL')}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
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

        {/* קבצי ביטוח */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description /> קבצי ביטוח
              </Typography>
              <Divider sx={{ my: 2 }} />

              {filesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : insuranceFiles.length > 0 ? (
                <List>
                  {insuranceFiles.map((file) => (
                    <ListItem
                      key={file.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon>
                        <Description color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${new Date(file.createdTime).toLocaleDateString('he-IL')} • ${(file.size / 1024).toFixed(1)} KB`}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => window.open(file.webViewLink, '_blank')}
                        >
                          צפייה
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Download />}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `https://drive.google.com/uc?export=download&id=${file.id}`;
                            link.download = file.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          הורדה
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <Description sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography variant="body2">
                    אין קבצי ביטוח זמינים
                  </Typography>
                </Box>
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
