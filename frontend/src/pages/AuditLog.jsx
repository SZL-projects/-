import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  History as HistoryIcon,
  FilterList,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Email as EmailIcon,
} from '@mui/icons-material';
import { auditLogsAPI } from '../services/api';

const actionMap = {
  create:        { label: 'יצירה',         color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)' },
  update:        { label: 'עדכון',          color: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.1)' },
  delete:        { label: 'מחיקה',         color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
  login:         { label: 'כניסה',          color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' },
  logout:        { label: 'יציאה',          color: '#64748b', bgcolor: 'rgba(100, 116, 139, 0.1)' },
  status_change: { label: 'שינוי סטטוס',   color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' },
  assign:        { label: 'הקצאה',          color: '#06b6d4', bgcolor: 'rgba(6, 182, 212, 0.1)' },
  unassign:      { label: 'ביטול הקצאה',   color: '#ec4899', bgcolor: 'rgba(236, 72, 153, 0.1)' },
  email_sent:    { label: 'שליחת מייל',    color: '#0ea5e9', bgcolor: 'rgba(14, 165, 233, 0.1)' },
};

const entityTypeMap = {
  vehicle:         'כלי',
  rider:           'רוכב',
  fault:           'תקלה',
  task:            'משימה',
  maintenance:     'טיפול',
  monthly_check:   'בקרה חודשית',
  insurance_claim: 'תביעת ביטוח',
  user:            'משתמש',
  permission:      'הרשאה',
  donation:        'תרומה',
  email:           'מייל',
};

// תרגום ערכים לעברית
const valueMap = {
  // סטטוסים כלליים
  active:              'פעיל',
  inactive:            'לא פעיל',
  pending:             'ממתין',
  completed:           'הושלם',
  cancelled:           'בוטל',
  closed:              'סגור',
  open:                'פתוח',
  in_progress:         'בטיפול',
  // שיוך
  assigned:            'משויך',
  unassigned:          'לא משויך',
  waiting_for_rider:   'ממתין לרוכב',
  available:           'זמין',
  // עדיפות / חומרה
  low:                 'נמוכה',
  medium:              'בינונית',
  high:                'גבוהה',
  urgent:              'דחוף',
  critical:            'קריטי',
  // סוגי כלי
  motorcycle:          'אופנוע',
  scooter:             'קטנוע',
  // תפקידים
  admin:               'מנהל',
  manager:             'מנהל יחידה',
  user:                'משתמש',
  viewer:              'צופה',
  rider:               'רוכב',
  // תשלום
  company:             'חברה',
  personal:            'אישי',
  insurance:           'ביטוח',
  // כן/לא
  true:                'כן',
  false:               'לא',
  yes:                 'כן',
  no:                  'לא',
  // תוצאות בקרה
  pass:                'עבר',
  fail:                'נכשל',
  na:                  'לא רלוונטי',
  // סוגי ביטוח
  third_party:         'צד שלישי',
  // תחנה
  station:             'תחנה',
  district:            'מחוז',
  // ביטוח תביעה
  approved:            'מאושר',
  rejected:            'נדחה',
  under_review:        'בבדיקה',
  paid:                'שולם',
};

// תרגום שמות שדות לעברית
const fieldLabelMap = {
  firstName:          'שם פרטי',
  lastName:           'שם משפחה',
  email:              'דוא"ל',
  phone:              'טלפון',
  status:             'סטטוס',
  riderStatus:        'סטטוס רוכב',
  district:           'מחוז',
  area:               'אזור',
  notes:              'הערות',
  description:        'תיאור',
  title:              'כותרת',
  priority:           'עדיפות',
  dueDate:            'תאריך יעד',
  assignedTo:         'מוקצה ל',
  assignedRiderId:    'רוכב משויך',
  licensePlate:       'מספר רישוי',
  internalNumber:     'מספר פנימי',
  manufacturer:       'יצרן',
  model:              'דגם',
  year:               'שנה',
  currentKilometers:  'קילומטראז\' נוכחי',
  maintenanceType:    'סוג טיפול',
  maintenanceDate:    'תאריך טיפול',
  nextMaintenanceKm:  'ק"מ לטיפול הבא',
  costs:              'עלויות',
  paidBy:             'שולם על ידי',
  severity:           'חומרה',
  reportedDate:       'תאריך דיווח',
  resolvedDate:       'תאריך פתרון',
  vehicleId:          'מזהה כלי',
  riderId:            'מזהה רוכב',
  eventType:          'סוג אירוע',
  eventDate:          'תאריך אירוע',
  insuranceCompany:   'חברת ביטוח',
  insuranceType:      'סוג ביטוח',
  claimNumber:        'מספר תביעה',
  approvedAmount:     'סכום מאושר',
  rejectionReason:    'סיבת דחייה',
  checkDate:          'תאריך בקרה',
  mileage:            'קילומטראז\'',
  role:               'תפקיד',
  roles:              'תפקידים',
  username:           'שם משתמש',
  isActive:           'פעיל',
  address:            'כתובת',
  idNumber:           'מספר תעודת זהות',
  licenseNumber:      'מספר רישיון',
  licenseExpiry:      'תפוגת רישיון',
  insuranceExpiry:    'תפוגת ביטוח',
  vehicleTestExpiry:  'תפוגת טסט',
  assignmentStatus:   'סטטוס שיוך',
  region:             'אזור',
  vehicleType:        'סוג כלי',
  color:              'צבע',
  engineSize:         'נפח מנוע',
  assignedVehicleId:  'כלי משויך',
  riderIdNumber:      'ת.ז. רוכב',
  insurance:          'ביטוח',
  vehicleLicense:     'רישיון רכב',
  driveFolderData:    'תיקיית Drive',
  fileSettings:       'הגדרות קבצים',
};

function translateValue(value) {
  if (value === null || value === undefined) return '(ריק)';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (typeof value === 'object') {
    try {
      const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== '');
      if (entries.length === 0) return '(ריק)';
      if (entries.length <= 4) {
        return entries.map(([k, v]) => {
          const label = fieldLabelMap[k] || k;
          const val = valueMap[String(v)] || String(v);
          return `${label}: ${val}`;
        }).join(' | ');
      }
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const str = String(value);
  return valueMap[str] || str;
}

function ChangesPanel({ changes }) {
  if (!changes || typeof changes !== 'object') return null;

  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  // בדיקה אם זה פורמט { field: { old, new } } או פשוט { field: value }
  const isDetailedDiff = entries.some(([, v]) => v && typeof v === 'object' && ('old' in v || 'new' in v));

  if (isDetailedDiff) {
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
          שינויים:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {entries.map(([field, diff]) => {
            const label = fieldLabelMap[field] || field;
            const oldVal = translateValue(diff?.old);
            const newVal = translateValue(diff?.new);
            return (
              <Box key={field} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', minWidth: 100 }}>
                  {label}:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', direction: 'ltr' }}>
                  <Chip
                    label={oldVal}
                    size="small"
                    sx={{ bgcolor: 'rgba(239,68,68,0.08)', color: '#b91c1c', fontSize: '0.72rem', height: 22, maxWidth: 200 }}
                  />
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>←</Typography>
                  <Chip
                    label={newVal}
                    size="small"
                    sx={{ bgcolor: 'rgba(16,185,129,0.08)', color: '#065f46', fontSize: '0.72rem', height: 22, maxWidth: 200 }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // פורמט ישן - רק הערכים החדשים
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
        נתונים:
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {entries.map(([field, value]) => {
          const label = fieldLabelMap[field] || field;
          return (
            <Box key={field} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', minWidth: 100 }}>{label}:</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>{translateValue(value)}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function LogRow({ log, isMobile }) {
  const [open, setOpen] = useState(false);

  const actionInfo = actionMap[log.action] || { label: log.action, color: '#64748b', bgcolor: 'rgba(100, 116, 139, 0.1)' };

  const formatDate = (date) => {
    if (!date) return '-';
    let d;
    if (date?._seconds !== undefined) {
      d = new Date(date._seconds * 1000);
    } else if (typeof date?.toDate === 'function') {
      d = date.toDate();
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(99,102,241,0.03)' },
          ...(open ? { bgcolor: 'rgba(99,102,241,0.04)' } : {}),
        }}
        onClick={() => setOpen(p => !p)}
      >
        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', py: 1 }}>
          {formatDate(log.timestamp)}
        </TableCell>
        <TableCell sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
            {log.userName || '-'}
          </Typography>
        </TableCell>
        <TableCell sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {log.action === 'email_sent' && <EmailIcon sx={{ fontSize: 14, color: '#0ea5e9' }} />}
            <Chip
              label={actionInfo.label}
              size="small"
              sx={{ bgcolor: actionInfo.bgcolor, color: actionInfo.color, fontWeight: 600, fontSize: '0.72rem' }}
            />
          </Box>
        </TableCell>
        {!isMobile && (
          <TableCell sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem' }}>
              {entityTypeMap[log.entityType] || log.entityType || '-'}
            </Typography>
          </TableCell>
        )}
        {!isMobile && (
          <TableCell sx={{ py: 1 }}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 160, fontSize: '0.82rem' }}>
              {log.entityName || '-'}
            </Typography>
          </TableCell>
        )}
        <TableCell sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', flex: 1 }}>
              {log.description || '-'}
            </Typography>
            <Tooltip title={open ? 'הסתר פרטים' : 'הצג פרטים'}>
              <IconButton size="small" sx={{ p: 0.2 }} onClick={e => { e.stopPropagation(); setOpen(p => !p); }}>
                {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={isMobile ? 4 : 6} sx={{ py: 0, borderBottom: open ? '1px solid #e2e8f0' : 'none', bgcolor: 'rgba(241,245,249,0.6)' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ px: 3, py: 1.5, direction: 'rtl', textAlign: 'right' }}>

              {/* פרטים בסיסיים - תמיד מוצגים */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1, justifyContent: 'flex-start' }}>
                {log.entityType && (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    <strong>סוג:</strong> {entityTypeMap[log.entityType] || log.entityType}
                  </Typography>
                )}
                {log.entityName && (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    <strong>שם:</strong> {log.entityName}
                  </Typography>
                )}
                {log.userName && (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    <strong>ביצע:</strong> {log.userName}
                  </Typography>
                )}
                {log.entityId && (
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    <strong>מזהה:</strong> {log.entityId}
                  </Typography>
                )}
              </Box>

              {/* פרטי מייל */}
              {log.action === 'email_sent' && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    פרטי המייל:
                  </Typography>
                  {log.metadata?.to && (
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                      נמען: <strong>{log.metadata.to}</strong>
                    </Typography>
                  )}
                  {log.entityName && !log.metadata?.to && (
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                      נמען: <strong>{log.entityName}</strong>
                    </Typography>
                  )}
                  {log.metadata?.subject && (
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                      נושא: <strong>{log.metadata.subject}</strong>
                    </Typography>
                  )}
                  {log.metadata?.messageId && (
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                      מזהה הודעה: {log.metadata.messageId}
                    </Typography>
                  )}
                </Box>
              )}

              {/* פרטי שינויים */}
              {log.changes ? (
                <ChangesPanel changes={log.changes} />
              ) : log.action === 'update' ? (
                <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  פרטי שינויים לא נרשמו (לוג ישן)
                </Typography>
              ) : null}

              {/* מטאדאטה - IP */}
              {log.metadata?.ip && log.action !== 'email_sent' && (
                <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                  IP: {log.metadata.ip}
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function AuditLog() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterUser) params.userId = filterUser;
      if (filterAction) params.action = filterAction;
      if (filterEntity) params.entityType = filterEntity;
      if (filterSearch) params.search = filterSearch;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;
      params.limit = 200;

      const res = await auditLogsAPI.getAll(params);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('שגיאה בטעינת לוג פעילות');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterAction, filterEntity, filterSearch, filterDateFrom, filterDateTo]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await auditLogsAPI.getUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const paperSx = {
    p: 3,
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const selectSx = {
    borderRadius: '12px',
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', borderWidth: 2 },
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box sx={{
          width: 56, height: 56, borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
        }}>
          <HistoryIcon sx={{ fontSize: 28, color: '#ffffff' }} />
        </Box>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ color: '#1e293b' }}>
            לוג פעילות
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            כל הפעולות שבוצעו במערכת – לחץ על שורה לפרטים מלאים
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ ...paperSx, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            bgcolor: 'rgba(99, 102, 241, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FilterList sx={{ color: '#6366f1', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>סינון</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>משתמש</InputLabel>
              <Select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} label="משתמש" sx={selectSx}>
                <MenuItem value="">הכל</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>פעולה</InputLabel>
              <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} label="פעולה" sx={selectSx}>
                <MenuItem value="">הכל</MenuItem>
                {Object.entries(actionMap).map(([key, val]) => (
                  <MenuItem key={key} value={key}>{val.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>סוג ישות</InputLabel>
              <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} label="סוג ישות" sx={selectSx}>
                <MenuItem value="">הכל</MenuItem>
                {Object.entries(entityTypeMap).map(([key, val]) => (
                  <MenuItem key={key} value={key}>{val}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" label="מתאריך" type="date"
              value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={textFieldSx} />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" label="עד תאריך" type="date"
              value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={textFieldSx} />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" label="חיפוש חופשי"
              value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
              sx={textFieldSx} />
          </Grid>
        </Grid>
      </Paper>

      {!loading && (
        <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
          {logs.length} רשומות נמצאו
        </Typography>
      )}

      {/* Table */}
      <Paper sx={paperSx}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#64748b' }}>אין רשומות בלוג</Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>פעולות שיבוצעו במערכת יירשמו כאן</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>תאריך ושעה</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>משתמש</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>פעולה</TableCell>
                  {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>סוג</TableCell>}
                  {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>שם</TableCell>}
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>תיאור / פרטים</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} isMobile={isMobile} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
