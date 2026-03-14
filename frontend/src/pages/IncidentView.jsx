import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Button, CircularProgress,
  Alert, Divider, Card, CardContent, Stack, IconButton, Tooltip,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  ArrowBack, Edit, ReportProblem, Person, Place, Gavel,
  DirectionsCar, People, PhotoCamera, Notes, Info,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { incidentsAPI } from '../services/api';

const STATUS_MAP = {
  new: { label: 'חדש', color: '#3b82f6', bgcolor: 'rgba(59,130,246,0.1)' },
  in_progress: { label: 'בטיפול', color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.1)' },
  closed: { label: 'סגור', color: '#10b981', bgcolor: 'rgba(16,185,129,0.1)' },
};

function SectionTitle({ icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '8px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
        {children}
      </Typography>
    </Box>
  );
}

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

function formatDate(val) {
  if (!val) return '';
  const d = val.toDate ? val.toDate() : new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('he-IL');
}

function isAdmin(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  return roles.some(r => r !== 'rider');
}

export default function IncidentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canEdit = isAdmin(user) || hasPermission('insurance_claims', 'edit');

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    try {
      setLoading(true);
      const res = await incidentsAPI.getById(id);
      setIncident(res.data.incident);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !incident) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'לא נמצא אירוע'}</Alert>
      </Box>
    );
  }

  const status = STATUS_MAP[incident.status] || { label: incident.status || 'חדש', color: '#64748b', bgcolor: 'rgba(100,116,139,0.1)' };

  return (
    <Box dir="rtl" sx={{ p: isMobile ? 2 : 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} size="small" sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Box sx={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)', flexShrink: 0,
          }}>
            <ReportProblem sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>
                {incident.incidentNumber}
              </Typography>
              <Chip
                size="small"
                label={status.label}
                sx={{ bgcolor: status.bgcolor, color: status.color, fontWeight: 600, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {incident.incidentDate && `תאריך: ${incident.incidentDate}`}
              {incident.createdByName && ` • דיווח: ${incident.createdByName}`}
            </Typography>
          </Box>
        </Box>
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/incident-report/${id}`)}
            sx={{ borderRadius: '10px', fontWeight: 600, borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.05)' } }}
          >
            ערוך
          </Button>
        )}
      </Box>

      <Stack spacing={2}>
        {/* סוג האירוע */}
        <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionTitle icon={<Info sx={{ color: '#fff', fontSize: 16 }} />}>פרטי האירוע</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><Field label="סוג אירוע" value={incident.eventType} /></Grid>
            <Grid item xs={12} sm={6}><Field label="אחריות" value={incident.fault} /></Grid>
            <Grid item xs={12} sm={6}><Field label="תאריך" value={incident.incidentDate} /></Grid>
            <Grid item xs={12} sm={6}><Field label="שעה" value={incident.incidentTime} /></Grid>
            <Grid item xs={12} sm={6}><Field label="כתובת" value={incident.address} /></Grid>
            <Grid item xs={12} sm={6}><Field label="עיר" value={incident.city} /></Grid>
            <Grid item xs={12} sm={6}><Field label="סוג נסיעה" value={incident.drivingType} /></Grid>
            <Grid item xs={12} sm={6}><Field label="מזג אוויר" value={incident.weather} /></Grid>
            {incident.policeInvolved === 'כן' && <>
              <Grid item xs={12} sm={6}><Field label="תחנת משטרה" value={incident.policeStation} /></Grid>
              <Grid item xs={12} sm={6}><Field label="מספר תיק משטרה" value={incident.policeCaseNumber} /></Grid>
            </>}
            {incident.policeInvolved && (
              <Grid item xs={12} sm={6}><Field label="מעורבות משטרה" value={incident.policeInvolved} /></Grid>
            )}
          </Grid>
        </Paper>

        {/* פרטי הרוכב */}
        <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionTitle icon={<Person sx={{ color: '#fff', fontSize: 16 }} />}>פרטי הרוכב</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><Field label="שם" value={`${incident.riderFirstName || ''} ${incident.riderLastName || ''}`.trim()} /></Grid>
            <Grid item xs={12} sm={6}><Field label="תעודת זהות" value={incident.riderIdNumber} /></Grid>
            <Grid item xs={12} sm={6}><Field label="תאריך לידה" value={incident.birthDate} /></Grid>
            <Grid item xs={12} sm={6}><Field label="לוחית רישוי" value={incident.vehiclePlate} /></Grid>
            <Grid item xs={12} sm={6}><Field label="סוג רישיון" value={incident.licenseType} /></Grid>
            <Grid item xs={12} sm={6}><Field label="תוקף רישיון" value={incident.licenseExpiryDate} /></Grid>
            <Grid item xs={12} sm={6}><Field label="תאריך הוצאת רישיון" value={incident.licenseIssueDate} /></Grid>
          </Grid>
        </Paper>

        {/* תיאור */}
        {(incident.description || incident.diagram || incident.roadSign || incident.thirdPartyRoadSign) && (
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<Notes sx={{ color: '#fff', fontSize: 16 }} />}>תיאור האירוע</SectionTitle>
            <Stack spacing={2}>
              {incident.description && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>תיאור</Typography>
                  <Typography variant="body2" sx={{ color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {incident.description}
                  </Typography>
                </Box>
              )}
              {incident.diagram && <Field label="תרשים" value={incident.diagram} />}
              {incident.roadSign && <Field label="סימון כביש שלנו" value={incident.roadSign} />}
              {incident.thirdPartyRoadSign && <Field label="סימון כביש צד ג׳" value={incident.thirdPartyRoadSign} />}
            </Stack>
          </Paper>
        )}

        {/* עדים */}
        {incident.witnesses?.filter(w => w.firstName || w.lastName || w.idNumber).length > 0 && (
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<People sx={{ color: '#fff', fontSize: 16 }} />}>עדים</SectionTitle>
            <Stack spacing={2}>
              {incident.witnesses.filter(w => w.firstName || w.lastName || w.idNumber).map((w, i) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}><Field label="שם" value={`${w.firstName || ''} ${w.lastName || ''}`.trim()} /></Grid>
                      <Grid item xs={12} sm={4}><Field label="תעודת זהות" value={w.idNumber} /></Grid>
                      <Grid item xs={12} sm={4}><Field label="טלפון" value={w.phone} /></Grid>
                      {w.relation && <Grid item xs={12}><Field label="קשר לאירוע" value={w.relation} /></Grid>}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        )}

        {/* רכבים מעורבים */}
        {incident.involvedVehicles?.filter(v => v.type || v.model || v.plate).length > 0 && (
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<DirectionsCar sx={{ color: '#fff', fontSize: 16 }} />}>רכבים מעורבים</SectionTitle>
            <Stack spacing={2}>
              {incident.involvedVehicles.filter(v => v.type || v.model || v.plate).map((v, i) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}><Field label="סוג רכב" value={v.type} /></Grid>
                      <Grid item xs={12} sm={4}><Field label="דגם" value={v.model} /></Grid>
                      <Grid item xs={12} sm={4}><Field label="לוחית רישוי" value={v.plate} /></Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><Field label="פציעות" value={incident.hasInjuries} /></Grid>
              {incident.hasInjuries === 'כן' && <>
                <Grid item xs={12} sm={4}><Field label="פצועי צד ג׳" value={incident.thirdPartyInjuredCount} /></Grid>
                <Grid item xs={12} sm={4}><Field label="פצועי הרוכב" value={incident.insuredInjuredCount} /></Grid>
              </>}
            </Grid>
          </Paper>
        )}

        {/* תמונות */}
        {incident.photos?.length > 0 && (
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<PhotoCamera sx={{ color: '#fff', fontSize: 16 }} />}>תמונות ({incident.photos.length})</SectionTitle>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {incident.photos.map((photo, i) => (
                <Box
                  key={i}
                  component="a"
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75,
                    px: 2, py: 1, borderRadius: '8px', border: '1px solid #e2e8f0',
                    textDecoration: 'none', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600,
                    '&:hover': { bgcolor: 'rgba(59,130,246,0.05)', borderColor: '#3b82f6' },
                    transition: 'all 0.15s',
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 14 }} />
                  {photo.name?.replace(/^[^_]+_/, '') || `תמונה ${i + 1}`}
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* הערות */}
        {incident.notes && (
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<Gavel sx={{ color: '#fff', fontSize: 16 }} />}>הערות</SectionTitle>
            <Typography variant="body2" sx={{ color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {incident.notes}
            </Typography>
          </Paper>
        )}

        {/* מידע מנהלתי */}
        {canEdit && (
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '16px', bgcolor: '#f8fafc', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <SectionTitle icon={<Info sx={{ color: '#fff', fontSize: 16 }} />}>מידע מנהלתי</SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Field label="נוצר ע״י" value={incident.createdByName} /></Grid>
              <Grid item xs={12} sm={6}><Field label="תאריך יצירה" value={formatDate(incident.createdAt)} /></Grid>
              {incident.updatedAt && <Grid item xs={12} sm={6}><Field label="עדכון אחרון" value={formatDate(incident.updatedAt)} /></Grid>}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.25 }}>גלוי לרוכב</Typography>
                <Chip
                  size="small"
                  label={incident.hiddenFromRider ? 'מוסתר' : 'גלוי'}
                  sx={{
                    bgcolor: incident.hiddenFromRider ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: incident.hiddenFromRider ? '#ef4444' : '#10b981',
                    fontWeight: 600, fontSize: '0.75rem',
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
