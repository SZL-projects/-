import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Button, CircularProgress,
  Alert, Divider, Card, CardContent,
} from '@mui/material';
import {
  ArrowBack, Edit, ReportProblem, Person, Place, Gavel,
  DirectionsCar, People, PhotoCamera, Notes, CalendarMonth,
  Badge, TwoWheeler, Info, VerifiedUser,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { incidentsAPI } from '../services/api';

const STATUS_MAP = {
  new: { label: 'חדש', bgcolor: 'rgba(59,130,246,0.1)', color: '#2563eb' },
  in_progress: { label: 'בטיפול', bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706' },
  closed: { label: 'סגור', bgcolor: 'rgba(16,185,129,0.1)', color: '#059669' },
};

// כרטיס שדה בודד — אייקון + תווית + ערך
function InfoCard({ icon, iconColor, iconBg, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            bgcolor: iconBg || 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
              {value}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

// כרטיס שדה טקסט חופשי (תיאור, הערות)
function TextCard({ icon, iconColor, iconBg, label, value }) {
  if (!value) return null;
  return (
    <Grid item xs={12}>
      <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            bgcolor: iconBg || 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.5,
          }}>
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b', mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {value}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function Section({ title, children }) {
  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Paper>
  );
}

function isAdmin(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  return roles.some(r => r !== 'rider');
}

export default function IncidentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canEdit = isAdmin(user) || hasPermission('insurance_claims', 'edit');

  useEffect(() => { loadIncident(); }, [id]);

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#ef4444' }} />
      </Box>
    );
  }

  if (error || !incident) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>{error || 'לא נמצא אירוע'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ borderRadius: '12px', color: '#64748b' }}>
          חזרה
        </Button>
      </Box>
    );
  }

  const status = STATUS_MAP[incident.status] || { label: incident.status || 'חדש', bgcolor: 'rgba(148,163,184,0.1)', color: '#64748b' };
  const riderName = `${incident.riderFirstName || ''} ${incident.riderLastName || ''}`.trim();
  const hasWitnesses = incident.witnesses?.some(w => w.firstName || w.lastName || w.idNumber);
  const hasVehicles = incident.involvedVehicles?.some(v => v.type || v.model || v.plate);

  return (
    <Box dir="rtl" sx={{ animation: 'fadeIn 0.3s ease-out' }}>

      {/* Header */}
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 3,
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ borderRadius: '12px', fontWeight: 600, color: '#64748b', '&:hover': { bgcolor: '#f8fafc' }, alignSelf: { xs: 'flex-start', md: 'center' } }}
        >
          חזרה
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(239,68,68,0.3)', flexShrink: 0,
          }}>
            <ReportProblem sx={{ fontSize: 28, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '1.4rem', sm: '2rem' }, fontFamily: 'monospace' }}>
              {incident.incidentNumber}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={status.label} size="small" sx={{ bgcolor: status.bgcolor, color: status.color, fontWeight: 600, fontSize: '0.8rem' }} />
              {incident.hiddenFromRider && canEdit && (
                <Chip label="מוסתר מרוכב" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: '0.75rem' }} />
              )}
            </Box>
          </Box>
        </Box>

        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/incident-report/${id}`)}
            sx={{
              borderRadius: '12px', px: 3, py: 1.5, fontWeight: 600,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', transform: 'translateY(-1px)' },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            עריכה
          </Button>
        )}
      </Box>

      {/* סוג האירוע */}
      <Section title="פרטי האירוע">
        <InfoCard icon={<ReportProblem sx={{ color: '#ef4444', fontSize: 20 }} />} iconBg="rgba(239,68,68,0.1)" label="סוג אירוע" value={incident.eventType} />
        <InfoCard icon={<Gavel sx={{ color: '#8b5cf6', fontSize: 20 }} />} iconBg="rgba(139,92,246,0.1)" label="אחריות" value={incident.fault} />
        <InfoCard icon={<CalendarMonth sx={{ color: '#2563eb', fontSize: 20 }} />} iconBg="rgba(59,130,246,0.1)" label="תאריך האירוע" value={incident.incidentDate} />
        <InfoCard icon={<CalendarMonth sx={{ color: '#6366f1', fontSize: 20 }} />} iconBg="rgba(99,102,241,0.1)" label="שעה" value={incident.incidentTime} />
        <InfoCard icon={<Place sx={{ color: '#d97706', fontSize: 20 }} />} iconBg="rgba(245,158,11,0.1)" label="כתובת" value={incident.address} />
        <InfoCard icon={<Place sx={{ color: '#059669', fontSize: 20 }} />} iconBg="rgba(16,185,129,0.1)" label="עיר" value={incident.city} />
        <InfoCard icon={<TwoWheeler sx={{ color: '#6366f1', fontSize: 20 }} />} iconBg="rgba(99,102,241,0.1)" label="סוג נסיעה" value={incident.drivingType} />
        <InfoCard icon={<Info sx={{ color: '#64748b', fontSize: 20 }} />} iconBg="rgba(100,116,139,0.1)" label="מזג אוויר" value={incident.weather} />
        <InfoCard icon={<Badge sx={{ color: '#d97706', fontSize: 20 }} />} iconBg="rgba(245,158,11,0.1)" label="מעורבות משטרה" value={incident.policeInvolved} />
        {incident.policeInvolved === 'כן' && <>
          <InfoCard icon={<Badge sx={{ color: '#64748b', fontSize: 20 }} />} iconBg="rgba(100,116,139,0.1)" label="תחנת משטרה" value={incident.policeStation} />
          <InfoCard icon={<Badge sx={{ color: '#64748b', fontSize: 20 }} />} iconBg="rgba(100,116,139,0.1)" label="מספר תיק משטרה" value={incident.policeCaseNumber} />
        </>}
      </Section>

      {/* פרטי הרוכב */}
      <Section title="פרטי הרוכב">
        <InfoCard icon={<Person sx={{ color: '#6366f1', fontSize: 20 }} />} iconBg="rgba(99,102,241,0.1)" label="שם הרוכב" value={riderName || undefined} />
        <InfoCard icon={<Badge sx={{ color: '#8b5cf6', fontSize: 20 }} />} iconBg="rgba(139,92,246,0.1)" label="תעודת זהות" value={incident.riderIdNumber} />
        <InfoCard icon={<CalendarMonth sx={{ color: '#059669', fontSize: 20 }} />} iconBg="rgba(16,185,129,0.1)" label="תאריך לידה" value={incident.birthDate} />
        <InfoCard icon={<TwoWheeler sx={{ color: '#ef4444', fontSize: 20 }} />} iconBg="rgba(239,68,68,0.1)" label="לוחית רישוי" value={incident.vehiclePlate} />
        <InfoCard icon={<VerifiedUser sx={{ color: '#2563eb', fontSize: 20 }} />} iconBg="rgba(59,130,246,0.1)" label="סוג רישיון" value={incident.licenseType} />
        <InfoCard icon={<CalendarMonth sx={{ color: '#d97706', fontSize: 20 }} />} iconBg="rgba(245,158,11,0.1)" label="תאריך הוצאת רישיון" value={incident.licenseIssueDate} />
        <InfoCard icon={<CalendarMonth sx={{ color: '#64748b', fontSize: 20 }} />} iconBg="rgba(100,116,139,0.1)" label="תוקף רישיון" value={incident.licenseExpiryDate} />
      </Section>

      {/* תיאור */}
      {(incident.description || incident.diagram || incident.roadSign || incident.thirdPartyRoadSign) && (
        <Section title="תיאור האירוע">
          <TextCard icon={<Notes sx={{ color: '#6366f1', fontSize: 20 }} />} iconBg="rgba(99,102,241,0.1)" label="תיאור" value={incident.description} />
          <TextCard icon={<Notes sx={{ color: '#8b5cf6', fontSize: 20 }} />} iconBg="rgba(139,92,246,0.1)" label="תרשים" value={incident.diagram} />
          <InfoCard icon={<Place sx={{ color: '#d97706', fontSize: 20 }} />} iconBg="rgba(245,158,11,0.1)" label="סימון כביש שלנו" value={incident.roadSign} />
          <InfoCard icon={<Place sx={{ color: '#ef4444', fontSize: 20 }} />} iconBg="rgba(239,68,68,0.1)" label="סימון כביש צד ג׳" value={incident.thirdPartyRoadSign} />
        </Section>
      )}

      {/* עדים */}
      {hasWitnesses && (
        <Section title="עדים">
          {incident.witnesses.filter(w => w.firstName || w.lastName || w.idNumber).map((w, i) => (
            <Grid item xs={12} key={i}>
              <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <People sx={{ color: '#6366f1', fontSize: 16 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      עד {i + 1}: {`${w.firstName || ''} ${w.lastName || ''}`.trim()}
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {w.idNumber && <Grid item xs={12} sm={4}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>תעודת זהות</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{w.idNumber}</Typography>
                    </Grid>}
                    {w.phone && <Grid item xs={12} sm={4}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>טלפון</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{w.phone}</Typography>
                    </Grid>}
                    {w.relation && <Grid item xs={12} sm={4}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>קשר לאירוע</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{w.relation}</Typography>
                    </Grid>}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Section>
      )}

      {/* רכבים ונפגעים */}
      {hasVehicles && (
        <Section title="רכבים ונפגעים">
          {incident.involvedVehicles.filter(v => v.type || v.model || v.plate).map((v, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DirectionsCar sx={{ color: '#d97706', fontSize: 16 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>רכב {i + 1}</Typography>
                  </Box>
                  <Grid container spacing={1.5}>
                    {v.type && <Grid item xs={4}><Typography variant="caption" sx={{ color: '#94a3b8' }}>סוג</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{v.type}</Typography></Grid>}
                    {v.model && <Grid item xs={4}><Typography variant="caption" sx={{ color: '#94a3b8' }}>דגם</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{v.model}</Typography></Grid>}
                    {v.plate && <Grid item xs={4}><Typography variant="caption" sx={{ color: '#94a3b8' }}>לוחית</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{v.plate}</Typography></Grid>}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
          <InfoCard icon={<People sx={{ color: '#ef4444', fontSize: 20 }} />} iconBg="rgba(239,68,68,0.1)" label="פציעות" value={incident.hasInjuries} />
          {incident.hasInjuries === 'כן' && <>
            <InfoCard icon={<People sx={{ color: '#d97706', fontSize: 20 }} />} iconBg="rgba(245,158,11,0.1)" label="פצועי צד ג׳" value={incident.thirdPartyInjuredCount} />
            <InfoCard icon={<People sx={{ color: '#6366f1', fontSize: 20 }} />} iconBg="rgba(99,102,241,0.1)" label="פצועי הרוכב" value={incident.insuredInjuredCount} />
          </>}
        </Section>
      )}

      {/* תמונות */}
      {incident.photos?.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
            תמונות ({incident.photos.length})
          </Typography>
          <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {incident.photos.map((photo, i) => (
              <Box
                key={i}
                component="a"
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1,
                  px: 2.5, py: 1.25, borderRadius: '10px',
                  border: '1px solid #e2e8f0', textDecoration: 'none',
                  color: '#2563eb', fontWeight: 600, fontSize: '0.85rem',
                  bgcolor: 'rgba(59,130,246,0.04)',
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.1)', borderColor: '#2563eb' },
                  transition: 'all 0.15s',
                }}
              >
                <PhotoCamera sx={{ fontSize: 16 }} />
                {photo.name?.replace(/^[^_]+_/, '') || `תמונה ${i + 1}`}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* הערות */}
      {incident.notes && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>הערות</Typography>
          <Divider sx={{ mb: 3, borderColor: '#e2e8f0' }} />
          <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {incident.notes}
          </Typography>
        </Paper>
      )}

      {/* מידע מנהלתי */}
      {canEdit && (
        <Section title="מידע מנהלתי">
          <InfoCard icon={<Person sx={{ color: '#6366f1', fontSize: 20 }} />} iconBg="rgba(99,102,241,0.1)" label="נוצר ע״י" value={incident.createdByName} />
          <InfoCard icon={<CalendarMonth sx={{ color: '#059669', fontSize: 20 }} />} iconBg="rgba(16,185,129,0.1)" label="תאריך יצירה"
            value={incident.createdAt ? new Date(incident.createdAt.toDate ? incident.createdAt.toDate() : incident.createdAt).toLocaleDateString('he-IL') : undefined}
          />
          <InfoCard icon={<Info sx={{ color: '#64748b', fontSize: 20 }} />} iconBg="rgba(100,116,139,0.1)" label="גלוי לרוכב" value={incident.hiddenFromRider ? 'מוסתר' : 'גלוי'} />
        </Section>
      )}
    </Box>
  );
}
