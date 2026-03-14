import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Button, CircularProgress,
  Alert, TextField, Select, MenuItem, FormControl, InputLabel,
  RadioGroup, FormControlLabel, Radio, IconButton, Divider,
} from '@mui/material';
import { ArrowBack, Edit, Save, Cancel, ReportProblem, Add, Delete } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { incidentsAPI } from '../services/api';

const STATUS_MAP = {
  new: { label: 'חדש', bgcolor: 'rgba(59,130,246,0.12)', color: '#1d4ed8' },
  in_progress: { label: 'בטיפול', bgcolor: 'rgba(245,158,11,0.12)', color: '#b45309' },
  closed: { label: 'סגור', bgcolor: 'rgba(16,185,129,0.12)', color: '#065f46' },
};

const EMPTY_WITNESS = { idNumber: '', firstName: '', lastName: '', phone: '', relation: '' };
const EMPTY_VEHICLE = { type: '', model: '', plate: '' };

function isAdmin(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  return roles.some(r => r !== 'rider');
}

// בלוק שדה — תווית + ערך
function F({ label, value, wide }) {
  if (!value && value !== 0) return null;
  return (
    <Grid item xs={12} sm={wide ? 12 : 6} md={wide ? 12 : 4}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.5, whiteSpace: wide ? 'pre-wrap' : 'normal' }}>
        {value}
      </Typography>
    </Grid>
  );
}

// שדה עריכה
function EF({ label, name, value, onChange, multiline, rows, select, options, xs = 6, sm = 4 }) {
  if (select) return (
    <Grid item xs={xs} sm={sm}>
      <FormControl fullWidth size="small">
        <InputLabel>{label}</InputLabel>
        <Select name={name} value={value || ''} onChange={onChange} label={label}>
          {options.map(o => <MenuItem key={o.value || o} value={o.value || o}>{o.label || o}</MenuItem>)}
        </Select>
      </FormControl>
    </Grid>
  );
  return (
    <Grid item xs={multiline ? 12 : xs} sm={multiline ? 12 : sm}>
      <TextField fullWidth size="small" label={label} name={name}
        value={value || ''} onChange={onChange}
        multiline={multiline} rows={multiline ? (rows || 3) : undefined} />
    </Grid>
  );
}

// כותרת סקשן עם קו צבעוני משמאל
function Section({ title, accent = '#ef4444', children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 4, height: 24, borderRadius: 4, bgcolor: accent, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {title}
        </Typography>
      </Box>
      <Grid container spacing={2.5}>
        {children}
      </Grid>
    </Box>
  );
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
    } catch { setError('שגיאה בטעינת הנתונים'); }
    finally { setLoading(false); }
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

  const cancelEdit = () => { setEditMode(false); setEditData(null); setError(''); };

  const handleChange = e => setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleArr = (arr, i, field, val) => setEditData(prev => {
    const next = [...prev[arr]]; next[i] = { ...next[i], [field]: val };
    return { ...prev, [arr]: next };
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      await incidentsAPI.update(id, editData);
      setIncident({ ...incident, ...editData });
      setEditMode(false); setEditData(null);
      setSuccess('נשמר בהצלחה');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'שגיאה בשמירה'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: '#ef4444' }} />
    </Box>
  );

  if (!incident) return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>{error || 'לא נמצא'}</Alert>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ color: '#64748b' }}>חזרה</Button>
    </Box>
  );

  const status = STATUS_MAP[incident.status] || { label: incident.status || 'חדש', bgcolor: '#f1f5f9', color: '#475569' };
  const d = editMode ? editData : incident;

  return (
    <Box dir="rtl">
      {/* ===== HEADER ===== */}
      <Paper elevation={0} sx={{
        p: { xs: 2, sm: 3 }, mb: 3, borderRadius: '20px',
        background: 'linear-gradient(135deg, #fff5f5 0%, #fff 60%)',
        border: '1px solid #fecaca',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}
              sx={{ borderRadius: '10px', color: '#64748b', fontWeight: 600, '&:hover': { bgcolor: '#f8fafc' }, minWidth: 'auto', px: 1.5 }}>
              חזרה
            </Button>
            <Box sx={{
              width: 52, height: 52, borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(239,68,68,0.25)',
            }}>
              <ReportProblem sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.6rem' }, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                {incident.incidentNumber}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip label={status.label} size="small"
                  sx={{ bgcolor: status.bgcolor, color: status.color, fontWeight: 700, fontSize: '0.75rem', height: 22 }} />
                {incident.incidentDate && (
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>• {incident.incidentDate}</Typography>
                )}
                {incident.riderFirstName && (
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>• {incident.riderFirstName} {incident.riderLastName}</Typography>
                )}
                {incident.hiddenFromRider && canEdit && (
                  <Chip label="מוסתר מרוכב" size="small"
                    sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {editMode ? <>
              <Button variant="outlined" startIcon={<Cancel />} onClick={cancelEdit}
                sx={{ borderRadius: '10px', fontWeight: 600, color: '#64748b', borderColor: '#e2e8f0', '&:hover': { bgcolor: '#f8fafc' } }}>
                ביטול
              </Button>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                onClick={handleSave} disabled={saving}
                sx={{ borderRadius: '10px', fontWeight: 700, px: 3,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' } }}>
                שמור
              </Button>
            </> : canEdit && (
              <Button variant="contained" startIcon={<Edit />} onClick={startEdit}
                sx={{ borderRadius: '10px', fontWeight: 700, px: 3,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                  '&:hover': { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', transform: 'translateY(-1px)' },
                  transition: 'all 0.15s' }}>
                עריכה
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{success}</Alert>}

      {/* ===== BODY ===== */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: '20px', border: '1px solid #e2e8f0' }}>

        {/* סוג האירוע */}
        <Section title="פרטי האירוע" accent="#ef4444">
          {editMode ? <>
            <EF label="סוג אירוע" name="eventType" value={d.eventType} onChange={handleChange} xs={12} sm={6}
              select options={['תאונת דרכים עם מעורבות רכב נוסף','תאונת דרכים ללא מעורבות רכב נוסף','נפילה מהאופנוע','נזק לאופנוע ללא תאונה','אחר']} />
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 0.5 }}>מי לדעתך אשם?</Typography>
              <RadioGroup row name="fault" value={d.fault || ''} onChange={handleChange}>
                <FormControlLabel value="אני" control={<Radio size="small" />} label="אני" />
                <FormControlLabel value="צד ג'" control={<Radio size="small" />} label="צד ג'" />
              </RadioGroup>
            </Grid>
            <EF label="תאריך" name="incidentDate" value={d.incidentDate} onChange={handleChange} />
            <EF label="שעה" name="incidentTime" value={d.incidentTime} onChange={handleChange} />
            <EF label="כתובת" name="address" value={d.address} onChange={handleChange} xs={12} sm={6} />
            <EF label="עיר" name="city" value={d.city} onChange={handleChange} />
            <EF label="סוג נסיעה" name="drivingType" value={d.drivingType} onChange={handleChange}
              select options={['נסיעה לצורכי עבודה','נסיעה פרטית','נסיעה לצורכי ארגון','אחר']} />
            <EF label="מזג אוויר" name="weather" value={d.weather} onChange={handleChange}
              select options={['בהיר','מעונן','גשם','ערפל','אחר']} />
            <EF label="מעורבות משטרה" name="policeInvolved" value={d.policeInvolved} onChange={handleChange}
              select options={['לא','כן']} />
            {d.policeInvolved === 'כן' && <>
              <EF label="תחנת משטרה" name="policeStation" value={d.policeStation} onChange={handleChange} />
              <EF label="מספר תיק" name="policeCaseNumber" value={d.policeCaseNumber} onChange={handleChange} />
            </>}
          </> : <>
            <F label="סוג אירוע" value={d.eventType} />
            <F label="אחריות" value={d.fault} />
            <F label="תאריך" value={d.incidentDate} />
            <F label="שעה" value={d.incidentTime} />
            <F label="כתובת" value={d.address} />
            <F label="עיר" value={d.city} />
            <F label="סוג נסיעה" value={d.drivingType} />
            <F label="מזג אוויר" value={d.weather} />
            <F label="מעורבות משטרה" value={d.policeInvolved} />
            {d.policeInvolved === 'כן' && <>
              <F label="תחנת משטרה" value={d.policeStation} />
              <F label="מספר תיק" value={d.policeCaseNumber} />
            </>}
          </>}
        </Section>

        <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

        {/* פרטי הרוכב */}
        <Section title="פרטי הרוכב" accent="#6366f1">
          {editMode ? <>
            <EF label="שם פרטי" name="riderFirstName" value={d.riderFirstName} onChange={handleChange} />
            <EF label="שם משפחה" name="riderLastName" value={d.riderLastName} onChange={handleChange} />
            <EF label="תעודת זהות" name="riderIdNumber" value={d.riderIdNumber} onChange={handleChange} />
            <EF label="תאריך לידה" name="birthDate" value={d.birthDate} onChange={handleChange} />
            <EF label="לוחית רישוי" name="vehiclePlate" value={d.vehiclePlate} onChange={handleChange} />
            <EF label="סוג רישיון" name="licenseType" value={d.licenseType} onChange={handleChange}
              select options={['ישראלי','זר','בינלאומי']} />
            <EF label="תאריך הוצאת רישיון" name="licenseIssueDate" value={d.licenseIssueDate} onChange={handleChange} />
            <EF label="תוקף רישיון" name="licenseExpiryDate" value={d.licenseExpiryDate} onChange={handleChange} />
          </> : <>
            <F label="שם" value={`${d.riderFirstName || ''} ${d.riderLastName || ''}`.trim() || undefined} />
            <F label="תעודת זהות" value={d.riderIdNumber} />
            <F label="תאריך לידה" value={d.birthDate} />
            <F label="לוחית רישוי" value={d.vehiclePlate} />
            <F label="סוג רישיון" value={d.licenseType} />
            <F label="תאריך הוצאת רישיון" value={d.licenseIssueDate} />
            <F label="תוקף רישיון" value={d.licenseExpiryDate} />
          </>}
        </Section>

        <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

        {/* תיאור */}
        <Section title="תיאור האירוע" accent="#f59e0b">
          {editMode ? <>
            <EF label="תיאור" name="description" value={d.description} onChange={handleChange} multiline rows={4} />
            <EF label="תרשים" name="diagram" value={d.diagram} onChange={handleChange} multiline rows={2} />
            <EF label="סימון כביש שלנו" name="roadSign" value={d.roadSign} onChange={handleChange} />
            <EF label="סימון כביש צד ג׳" name="thirdPartyRoadSign" value={d.thirdPartyRoadSign} onChange={handleChange} />
          </> : <>
            <F label="תיאור" value={d.description} wide />
            <F label="תרשים" value={d.diagram} wide />
            <F label="סימון כביש שלנו" value={d.roadSign} />
            <F label="סימון כביש צד ג׳" value={d.thirdPartyRoadSign} />
            {!d.description && !d.diagram && !d.roadSign && !d.thirdPartyRoadSign && (
              <Grid item xs={12}><Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>אין תיאור</Typography></Grid>
            )}
          </>}
        </Section>

        <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

        {/* עדים */}
        <Section title="עדים" accent="#8b5cf6">
          {editMode ? <>
            {d.witnesses.map((w, i) => (
              <Grid item xs={12} key={i}>
                <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#fafafa' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>עד {i + 1}</Typography>
                    {d.witnesses.length > 1 && (
                      <IconButton size="small" onClick={() => setEditData(p => ({ ...p, witnesses: p.witnesses.filter((_, j) => j !== i) }))}>
                        <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    {[['שם פרטי','firstName'],['שם משפחה','lastName'],['ת"ז','idNumber'],['טלפון','phone'],['קשר','relation']].map(([lbl, fld]) => (
                      <Grid item xs={6} sm={4} key={fld}>
                        <TextField fullWidth size="small" label={lbl} value={w[fld] || ''}
                          onChange={e => handleArr('witnesses', i, fld, e.target.value)} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" startIcon={<Add />} onClick={() => setEditData(p => ({ ...p, witnesses: [...p.witnesses, { ...EMPTY_WITNESS }] }))}
                sx={{ color: '#6366f1', fontWeight: 600 }}>הוסף עד</Button>
            </Grid>
          </> : (
            d.witnesses?.some(w => w.firstName || w.lastName || w.idNumber)
              ? d.witnesses.filter(w => w.firstName || w.lastName || w.idNumber).map((w, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box sx={{ p: 2, border: '1px solid #ede9fe', borderRadius: '14px', bgcolor: '#faf5ff' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#5b21b6', mb: 1 }}>
                      {`${w.firstName || ''} ${w.lastName || ''}`.trim() || `עד ${i + 1}`}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {w.idNumber && <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>ת"ז: <strong>{w.idNumber}</strong></Typography>}
                      {w.phone && <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>טל: <strong>{w.phone}</strong></Typography>}
                      {w.relation && <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>קשר: <strong>{w.relation}</strong></Typography>}
                    </Box>
                  </Box>
                </Grid>
              ))
              : <Grid item xs={12}><Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>אין עדים</Typography></Grid>
          )}
        </Section>

        <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

        {/* רכבים */}
        <Section title="רכבים ונפגעים" accent="#f97316">
          {editMode ? <>
            {d.involvedVehicles.map((v, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#fafafa' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>רכב {i + 1}</Typography>
                    {d.involvedVehicles.length > 1 && (
                      <IconButton size="small" onClick={() => setEditData(p => ({ ...p, involvedVehicles: p.involvedVehicles.filter((_, j) => j !== i) }))}>
                        <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={1.5}>
                    {[['סוג','type'],['דגם','model'],['לוחית','plate']].map(([lbl, fld]) => (
                      <Grid item xs={4} key={fld}>
                        <TextField fullWidth size="small" label={lbl} value={v[fld] || ''}
                          onChange={e => handleArr('involvedVehicles', i, fld, e.target.value)} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" startIcon={<Add />} onClick={() => setEditData(p => ({ ...p, involvedVehicles: [...p.involvedVehicles, { ...EMPTY_VEHICLE }] }))}
                sx={{ color: '#6366f1', fontWeight: 600 }}>הוסף רכב</Button>
            </Grid>
            <Grid item xs={12}><Divider sx={{ borderColor: '#e2e8f0' }} /></Grid>
            <EF label="פציעות" name="hasInjuries" value={d.hasInjuries} onChange={handleChange} select options={['לא','כן']} />
            {d.hasInjuries === 'כן' && <>
              <EF label="פצועי צד ג׳" name="thirdPartyInjuredCount" value={d.thirdPartyInjuredCount} onChange={handleChange} />
              <EF label="פצועי הרוכב" name="insuredInjuredCount" value={d.insuredInjuredCount} onChange={handleChange} />
            </>}
          </> : <>
            {d.involvedVehicles?.filter(v => v.type || v.model || v.plate).map((v, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Box sx={{ p: 2, border: '1px solid #ffedd5', borderRadius: '14px', bgcolor: '#fff7ed' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#c2410c', mb: 1 }}>רכב {i + 1}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {v.type && <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>סוג: <strong>{v.type}</strong></Typography>}
                    {v.model && <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>דגם: <strong>{v.model}</strong></Typography>}
                    {v.plate && <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>לוחית: <strong>{v.plate}</strong></Typography>}
                  </Box>
                </Box>
              </Grid>
            ))}
            {!d.involvedVehicles?.some(v => v.type || v.model || v.plate) && (
              <Grid item xs={12}><Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>אין רכבים מעורבים</Typography></Grid>
            )}
            <Grid item xs={12}><Divider sx={{ borderColor: '#f1f5f9' }} /></Grid>
            <F label="פציעות" value={d.hasInjuries} />
            {d.hasInjuries === 'כן' && <>
              <F label="פצועי צד ג׳" value={d.thirdPartyInjuredCount} />
              <F label="פצועי הרוכב" value={d.insuredInjuredCount} />
            </>}
          </>}
        </Section>

        {/* תמונות */}
        {incident.photos?.length > 0 && <>
          <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />
          <Section title={`תמונות (${incident.photos.length})`} accent="#0ea5e9">
            {incident.photos.map((photo, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Box component="a" href={photo.url} target="_blank" rel="noopener noreferrer"
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1.5, borderRadius: '10px', border: '1px solid #bae6fd',
                    bgcolor: '#f0f9ff', textDecoration: 'none',
                    color: '#0369a1', fontWeight: 600, fontSize: '0.82rem',
                    '&:hover': { bgcolor: '#e0f2fe', borderColor: '#0369a1' },
                    transition: 'all 0.15s',
                  }}>
                  📎 {photo.name?.replace(/^[^_]+_/, '') || `תמונה ${i + 1}`}
                </Box>
              </Grid>
            ))}
          </Section>
        </>}

        <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

        {/* סטטוס והערות */}
        <Section title="סטטוס והערות" accent="#10b981">
          {editMode ? <>
            <EF label="סטטוס" name="status" value={d.status} onChange={handleChange}
              select options={[{ value:'new',label:'חדש' },{ value:'in_progress',label:'בטיפול' },{ value:'closed',label:'סגור' }]} />
            <EF label="הערות" name="notes" value={d.notes} onChange={handleChange} multiline rows={3} />
            {canEdit && (
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 0.5 }}>גלוי לרוכב</Typography>
                <RadioGroup row name="hiddenFromRider" value={d.hiddenFromRider ? 'hidden' : 'visible'}
                  onChange={e => setEditData(p => ({ ...p, hiddenFromRider: e.target.value === 'hidden' }))}>
                  <FormControlLabel value="visible" control={<Radio size="small" />} label="גלוי" />
                  <FormControlLabel value="hidden" control={<Radio size="small" />} label="מוסתר" />
                </RadioGroup>
              </Grid>
            )}
          </> : <>
            <F label="סטטוס" value={STATUS_MAP[d.status]?.label || d.status} />
            {canEdit && <F label="גלוי לרוכב" value={d.hiddenFromRider ? 'מוסתר' : 'גלוי'} />}
            <F label="הערות" value={d.notes} wide />
          </>}
        </Section>

      </Paper>
    </Box>
  );
}
