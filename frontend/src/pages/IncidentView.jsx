import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Button, CircularProgress,
  Alert, Divider, TextField, Select, MenuItem, FormControl,
  InputLabel, RadioGroup, FormControlLabel, Radio, IconButton,
} from '@mui/material';
import {
  ArrowBack, Edit, Save, Cancel, ReportProblem, Add, Delete,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { incidentsAPI } from '../services/api';

const STATUS_MAP = {
  new: { label: 'חדש', bgcolor: 'rgba(59,130,246,0.1)', color: '#2563eb' },
  in_progress: { label: 'בטיפול', bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706' },
  closed: { label: 'סגור', bgcolor: 'rgba(16,185,129,0.1)', color: '#059669' },
};

const EMPTY_WITNESS = { idNumber: '', firstName: '', lastName: '', phone: '', relation: '' };
const EMPTY_VEHICLE = { type: '', model: '', plate: '' };

function SectionHeader({ color = '#ef4444', children }) {
  return (
    <Grid item xs={12}>
      <Typography variant="subtitle2" sx={{ color, fontWeight: 700, mb: 0.5 }}>
        {children}
      </Typography>
    </Grid>
  );
}

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <Grid item xs={6} sm={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{value}</Typography>
    </Grid>
  );
}

function FullField({ label, value }) {
  if (!value) return null;
  return (
    <Grid item xs={12}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 500, color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</Typography>
    </Grid>
  );
}

function EditField({ label, name, value, onChange, multiline, rows, select, options }) {
  if (select) {
    return (
      <Grid item xs={6} sm={4}>
        <FormControl fullWidth size="small">
          <InputLabel>{label}</InputLabel>
          <Select name={name} value={value || ''} onChange={onChange} label={label}>
            {options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
    );
  }
  return (
    <Grid item xs={multiline ? 12 : 6} sm={multiline ? 12 : 4}>
      <TextField
        fullWidth size="small" label={label} name={name}
        value={value || ''} onChange={onChange}
        multiline={multiline} rows={multiline ? (rows || 3) : undefined}
      />
    </Grid>
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
  const [editData, setEditData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const startEdit = () => {
    setEditData({
      ...incident,
      witnesses: incident.witnesses?.length ? incident.witnesses : [{ ...EMPTY_WITNESS }],
      involvedVehicles: incident.involvedVehicles?.length ? incident.involvedVehicles : [{ ...EMPTY_VEHICLE }],
    });
    setEditMode(true);
    setError('');
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (arr, index, field, value) => {
    setEditData(prev => {
      const next = [...prev[arr]];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [arr]: next };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await incidentsAPI.update(id, editData);
      setIncident({ ...incident, ...editData });
      setEditMode(false);
      setEditData(null);
      setSuccess('הדיווח עודכן בהצלחה');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#ef4444' }} />
      </Box>
    );
  }

  if (error && !incident) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ borderRadius: '12px', color: '#64748b' }}>חזרה</Button>
      </Box>
    );
  }

  const status = STATUS_MAP[incident.status] || { label: incident.status || 'חדש', bgcolor: 'rgba(148,163,184,0.1)', color: '#64748b' };
  const d = editMode ? editData : incident;

  return (
    <Box dir="rtl" sx={{ animation: 'fadeIn 0.3s ease-out' }}>

      {/* Header */}
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 3,
      }}>
        <Button
          startIcon={<ArrowBack />} onClick={() => navigate(-1)}
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

        {canEdit && !editMode && (
          <Button
            variant="contained" startIcon={<Edit />} onClick={startEdit}
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

        {editMode && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Cancel />} onClick={cancelEdit}
              sx={{ borderRadius: '12px', fontWeight: 600, color: '#64748b', borderColor: '#e2e8f0' }}>
              ביטול
            </Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSave} disabled={saving}
              sx={{
                borderRadius: '12px', px: 3, fontWeight: 600,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
              }}>
              שמור
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{success}</Alert>}

      {/* סוג האירוע ופרטים */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2}>
          <SectionHeader>פרטי האירוע</SectionHeader>
          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0', mb: 1 }} /></Grid>

          {editMode ? <>
            <EditField label="סוג אירוע" name="eventType" value={d.eventType} onChange={handleChange}
              select options={['תאונת דרכים עם מעורבות רכב נוסף','תאונת דרכים ללא מעורבות רכב נוסף','נפילה מהאופנוע','נזק לאופנוע ללא תאונה','אחר']} />
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>מי לדעתך אשם?</Typography>
              <RadioGroup row name="fault" value={d.fault || ''} onChange={handleChange}>
                <FormControlLabel value="אני" control={<Radio size="small" />} label="אני" />
                <FormControlLabel value="צד ג'" control={<Radio size="small" />} label="צד ג'" />
              </RadioGroup>
            </Grid>
            <EditField label="תאריך האירוע" name="incidentDate" value={d.incidentDate} onChange={handleChange} />
            <EditField label="שעה" name="incidentTime" value={d.incidentTime} onChange={handleChange} />
            <EditField label="כתובת" name="address" value={d.address} onChange={handleChange} />
            <EditField label="עיר" name="city" value={d.city} onChange={handleChange} />
            <EditField label="סוג נסיעה" name="drivingType" value={d.drivingType} onChange={handleChange}
              select options={['נסיעה לצורכי עבודה','נסיעה פרטית','נסיעה לצורכי ארגון','אחר']} />
            <EditField label="מזג אוויר" name="weather" value={d.weather} onChange={handleChange}
              select options={['בהיר','מעונן','גשם','ערפל','אחר']} />
            <EditField label="מעורבות משטרה" name="policeInvolved" value={d.policeInvolved} onChange={handleChange}
              select options={['לא','כן']} />
            {d.policeInvolved === 'כן' && <>
              <EditField label="תחנת משטרה" name="policeStation" value={d.policeStation} onChange={handleChange} />
              <EditField label="מספר תיק" name="policeCaseNumber" value={d.policeCaseNumber} onChange={handleChange} />
            </>}
          </> : <>
            <Field label="סוג אירוע" value={d.eventType} />
            <Field label="אחריות" value={d.fault} />
            <Field label="תאריך" value={d.incidentDate} />
            <Field label="שעה" value={d.incidentTime} />
            <Field label="כתובת" value={d.address} />
            <Field label="עיר" value={d.city} />
            <Field label="סוג נסיעה" value={d.drivingType} />
            <Field label="מזג אוויר" value={d.weather} />
            <Field label="מעורבות משטרה" value={d.policeInvolved} />
            {d.policeInvolved === 'כן' && <>
              <Field label="תחנת משטרה" value={d.policeStation} />
              <Field label="מספר תיק משטרה" value={d.policeCaseNumber} />
            </>}
          </>}
        </Grid>
      </Paper>

      {/* פרטי הרוכב */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2}>
          <SectionHeader>פרטי הרוכב</SectionHeader>
          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0', mb: 1 }} /></Grid>

          {editMode ? <>
            <EditField label="שם פרטי" name="riderFirstName" value={d.riderFirstName} onChange={handleChange} />
            <EditField label="שם משפחה" name="riderLastName" value={d.riderLastName} onChange={handleChange} />
            <EditField label="תעודת זהות" name="riderIdNumber" value={d.riderIdNumber} onChange={handleChange} />
            <EditField label="תאריך לידה" name="birthDate" value={d.birthDate} onChange={handleChange} />
            <EditField label="לוחית רישוי" name="vehiclePlate" value={d.vehiclePlate} onChange={handleChange} />
            <EditField label="סוג רישיון" name="licenseType" value={d.licenseType} onChange={handleChange}
              select options={['ישראלי','זר','בינלאומי']} />
            <EditField label="תאריך הוצאת רישיון" name="licenseIssueDate" value={d.licenseIssueDate} onChange={handleChange} />
            <EditField label="תוקף רישיון" name="licenseExpiryDate" value={d.licenseExpiryDate} onChange={handleChange} />
          </> : <>
            <Field label="שם" value={`${d.riderFirstName || ''} ${d.riderLastName || ''}`.trim() || undefined} />
            <Field label="תעודת זהות" value={d.riderIdNumber} />
            <Field label="תאריך לידה" value={d.birthDate} />
            <Field label="לוחית רישוי" value={d.vehiclePlate} />
            <Field label="סוג רישיון" value={d.licenseType} />
            <Field label="תאריך הוצאת רישיון" value={d.licenseIssueDate} />
            <Field label="תוקף רישיון" value={d.licenseExpiryDate} />
          </>}
        </Grid>
      </Paper>

      {/* תיאור */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2}>
          <SectionHeader>תיאור האירוע</SectionHeader>
          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0', mb: 1 }} /></Grid>

          {editMode ? <>
            <EditField label="תיאור האירוע" name="description" value={d.description} onChange={handleChange} multiline rows={4} />
            <EditField label="תרשים" name="diagram" value={d.diagram} onChange={handleChange} multiline rows={2} />
            <EditField label="סימון כביש שלנו" name="roadSign" value={d.roadSign} onChange={handleChange} />
            <EditField label="סימון כביש צד ג׳" name="thirdPartyRoadSign" value={d.thirdPartyRoadSign} onChange={handleChange} />
          </> : <>
            <FullField label="תיאור" value={d.description} />
            <FullField label="תרשים" value={d.diagram} />
            <Field label="סימון כביש שלנו" value={d.roadSign} />
            <Field label="סימון כביש צד ג׳" value={d.thirdPartyRoadSign} />
            {!d.description && !d.diagram && !d.roadSign && !d.thirdPartyRoadSign && (
              <Grid item xs={12}><Typography variant="body2" sx={{ color: '#94a3b8' }}>אין תיאור</Typography></Grid>
            )}
          </>}
        </Grid>
      </Paper>

      {/* עדים */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2}>
          <SectionHeader>עדים</SectionHeader>
          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0', mb: 1 }} /></Grid>

          {editMode ? <>
            {d.witnesses.map((w, i) => (
              <Grid item xs={12} key={i}>
                <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>עד {i + 1}</Typography>
                    {d.witnesses.length > 1 && (
                      <IconButton size="small" onClick={() => setEditData(prev => ({ ...prev, witnesses: prev.witnesses.filter((_, idx) => idx !== i) }))}>
                        <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    {[['שם פרטי','firstName'],['שם משפחה','lastName'],['תעודת זהות','idNumber'],['טלפון','phone'],['קשר לאירוע','relation']].map(([label, field]) => (
                      <Grid item xs={6} sm={4} key={field}>
                        <TextField fullWidth size="small" label={label} value={w[field] || ''}
                          onChange={e => handleArrayChange('witnesses', i, field, e.target.value)} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" startIcon={<Add />} onClick={() => setEditData(prev => ({ ...prev, witnesses: [...prev.witnesses, { ...EMPTY_WITNESS }] }))}
                sx={{ color: '#6366f1', fontWeight: 600 }}>הוסף עד</Button>
            </Grid>
          </> : (
            d.witnesses?.filter(w => w.firstName || w.lastName || w.idNumber).length > 0
              ? d.witnesses.filter(w => w.firstName || w.lastName || w.idNumber).map((w, i) => (
                <Grid item xs={12} key={i}>
                  <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                      עד {i + 1}: {`${w.firstName || ''} ${w.lastName || ''}`.trim()}
                    </Typography>
                    <Grid container spacing={1.5}>
                      {w.idNumber && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">תעודת זהות</Typography><Typography sx={{ fontWeight: 600 }}>{w.idNumber}</Typography></Grid>}
                      {w.phone && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">טלפון</Typography><Typography sx={{ fontWeight: 600 }}>{w.phone}</Typography></Grid>}
                      {w.relation && <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">קשר לאירוע</Typography><Typography sx={{ fontWeight: 600 }}>{w.relation}</Typography></Grid>}
                    </Grid>
                  </Box>
                </Grid>
              ))
              : <Grid item xs={12}><Typography variant="body2" sx={{ color: '#94a3b8' }}>אין עדים</Typography></Grid>
          )}
        </Grid>
      </Paper>

      {/* רכבים ונפגעים */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2}>
          <SectionHeader>רכבים ונפגעים</SectionHeader>
          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0', mb: 1 }} /></Grid>

          {editMode ? <>
            {d.involvedVehicles.map((v, i) => (
              <Grid item xs={12} key={i}>
                <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>רכב {i + 1}</Typography>
                    {d.involvedVehicles.length > 1 && (
                      <IconButton size="small" onClick={() => setEditData(prev => ({ ...prev, involvedVehicles: prev.involvedVehicles.filter((_, idx) => idx !== i) }))}>
                        <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    {[['סוג רכב','type'],['דגם','model'],['לוחית','plate']].map(([label, field]) => (
                      <Grid item xs={4} key={field}>
                        <TextField fullWidth size="small" label={label} value={v[field] || ''}
                          onChange={e => handleArrayChange('involvedVehicles', i, field, e.target.value)} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" startIcon={<Add />} onClick={() => setEditData(prev => ({ ...prev, involvedVehicles: [...prev.involvedVehicles, { ...EMPTY_VEHICLE }] }))}
                sx={{ color: '#6366f1', fontWeight: 600 }}>הוסף רכב</Button>
            </Grid>
            <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>
            <EditField label="פציעות" name="hasInjuries" value={d.hasInjuries} onChange={handleChange} select options={['לא','כן']} />
            {d.hasInjuries === 'כן' && <>
              <EditField label="פצועי צד ג׳" name="thirdPartyInjuredCount" value={d.thirdPartyInjuredCount} onChange={handleChange} />
              <EditField label="פצועי הרוכב" name="insuredInjuredCount" value={d.insuredInjuredCount} onChange={handleChange} />
            </>}
          </> : <>
            {d.involvedVehicles?.filter(v => v.type || v.model || v.plate).map((v, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>רכב {i + 1}</Typography>
                  <Grid container spacing={1.5}>
                    {v.type && <Grid item xs={4}><Typography variant="caption" color="text.secondary">סוג</Typography><Typography sx={{ fontWeight: 600 }}>{v.type}</Typography></Grid>}
                    {v.model && <Grid item xs={4}><Typography variant="caption" color="text.secondary">דגם</Typography><Typography sx={{ fontWeight: 600 }}>{v.model}</Typography></Grid>}
                    {v.plate && <Grid item xs={4}><Typography variant="caption" color="text.secondary">לוחית</Typography><Typography sx={{ fontWeight: 600 }}>{v.plate}</Typography></Grid>}
                  </Grid>
                </Box>
              </Grid>
            ))}
            {(!d.involvedVehicles || !d.involvedVehicles.some(v => v.type || v.model || v.plate)) && (
              <Grid item xs={12}><Typography variant="body2" sx={{ color: '#94a3b8' }}>אין רכבים מעורבים</Typography></Grid>
            )}
            <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>
            <Field label="פציעות" value={d.hasInjuries} />
            {d.hasInjuries === 'כן' && <>
              <Field label="פצועי צד ג׳" value={d.thirdPartyInjuredCount} />
              <Field label="פצועי הרוכב" value={d.insuredInjuredCount} />
            </>}
          </>}
        </Grid>
      </Paper>

      {/* תמונות */}
      {incident.photos?.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
            תמונות ({incident.photos.length})
          </Typography>
          <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {incident.photos.map((photo, i) => (
              <Box key={i} component="a" href={photo.url} target="_blank" rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  px: 2, py: 1, borderRadius: '8px', border: '1px solid #e2e8f0',
                  textDecoration: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem',
                  bgcolor: 'rgba(59,130,246,0.04)',
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.1)', borderColor: '#2563eb' },
                  transition: 'all 0.15s',
                }}
              >
                📎 {photo.name?.replace(/^[^_]+_/, '') || `תמונה ${i + 1}`}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* הערות וסטטוס */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2}>
          <SectionHeader>הערות וסטטוס</SectionHeader>
          <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0', mb: 1 }} /></Grid>

          {editMode ? <>
            <EditField label="סטטוס" name="status" value={d.status} onChange={handleChange}
              select options={['new','in_progress','closed']} />
            <EditField label="הערות" name="notes" value={d.notes} onChange={handleChange} multiline rows={3} />
            {canEdit && (
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>גלוי לרוכב</Typography>
                <RadioGroup row name="hiddenFromRider" value={d.hiddenFromRider ? 'hidden' : 'visible'}
                  onChange={e => setEditData(prev => ({ ...prev, hiddenFromRider: e.target.value === 'hidden' }))}>
                  <FormControlLabel value="visible" control={<Radio size="small" />} label="גלוי" />
                  <FormControlLabel value="hidden" control={<Radio size="small" />} label="מוסתר" />
                </RadioGroup>
              </Grid>
            )}
          </> : <>
            <Field label="סטטוס" value={STATUS_MAP[d.status]?.label || d.status} />
            <FullField label="הערות" value={d.notes} />
            {canEdit && <Field label="גלוי לרוכב" value={d.hiddenFromRider ? 'מוסתר' : 'גלוי'} />}
          </>}
        </Grid>
      </Paper>

    </Box>
  );
}
