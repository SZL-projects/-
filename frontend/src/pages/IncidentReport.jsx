import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, TextField, FormControl, InputLabel,
  Select, MenuItem, Button, Divider, IconButton, Alert, CircularProgress,
  RadioGroup, FormControlLabel, Radio, FormLabel, Chip, Card, CardContent,
  useMediaQuery, useTheme, Stepper, Step, StepLabel, LinearProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Add, ReportProblem, ArrowBack, ArrowForward, Send, Close,
  Person, DirectionsCar, Place, Gavel, PhotoCamera, People, Delete,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { incidentsAPI, ridersAPI } from '../services/api';

const SECTION_TITLES = [
  'סוג האירוע',
  'פרטי הרוכב',
  'פרטי המקרה',
  'תיאור ועדים',
  'רכבים ונפגעים',
  'תמונות וסיכום',
];

const EMPTY_WITNESS = { idNumber: '', firstName: '', lastName: '', phone: '', relation: '' };
const EMPTY_VEHICLE = { type: '', model: '', plate: '' };

const defaultForm = {
  // סוג אירוע
  eventType: '',
  fault: '',

  // פרטי הרוכב
  riderIdNumber: '',
  riderFirstName: '',
  riderLastName: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  birthDate: '',
  licenseType: 'ישראלי',
  vehiclePlate: '',

  // פרטי המקרה
  incidentDate: new Date().toISOString().split('T')[0],
  incidentTime: '',
  address: '',
  city: '',
  drivingType: '',
  weather: '',
  policeInvolved: 'לא',
  policeStation: '',
  policeCaseNumber: '',

  // תיאור
  description: '',
  diagram: '',
  roadSign: '',
  thirdPartyRoadSign: '',

  // עדים
  witnesses: [{ ...EMPTY_WITNESS }],

  // רכבים מעורבים
  involvedVehicles: [{ ...EMPTY_VEHICLE }],

  // נפגעים
  hasInjuries: 'לא',
  thirdPartyInjuredCount: '',
  insuredInjuredCount: '',

  // סטטוס
  status: 'new',
  notes: '',
};

function isRider(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  return roles.length > 0 && roles.every(r => r === 'rider');
}

export default function IncidentReport() {
  const navigate = useNavigate();
  const { id } = useParams(); // undefined = list/new, 'new' = new form, or doc id = edit
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // רוכב ללא id → מצב רשימה
  const showList = !id && isRider(user);
  const isNewForm = id === 'new';
  const editId = id && id !== 'new' ? id : null;

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]); // [{slot, label, file, preview}]
  const [myIncidents, setMyIncidents] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [riders, setRiders] = useState([]);
  const [selectedRiderId, setSelectedRiderId] = useState('');

  // טעינת נתונים קיימים בעריכה
  useEffect(() => {
    if (editId) {
      loadIncident();
    } else if (!showList) {
      if (isRider(user)) {
        // רוכב — מילוי אוטומטי מהפרופיל
        setFormData(prev => ({
          ...prev,
          riderFirstName: user?.firstName || '',
          riderLastName: user?.lastName || '',
          vehiclePlate: user?.vehiclePlate || '',
        }));
      } else {
        // מנהל — טען רשימת רוכבים
        loadRiders();
      }
    }
  }, [editId]);

  const loadRiders = async () => {
    try {
      const res = await ridersAPI.getAll();
      setRiders(res.data?.riders || []);
    } catch { /* silent */ }
  };

  const handleRiderSelect = (riderId) => {
    setSelectedRiderId(riderId);
    const rider = riders.find(r => r.id === riderId);
    if (rider) {
      setFormData(prev => ({
        ...prev,
        riderFirstName: rider.firstName || '',
        riderLastName: rider.lastName || '',
        riderIdNumber: rider.idNumber || '',
        vehiclePlate: rider.vehiclePlate || rider.assignedVehiclePlate || '',
        birthDate: rider.birthDate || '',
        licenseIssueDate: rider.licenseIssueDate || '',
        licenseExpiryDate: rider.licenseExpiryDate || '',
      }));
    }
  };

  // טעינת רשימת אירועים של הרוכב
  useEffect(() => {
    if (showList) {
      loadMyIncidents();
    }
  }, [showList]);

  const loadMyIncidents = async () => {
    try {
      setListLoading(true);
      const res = await incidentsAPI.getAll();
      // מסנן אירועים מוסתרים
      setMyIncidents((res.data.incidents || []).filter(i => !i.hiddenFromRider));
    } catch {
      setError('שגיאה בטעינת הדיווחים');
    } finally {
      setListLoading(false);
    }
  };

  const loadIncident = async () => {
    try {
      setLoading(true);
      const res = await incidentsAPI.getById(editId);
      const inc = res.data.incident;
      setFormData({
        ...defaultForm,
        ...inc,
        witnesses: inc.witnesses?.length ? inc.witnesses : [{ ...EMPTY_WITNESS }],
        involvedVehicles: inc.involvedVehicles?.length ? inc.involvedVehicles : [{ ...EMPTY_VEHICLE }],
      });
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // עדכון שדה בתוך מערך דינמי
  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData(prev => {
      const arr = [...prev[arrayName]];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [arrayName]: arr };
    });
  };

  const addRow = (arrayName, emptyObj) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], { ...emptyObj }],
    }));
  };

  const removeRow = (arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index),
    }));
  };

  // ולידציה לפי שלב
  const validateStep = () => {
    if (step === 0 && !formData.eventType) {
      setError('יש לבחור סוג אירוע');
      return false;
    }
    if (step === 1 && (!formData.riderFirstName || !formData.riderLastName || !formData.riderIdNumber)) {
      setError('יש למלא שם ותעודת זהות');
      return false;
    }
    if (step === 2 && (!formData.incidentDate || !formData.address)) {
      setError('יש למלא תאריך וכתובת האירוע');
      return false;
    }
    if (step === 3 && !formData.description) {
      setError('יש למלא תיאור האירוע');
      return false;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(s => s - 1);
  };

  // דחיסת תמונה ל-4.5MB מקסימום
  const compressImage = (file) => new Promise((resolve) => {
    const MAX_SIZE = 4.5 * 1024 * 1024;
    if (file.size <= MAX_SIZE || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 1800;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size <= MAX_SIZE || quality <= 0.3) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            quality -= 0.1;
            tryCompress();
          }
        }, 'image/jpeg', quality);
      };
      tryCompress();
    };
    img.src = url;
  });

  const handlePhotoSelect = (slot, label, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setSelectedPhotos(prev => {
      const filtered = prev.filter(p => p.slot !== slot);
      return [...filtered, { slot, label, file, preview }];
    });
  };

  const removePhoto = (slot) => {
    setSelectedPhotos(prev => prev.filter(p => p.slot !== slot));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (saving) return; // מניעת שמירה כפולה
    try {
      setSaving(true);
      setError('');
      setUploadProgress('');

      let incidentId = editId;

      // שמירת הנתונים
      if (editId) {
        await incidentsAPI.update(editId, formData);
      } else {
        const res = await incidentsAPI.create(formData);
        incidentId = res.data.incident.id;
      }

      // העלאת תמונות לDrive אם יש
      if (selectedPhotos.length > 0) {
        for (let i = 0; i < selectedPhotos.length; i++) {
          const photo = selectedPhotos[i];
          setUploadProgress(`מעלה תמונה ${i + 1} מתוך ${selectedPhotos.length}: ${photo.label}...`);
          const compressed = await compressImage(photo.file);
          const fd = new FormData();
          fd.append('file', compressed, compressed.name);
          await incidentsAPI.uploadPhoto(incidentId, fd);
        }
        setUploadProgress('');
      }

      // ניווט מיידי — מניעת פתיחת דיווחים מרובים
      if (!editId) {
        navigate('/incident-report');
      } else {
        setSuccess('הדיווח עודכן בהצלחה!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בשמירה');
      setUploadProgress('');
    } finally {
      setSaving(false);
    }
  };

  // ===== מצב רשימה לרוכב =====
  if (showList) {
    return (
      <Box dir="rtl" sx={{ p: isMobile ? 2 : 3, maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)', flexShrink: 0,
            }}>
              <ReportProblem sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>הדיווחים שלי</Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>אירועים שדיווחת</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/incident-report/new')}
            sx={{
              borderRadius: '10px', fontWeight: 600,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
            }}
          >
            דווח אירוע חדש
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {listLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : myIncidents.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: '16px', textAlign: 'center' }}>
            <ReportProblem sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>אין דיווחים עדיין</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/incident-report/new')}
              sx={{ mt: 2, borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
            >
              דווח אירוע ראשון
            </Button>
          </Paper>
        ) : isMobile ? (
          <Stack spacing={1.5}>
            {myIncidents.map(inc => (
              <Card key={inc.id} sx={{ borderRadius: '14px' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                        {inc.incidentNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#475569' }}>{inc.eventType}</Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>{inc.incidentDate} • {inc.city}</Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/incident-view/${inc.id}`)}
                      sx={{ borderRadius: '8px', color: '#6366f1' }}
                    >
                      צפה
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: '16px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>מספר אירוע</TableCell>
                  <TableCell>תאריך</TableCell>
                  <TableCell>סוג אירוע</TableCell>
                  <TableCell>עיר</TableCell>
                  <TableCell>סטטוס</TableCell>
                  <TableCell align="center">פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myIncidents.map(inc => (
                  <TableRow key={inc.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={{ fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                      {inc.incidentNumber}
                    </TableCell>
                    <TableCell>{inc.incidentDate || '-'}</TableCell>
                    <TableCell>{inc.eventType || '-'}</TableCell>
                    <TableCell>{inc.city || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={inc.status === 'new' ? 'חדש' : inc.status === 'in_progress' ? 'בטיפול' : inc.status || 'חדש'}
                        sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/incident-view/${inc.id}`)}
                        sx={{ borderRadius: '8px', color: '#6366f1' }}
                      >
                        צפה
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ p: isMobile ? 2 : 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{
          width: 56, height: 56, borderRadius: '16px',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          flexShrink: 0,
        }}>
          <ReportProblem sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: '#1e293b' }}>
            טופס דיווח אירוע
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {editId ? 'עריכת דיווח קיים' : 'דיווח תאונה / אירוע - אופנוע ידידים'}
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Stepper
          activeStep={step}
          alternativeLabel={!isMobile}
          orientation={isMobile ? 'horizontal' : 'horizontal'}
          sx={{ '& .MuiStepLabel-label': { fontSize: isMobile ? '0.65rem' : '0.8rem' } }}
        >
          {SECTION_TITLES.map((label, i) => (
            <Step key={i} completed={i < step}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label.Mui-active': { color: '#ef4444', fontWeight: 700 },
                  '& .MuiStepIcon-root.Mui-active': { color: '#ef4444' },
                  '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
                }}
              >
                {!isMobile && label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {/* ===== שלב 0: סוג האירוע ===== */}
        {step === 0 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <SectionHeader icon={<ReportProblem />} title="סוג האירוע ואחריות" color="#ef4444" />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>סוג האירוע *</InputLabel>
                <Select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  label="סוג האירוע *"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="תאונת דרכים עם מעורבות רכב נוסף">תאונת דרכים עם מעורבות רכב נוסף</MenuItem>
                  <MenuItem value="תאונת דרכים עם מעורבות הולך רגל">תאונת דרכים עם מעורבות הולך רגל</MenuItem>
                  <MenuItem value="תאונה עצמית">תאונה עצמית</MenuItem>
                  <MenuItem value="נזק בלבד (לא בנסיעה)">נזק בלבד (לא בנסיעה)</MenuItem>
                  <MenuItem value="גניבה">גניבה</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset">
                <FormLabel sx={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem', mb: 0.5 }}>
                  מי לדעתך אשם באירוע?
                </FormLabel>
                <RadioGroup
                  row
                  name="fault"
                  value={formData.fault}
                  onChange={handleChange}
                >
                  <FormControlLabel value="אני" control={<Radio sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} />} label="אני" />
                  <FormControlLabel value="צד ג'" control={<Radio sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} />} label="צד ג'" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.eventType && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ borderRadius: '12px' }}>
                  <strong>אירוע:</strong> {formData.eventType}
                  {formData.fault && <> | <strong>אשם:</strong> {formData.fault}</>}
                </Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* ===== שלב 1: פרטי הרוכב ===== */}
        {step === 1 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <SectionHeader icon={<Person />} title="פרטי הרוכב" color="#6366f1" />
            </Grid>

            {/* בחירת רוכב למנהל */}
            {!isRider(user) && riders.length > 0 && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>בחר רוכב (אופציונלי)</InputLabel>
                  <Select
                    value={selectedRiderId}
                    onChange={e => handleRiderSelect(e.target.value)}
                    label="בחר רוכב (אופציונלי)"
                    sx={{ borderRadius: '12px' }}
                  >
                    <MenuItem value=""><em>— ללא בחירה —</em></MenuItem>
                    {riders.map(r => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.firstName} {r.lastName}
                        {r.vehiclePlate ? ` · ${r.vehiclePlate}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="מספר תעודת זהות *"
                name="riderIdNumber"
                value={formData.riderIdNumber}
                onChange={handleChange}
                inputProps={{ minLength: 6 }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="שם פרטי *"
                name="riderFirstName"
                value={formData.riderFirstName}
                onChange={handleChange}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="שם משפחה *"
                name="riderLastName"
                value={formData.riderLastName}
                onChange={handleChange}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="תאריך לידה"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="תאריך הוצאת רישיון *"
                name="licenseIssueDate"
                type="date"
                value={formData.licenseIssueDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="תוקף רישיון *"
                name="licenseExpiryDate"
                type="date"
                value={formData.licenseExpiryDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset">
                <FormLabel sx={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem', mb: 0.5 }}>
                  סוג הרישיון
                </FormLabel>
                <RadioGroup row name="licenseType" value={formData.licenseType} onChange={handleChange}>
                  <FormControlLabel value="ישראלי" control={<Radio size="small" />} label="ישראלי" />
                  <FormControlLabel value="זר" control={<Radio size="small" />} label="זר" />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="מספר לוחית הרכב"
                name="vehiclePlate"
                value={formData.vehiclePlate}
                onChange={handleChange}
                sx={fieldSx}
              />
            </Grid>
          </Grid>
        )}

        {/* ===== שלב 2: פרטי המקרה ===== */}
        {step === 2 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <SectionHeader icon={<Place />} title="פרטי המקרה" color="#f59e0b" />
            </Grid>

            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="תאריך האירוע *"
                name="incidentDate"
                type="date"
                value={formData.incidentDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="שעת האירוע"
                name="incidentTime"
                type="time"
                value={formData.incidentTime}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="כתובת האירוע *"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="רחוב, מספר"
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="עיר"
                name="city"
                value={formData.city}
                onChange={handleChange}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>סוג הנסיעה</InputLabel>
                <Select name="drivingType" value={formData.drivingType} onChange={handleChange} label="סוג הנסיעה" sx={{ borderRadius: '12px' }}>
                  <MenuItem value="רגילה">רגילה</MenuItem>
                  <MenuItem value="דחופה/חירום">דחופה / חירום</MenuItem>
                  <MenuItem value="חניה">חניה</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>מזג האויר</InputLabel>
                <Select name="weather" value={formData.weather} onChange={handleChange} label="מזג האויר" sx={{ borderRadius: '12px' }}>
                  <MenuItem value="קיצי">קיצי</MenuItem>
                  <MenuItem value="שרבי">שרבי</MenuItem>
                  <MenuItem value="חורפי לא גשום">חורפי לא גשום</MenuItem>
                  <MenuItem value="גשום">גשום</MenuItem>
                  <MenuItem value="מעונן">מעונן</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl component="fieldset">
                <FormLabel sx={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem', mb: 0.5 }}>
                  האם עורבה משטרה?
                </FormLabel>
                <RadioGroup row name="policeInvolved" value={formData.policeInvolved} onChange={handleChange}>
                  <FormControlLabel value="כן" control={<Radio size="small" />} label="כן" />
                  <FormControlLabel value="לא" control={<Radio size="small" />} label="לא" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.policeInvolved === 'כן' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="שם תחנת המשטרה"
                    name="policeStation"
                    value={formData.policeStation}
                    onChange={handleChange}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="מספר תיק משטרה"
                    name="policeCaseNumber"
                    value={formData.policeCaseNumber}
                    onChange={handleChange}
                    sx={fieldSx}
                  />
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* ===== שלב 3: תיאור ועדים ===== */}
        {step === 3 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <SectionHeader icon={<People />} title="תיאור ועדים" color="#10b981" />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="תיאור נסיבות האירוע *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="תאר בפירוט את מה שקרה..."
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="תרשים מקום התאונה (אופציונלי)"
                name="diagram"
                value={formData.diagram}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="תאר את מיקום הרכבים, כיוון הנסיעה..."
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="תמרור בדרכך"
                name="roadSign"
                value={formData.roadSign}
                onChange={handleChange}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="תמרור בדרך צד ג'"
                name="thirdPartyRoadSign"
                value={formData.thirdPartyRoadSign}
                onChange={handleChange}
                sx={fieldSx}
              />
            </Grid>

            {/* עדים */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 600 }}>
                  עדים לאירוע
                </Typography>
                {formData.witnesses.length < 3 && (
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => addRow('witnesses', EMPTY_WITNESS)}
                    sx={{ color: '#10b981', borderRadius: '8px' }}
                  >
                    הוסף עד
                  </Button>
                )}
              </Box>

              {formData.witnesses.map((w, i) => (
                <Card key={i} sx={{ mb: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                        עד {i + 1}
                      </Typography>
                      {i > 0 && (
                        <IconButton size="small" onClick={() => removeRow('witnesses', i)} sx={{ color: '#ef4444', p: 0.5 }}>
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth size="small" label="ת.ז." value={w.idNumber}
                          onChange={e => handleArrayChange('witnesses', i, 'idNumber', e.target.value)} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth size="small" label="שם פרטי" value={w.firstName}
                          onChange={e => handleArrayChange('witnesses', i, 'firstName', e.target.value)} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth size="small" label="שם משפחה" value={w.lastName}
                          onChange={e => handleArrayChange('witnesses', i, 'lastName', e.target.value)} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth size="small" label="טלפון" value={w.phone}
                          onChange={e => handleArrayChange('witnesses', i, 'phone', e.target.value)} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" label="קרבה לממלא הטופס" value={w.relation}
                          onChange={e => handleArrayChange('witnesses', i, 'relation', e.target.value)} sx={fieldSx} />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Grid>
        )}

        {/* ===== שלב 4: רכבים ונפגעים ===== */}
        {step === 4 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <SectionHeader icon={<DirectionsCar />} title="רכבים מעורבים ונפגעים" color="#8b5cf6" />
            </Grid>

            {/* רכבים מעורבים */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
                  פרטי רכבים מעורבים (צד ג')
                </Typography>
                {formData.involvedVehicles.length < 3 && (
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => addRow('involvedVehicles', EMPTY_VEHICLE)}
                    sx={{ color: '#8b5cf6', borderRadius: '8px' }}
                  >
                    הוסף רכב
                  </Button>
                )}
              </Box>

              {formData.involvedVehicles.map((v, i) => (
                <Card key={i} sx={{ mb: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                        רכב {i + 1}
                      </Typography>
                      {i > 0 && (
                        <IconButton size="small" onClick={() => removeRow('involvedVehicles', i)} sx={{ color: '#ef4444', p: 0.5 }}>
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>סוג רכב</InputLabel>
                          <Select
                            value={v.type}
                            onChange={e => handleArrayChange('involvedVehicles', i, 'type', e.target.value)}
                            label="סוג רכב"
                            sx={{ borderRadius: '10px' }}
                          >
                            {['פרטי', 'מסחרי', 'אופנוע', 'מונית', 'משאית', 'אמבולנס', 'משטרה', 'צבא', 'אחר', 'לוחית זרה'].map(t => (
                              <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <TextField fullWidth size="small" label="תוצרת / דגם" value={v.model}
                          onChange={e => handleArrayChange('involvedVehicles', i, 'model', e.target.value)} sx={fieldSx} />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <TextField fullWidth size="small" label="מספר לוחית" value={v.plate}
                          onChange={e => handleArrayChange('involvedVehicles', i, 'plate', e.target.value)} sx={fieldSx} />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>

            {/* נפגעים */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 2 }}>
                נפגעים בתאונה
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl component="fieldset">
                <FormLabel sx={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem', mb: 0.5 }}>
                  האם יש נפגעים?
                </FormLabel>
                <RadioGroup row name="hasInjuries" value={formData.hasInjuries} onChange={handleChange}>
                  <FormControlLabel value="כן" control={<Radio size="small" />} label="כן" />
                  <FormControlLabel value="לא" control={<Radio size="small" />} label="לא" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.hasInjuries === 'כן' && (
              <>
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    label="נפגעים ברכב צד ג'"
                    name="thirdPartyInjuredCount"
                    type="number"
                    value={formData.thirdPartyInjuredCount}
                    onChange={handleChange}
                    inputProps={{ min: 0 }}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    label="נפגעים ברכב שלנו"
                    name="insuredInjuredCount"
                    type="number"
                    value={formData.insuredInjuredCount}
                    onChange={handleChange}
                    inputProps={{ min: 0 }}
                    sx={fieldSx}
                  />
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* ===== שלב 5: תמונות וסיכום ===== */}
        {step === 5 && (
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <SectionHeader icon={<PhotoCamera />} title="תמונות וסיכום" color="#f59e0b" />
            </Grid>

            {/* סיכום */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>סיכום הדיווח</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip size="small" label={`סוג: ${formData.eventType || '-'}`} sx={{ bgcolor: '#fee2e2', color: '#dc2626' }} />
                  <Chip size="small" label={`רוכב: ${formData.riderFirstName} ${formData.riderLastName}`} sx={{ bgcolor: '#ede9fe', color: '#7c3aed' }} />
                  <Chip size="small" label={`תאריך: ${formData.incidentDate}`} sx={{ bgcolor: '#fef3c7', color: '#d97706' }} />
                  <Chip size="small" label={`כתובת: ${formData.address} ${formData.city}`} sx={{ bgcolor: '#dcfce7', color: '#16a34a' }} />
                  {formData.policeInvolved === 'כן' && <Chip size="small" label="משטרה מעורבת" sx={{ bgcolor: '#dbeafe', color: '#1d4ed8' }} />}
                  {formData.hasInjuries === 'כן' && <Chip size="small" label="יש נפגעים" color="error" />}
                </Box>
              </Alert>
            </Grid>

            {/* העלאת תמונות */}
            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mt: 2, mb: 1.5 }}>
                תמונות מהאירוע (עולות ל-Google Drive)
              </Typography>
              <Alert severity="info" sx={{ borderRadius: '10px', mb: 2, py: 0.5 }}>
                <Typography variant="caption">קבצים גדולים מ-4.5MB יידחסו אוטומטית לפני ההעלאה</Typography>
              </Alert>
            </Grid>

            {[
              { slot: 'insured', label: 'תמונת האופנוע שלנו' },
              { slot: 'third_party_vehicle', label: 'צילום רכב צד ג\'' },
              { slot: 'accident_location', label: 'תמונת מקום התאונה' },
              { slot: 'third_party_insurance', label: 'צילום ביטוח צד ג\'' },
              { slot: 'third_party_license', label: 'צילום רישיון צד ג\'' },
              { slot: 'extra1', label: 'תמונה נוספת 1' },
              { slot: 'extra2', label: 'תמונה נוספת 2' },
            ].map(({ slot, label }) => {
              const selected = selectedPhotos.find(p => p.slot === slot);
              return (
                <Grid item xs={12} sm={6} md={4} key={slot}>
                  <Card sx={{
                    borderRadius: '12px',
                    border: selected ? '2px solid #10b981' : '2px dashed #e2e8f0',
                    bgcolor: selected ? '#f0fdf4' : '#fafafa',
                    transition: 'all 0.2s',
                  }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 1 }}>
                        {label}
                      </Typography>

                      {selected ? (
                        <Box sx={{ position: 'relative' }}>
                          <Box
                            component="img"
                            src={selected.preview}
                            alt={label}
                            sx={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: '8px' }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removePhoto(slot)}
                            sx={{
                              position: 'absolute', top: 4, left: 4,
                              bgcolor: 'rgba(239,68,68,0.9)', color: '#fff',
                              '&:hover': { bgcolor: '#dc2626' },
                              width: 24, height: 24,
                            }}
                          >
                            <Delete sx={{ fontSize: 14 }} />
                          </IconButton>
                          <Typography variant="caption" sx={{ color: '#10b981', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                            ✓ {selected.file.name.length > 20 ? selected.file.name.slice(0, 20) + '...' : selected.file.name}
                          </Typography>
                        </Box>
                      ) : (
                        <Button
                          component="label"
                          variant="outlined"
                          size="small"
                          startIcon={<PhotoCamera fontSize="small" />}
                          fullWidth
                          sx={{ borderRadius: '8px', borderColor: '#e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}
                        >
                          בחר קובץ
                          <input
                            type="file"
                            hidden
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePhotoSelect(slot, label, e)}
                          />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}

            {/* הערות */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <TextField
                fullWidth
                label="הערות נוספות"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={2}
                sx={fieldSx}
              />
            </Grid>

            {/* progress העלאה */}
            {uploadProgress && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  <Typography variant="body2">{uploadProgress}</Typography>
                  <LinearProgress sx={{ mt: 1, borderRadius: 4 }} />
                </Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* כפתורי ניווט */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={step === 0 ? () => navigate(isRider(user) ? '/incident-report' : -1) : prevStep}
            startIcon={<ArrowForward />}
            sx={{ color: '#64748b', fontWeight: 600, borderRadius: '10px', px: 3 }}
          >
            {step === 0 ? 'ביטול' : 'חזור'}
          </Button>

          {step < SECTION_TITLES.length - 1 ? (
            <Button
              variant="contained"
              onClick={nextStep}
              endIcon={<ArrowBack />}
              sx={{
                borderRadius: '10px', fontWeight: 600, px: 4,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                '&:hover': { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
              }}
            >
              הבא ({step + 2}/{SECTION_TITLES.length})
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Send />}
              sx={{
                borderRadius: '10px', fontWeight: 600, px: 4,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
              }}
            >
              {saving ? 'שולח...' : id ? 'עדכן דיווח' : 'שלח דיווח'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

// קומפוננט עזר - כותרת סקשן
function SectionHeader({ icon, title, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: '10px',
        bgcolor: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
        {title}
      </Typography>
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px' },
};
