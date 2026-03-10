import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Chip, TextField, Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Download,
  CalendarToday,
  InboxOutlined,
} from '@mui/icons-material';
import { faultsAPI, maintenanceAPI, monthlyChecksAPI, insuranceClaimsAPI } from '../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const parseDate = (val) => {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val._seconds) return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (val) => {
  const d = parseDate(val);
  if (!d) return '-';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtCurrency = (val) => {
  if (!val && val !== 0) return '-';
  return `₪${Number(val).toLocaleString('he-IL')}`;
};

const exportCSV = (rows, headers, filename) => {
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ── label maps ────────────────────────────────────────────────────────────────

const SEVERITY_LABEL = { critical: 'קריטית', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
const SEVERITY_CHIP = {
  critical: { bg: '#fee2e2', color: '#dc2626' },
  high:     { bg: '#ffedd5', color: '#ea580c' },
  medium:   { bg: '#fef9c3', color: '#ca8a04' },
  low:      { bg: '#dcfce7', color: '#16a34a' },
};

const FAULT_STATUS_LABEL = { open: 'פתוחה', in_progress: 'בטיפול', resolved: 'נפתרה', closed: 'סגור' };
const FAULT_STATUS_CHIP = {
  open:        { bg: '#fee2e2', color: '#dc2626' },
  in_progress: { bg: '#dbeafe', color: '#1d4ed8' },
  resolved:    { bg: '#dcfce7', color: '#16a34a' },
  closed:      { bg: '#f1f5f9', color: '#64748b' },
};

const MAINT_TYPE_LABEL = { preventive: 'מונע', corrective: 'מתקן', annual_test: 'טסט שנתי', other: 'אחר' };

const CHECK_STATUS_LABEL = { pending: 'ממתין', completed: 'הושלם', passed: 'עבר', issues: 'בעיות', failed: 'נכשל' };
const CHECK_STATUS_CHIP = {
  pending:   { bg: '#fef9c3', color: '#ca8a04' },
  completed: { bg: '#dcfce7', color: '#16a34a' },
  passed:    { bg: '#dcfce7', color: '#16a34a' },
  issues:    { bg: '#ffedd5', color: '#ea580c' },
  failed:    { bg: '#fee2e2', color: '#dc2626' },
};

const CLAIM_STATUS_LABEL = { draft: 'טיוטה', submitted: 'הוגש', under_review: 'בבדיקה', approved: 'אושר', rejected: 'נדחה', closed: 'סגור' };
const CLAIM_STATUS_CHIP = {
  draft:        { bg: '#f1f5f9', color: '#64748b' },
  submitted:    { bg: '#dbeafe', color: '#1d4ed8' },
  under_review: { bg: '#fef9c3', color: '#ca8a04' },
  approved:     { bg: '#dcfce7', color: '#16a34a' },
  rejected:     { bg: '#fee2e2', color: '#dc2626' },
  closed:       { bg: '#f1f5f9', color: '#475569' },
};

const CLAIM_EVENT_LABEL = { accident: 'תאונה', theft: 'גניבה', vandalism: 'ונדליזם', natural_disaster: 'אסון טבע', other: 'אחר' };

// ── sub-components ─────────────────────────────────────────────────────────────

const StatusChip = ({ label, chipMap, value }) => {
  const c = chipMap[value] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: '0.72rem', height: 24, borderRadius: '6px' }}
    />
  );
};

const SummaryCard = ({ label, value, color = '#6366f1', bg = 'rgba(99,102,241,0.08)' }) => (
  <Box sx={{ px: 2.5, py: 1.5, borderRadius: '12px', bgcolor: bg, textAlign: 'center', minWidth: 110 }}>
    <Typography variant="h5" fontWeight="bold" sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: '#64748b', whiteSpace: 'nowrap', display: 'block', mt: 0.3 }}>{label}</Typography>
  </Box>
);

const EmptyState = ({ message }) => (
  <Box sx={{ textAlign: 'center', py: 10, color: '#94a3b8' }}>
    <InboxOutlined sx={{ fontSize: 56, mb: 1.5, opacity: 0.5 }} />
    <Typography variant="body1" sx={{ fontWeight: 500 }}>{message}</Typography>
    <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.7 }}>נסה לשנות את טווח התאריכים</Typography>
  </Box>
);

const headCellSx = {
  fontWeight: 700,
  color: '#64748b',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  py: 1.5,
  borderBottom: '2px solid #e2e8f0',
  bgcolor: '#f8fafc',
  whiteSpace: 'nowrap',
};

const bodyCellSx = {
  fontSize: '0.875rem',
  color: '#1e293b',
  py: 1.2,
  borderBottom: '1px solid #f1f5f9',
};

// ── main component ─────────────────────────────────────────────────────────────

export default function Reports() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo   = today.toISOString().split('T')[0];

  const [tab, setTab] = useState(0);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo,   setDateTo]   = useState(defaultTo);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [faults,      setFaults]      = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [checks,      setChecks]      = useState([]);
  const [claims,      setClaims]      = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [f, m, c, ins] = await Promise.all([
          faultsAPI.getAll({ limit: 5000 }),
          maintenanceAPI.getAll({ limit: 5000 }),
          monthlyChecksAPI.getAll({ limit: 5000 }),
          insuranceClaimsAPI.getAll({ limit: 5000 }),
        ]);
        setFaults(f.data?.faults || []);
        setMaintenance(m.data?.maintenances || []);
        setChecks(c.data?.monthlyChecks || []);
        setClaims(ins.data?.claims || []);
      } catch {
        setError('שגיאה בטעינת הנתונים. נסה לרענן את הדף.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const inRange = (val) => {
    const d = parseDate(val);
    if (!d) return false;
    const from = new Date(dateFrom);
    const to   = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const filteredFaults      = useMemo(() => faults.filter(f => inRange(f.reportedDate || f.createdAt)),      [faults,      dateFrom, dateTo]);
  const filteredMaintenance = useMemo(() => maintenance.filter(m => inRange(m.maintenanceDate || m.createdAt)), [maintenance, dateFrom, dateTo]);
  const filteredChecks      = useMemo(() => checks.filter(c => inRange(c.checkDate || c.createdAt)),           [checks,      dateFrom, dateTo]);
  const filteredClaims      = useMemo(() => claims.filter(c => inRange(c.eventDate || c.createdAt)),           [claims,      dateFrom, dateTo]);

  const setPreset = (fromDate, toDate) => {
    setDateFrom(fromDate.toISOString().split('T')[0]);
    setDateTo(toDate.toISOString().split('T')[0]);
  };

  const presets = [
    { label: 'החודש',     from: new Date(today.getFullYear(), today.getMonth(), 1),    to: today },
    { label: 'חודש שעבר', from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 0) },
    { label: '3 חודשים',  from: new Date(today.getFullYear(), today.getMonth() - 2, 1), to: today },
    { label: 'השנה',      from: new Date(today.getFullYear(), 0, 1),                   to: today },
  ];

  // ── export ────────────────────────────────────────────────────────────────────

  const handleExport = () => {
    if (tab === 0) {
      exportCSV(
        filteredFaults.map(f => [
          fmtDate(f.reportedDate || f.createdAt),
          f.vehicleLicensePlate || f.vehicleNumber || '-',
          f.riderName || '-',
          f.title || f.description?.substring(0, 80) || '-',
          SEVERITY_LABEL[f.severity] || f.severity || '-',
          FAULT_STATUS_LABEL[f.status] || f.status || '-',
          fmtDate(f.resolvedDate),
        ]),
        ['תאריך דיווח', 'לוחית', 'רוכב', 'תיאור', 'חומרה', 'סטטוס', 'תאריך סגירה'],
        'תקלות.csv'
      );
    } else if (tab === 1) {
      exportCSV(
        filteredMaintenance.map(m => [
          fmtDate(m.maintenanceDate || m.createdAt),
          m.vehicleLicensePlate || m.vehicleNumber || '-',
          MAINT_TYPE_LABEL[m.maintenanceType] || m.maintenanceType || '-',
          m.description || '-',
          m.costs?.totalCost ?? '-',
          m.status === 'completed' ? 'הושלם' : m.status === 'pending' ? 'ממתין' : (m.status || '-'),
        ]),
        ['תאריך', 'לוחית', 'סוג', 'תיאור', 'עלות (₪)', 'סטטוס'],
        'תחזוקה.csv'
      );
    } else if (tab === 2) {
      exportCSV(
        filteredChecks.map(c => [
          fmtDate(c.checkDate || c.createdAt),
          c.vehicleLicensePlate || c.vehicleNumber || '-',
          c.riderName || '-',
          CHECK_STATUS_LABEL[c.hasIssues ? 'issues' : c.status] || c.status || '-',
        ]),
        ['תאריך', 'לוחית', 'רוכב', 'סטטוס'],
        'בקרות-חודשיות.csv'
      );
    } else {
      exportCSV(
        filteredClaims.map(c => [
          fmtDate(c.eventDate || c.createdAt),
          c.vehicleLicensePlate || c.vehicleNumber || '-',
          c.riderName || '-',
          CLAIM_EVENT_LABEL[c.eventType] || c.eventType || '-',
          c.claimAmount ?? '-',
          CLAIM_STATUS_LABEL[c.status] || c.status || '-',
          c.approvedAmount ?? '-',
        ]),
        ['תאריך אירוע', 'לוחית', 'רוכב', 'סוג', 'סכום תביעה (₪)', 'סטטוס', 'סכום אושר (₪)'],
        'תביעות-ביטוח.csv'
      );
    }
  };

  // ── tab content ──────────────────────────────────────────────────────────────

  const renderFaults = () => {
    const data = filteredFaults.slice().sort((a, b) =>
      (parseDate(b.reportedDate || b.createdAt) || 0) - (parseDate(a.reportedDate || a.createdAt) || 0)
    );
    const critical = data.filter(f => f.severity === 'critical' || f.severity === 'high').length;
    const open     = data.filter(f => f.status === 'open' || f.status === 'in_progress').length;
    const resolved = data.filter(f => f.status === 'resolved' || f.status === 'closed').length;

    return (
      <>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <SummaryCard label='סה"כ תקלות'     value={data.length} />
          <SummaryCard label="חמורות / קריטיות" value={critical}    color="#dc2626" bg="rgba(239,68,68,0.08)" />
          <SummaryCard label="פתוחות / בטיפול" value={open}        color="#1d4ed8" bg="rgba(29,78,216,0.08)" />
          <SummaryCard label="נסגרו / נפתרו"   value={resolved}    color="#16a34a" bg="rgba(22,163,74,0.08)" />
        </Box>

        {data.length === 0 ? <EmptyState message="אין תקלות בטווח התאריכים שנבחר" /> : (
          <TableContainer sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: '100%' }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  {['תאריך דיווח', 'לוחית', 'רוכב', 'תיאור', 'חומרה', 'סטטוס', 'תאריך סגירה'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((f, i) => (
                  <TableRow key={f.id || f._id || i} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={bodyCellSx}>{fmtDate(f.reportedDate || f.createdAt)}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{f.vehicleLicensePlate || f.vehicleNumber || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{f.riderName || '-'}</TableCell>
                    <TableCell sx={{ ...bodyCellSx }}>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.title || f.description?.substring(0, 70) || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip label={SEVERITY_LABEL[f.severity] || f.severity || '-'} chipMap={SEVERITY_CHIP} value={f.severity} />
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip label={FAULT_STATUS_LABEL[f.status] || f.status || '-'} chipMap={FAULT_STATUS_CHIP} value={f.status} />
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, color: '#64748b' }}>{fmtDate(f.resolvedDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </>
    );
  };

  const renderMaintenance = () => {
    const data = filteredMaintenance.slice().sort((a, b) =>
      (parseDate(b.maintenanceDate || b.createdAt) || 0) - (parseDate(a.maintenanceDate || a.createdAt) || 0)
    );
    const totalCost = data.reduce((sum, m) => sum + (m.costs?.totalCost || 0), 0);
    const completed = data.filter(m => m.status === 'completed').length;

    return (
      <>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <SummaryCard label='סה"כ טיפולים' value={data.length} />
          <SummaryCard label="הושלמו"        value={completed}           color="#16a34a" bg="rgba(22,163,74,0.08)" />
          <SummaryCard label="עלות כוללת"    value={fmtCurrency(totalCost)} color="#6366f1" bg="rgba(99,102,241,0.08)" />
        </Box>

        {data.length === 0 ? <EmptyState message="אין טיפולים בטווח התאריכים שנבחר" /> : (
          <TableContainer sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: '100%' }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 90 }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  {['תאריך', 'לוחית', 'סוג טיפול', 'תיאור', 'עלות', 'סטטוס'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((m, i) => (
                  <TableRow key={m.id || m._id || i} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={bodyCellSx}>{fmtDate(m.maintenanceDate || m.createdAt)}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{m.vehicleLicensePlate || m.vehicleNumber || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{MAINT_TYPE_LABEL[m.maintenanceType] || m.maintenanceType || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600, color: '#6366f1' }}>
                      {m.costs?.totalCost ? fmtCurrency(m.costs.totalCost) : '-'}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Chip
                        label={m.status === 'completed' ? 'הושלם' : m.status === 'pending' ? 'ממתין' : (m.status || '-')}
                        size="small"
                        sx={{
                          bgcolor: m.status === 'completed' ? 'rgba(22,163,74,0.1)' : 'rgba(202,138,4,0.1)',
                          color:   m.status === 'completed' ? '#16a34a' : '#ca8a04',
                          fontWeight: 600, fontSize: '0.72rem', height: 24, borderRadius: '6px',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </>
    );
  };

  const renderChecks = () => {
    const data = filteredChecks.slice().sort((a, b) =>
      (parseDate(b.checkDate || b.createdAt) || 0) - (parseDate(a.checkDate || a.createdAt) || 0)
    );
    const completed = data.filter(c => c.status === 'completed' || c.status === 'passed').length;
    const pending   = data.filter(c => c.status === 'pending').length;
    const issues    = data.filter(c => c.status === 'issues' || c.hasIssues).length;

    return (
      <>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <SummaryCard label='סה"כ בקרות' value={data.length} />
          <SummaryCard label="הושלמו"     value={completed}  color="#16a34a" bg="rgba(22,163,74,0.08)" />
          <SummaryCard label="ממתינות"    value={pending}    color="#ca8a04" bg="rgba(202,138,4,0.08)" />
          <SummaryCard label="עם בעיות"   value={issues}     color="#ea580c" bg="rgba(234,88,12,0.08)" />
        </Box>

        {data.length === 0 ? <EmptyState message="אין בקרות בטווח התאריכים שנבחר" /> : (
          <TableContainer sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 120 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: '100%' }} />
                <col style={{ width: 100 }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  {['תאריך', 'לוחית', 'רוכב', 'סטטוס'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((c, i) => (
                  <TableRow key={c.id || c._id || i} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={bodyCellSx}>{fmtDate(c.checkDate || c.createdAt)}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{c.vehicleLicensePlate || c.vehicleNumber || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{c.riderName || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip
                        label={CHECK_STATUS_LABEL[c.hasIssues ? 'issues' : c.status] || c.status || '-'}
                        chipMap={CHECK_STATUS_CHIP}
                        value={c.hasIssues ? 'issues' : c.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </>
    );
  };

  const renderClaims = () => {
    const data = filteredClaims.slice().sort((a, b) =>
      (parseDate(b.eventDate || b.createdAt) || 0) - (parseDate(a.eventDate || a.createdAt) || 0)
    );
    const totalClaimed  = data.reduce((s, c) => s + (c.claimAmount    || 0), 0);
    const totalApproved = data.reduce((s, c) => s + (c.approvedAmount || 0), 0);
    const open = data.filter(c => !['closed', 'rejected'].includes(c.status)).length;

    return (
      <>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <SummaryCard label='סה"כ תביעות' value={data.length} />
          <SummaryCard label="פתוחות"      value={open}                    color="#1d4ed8" bg="rgba(29,78,216,0.08)" />
          <SummaryCard label="סה״כ נתבע"   value={fmtCurrency(totalClaimed)}  color="#ea580c" bg="rgba(234,88,12,0.08)" />
          <SummaryCard label="סה״כ אושר"   value={fmtCurrency(totalApproved)} color="#16a34a" bg="rgba(22,163,74,0.08)" />
        </Box>

        {data.length === 0 ? <EmptyState message="אין תביעות בטווח התאריכים שנבחר" /> : (
          <TableContainer sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  {['תאריך אירוע', 'לוחית', 'רוכב', 'סוג אירוע', 'סכום תביעה', 'סטטוס', 'סכום אושר'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((c, i) => (
                  <TableRow key={c.id || c._id || i} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={bodyCellSx}>{fmtDate(c.eventDate || c.createdAt)}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{c.vehicleLicensePlate || c.vehicleNumber || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{c.riderName || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{CLAIM_EVENT_LABEL[c.eventType] || c.eventType || '-'}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{c.claimAmount ? fmtCurrency(c.claimAmount) : '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip label={CLAIM_STATUS_LABEL[c.status] || c.status || '-'} chipMap={CLAIM_STATUS_CHIP} value={c.status} />
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, fontWeight: 600, color: '#16a34a' }}>
                      {c.approvedAmount ? fmtCurrency(c.approvedAmount) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </>
    );
  };

  const TAB_LABELS = ['תקלות', 'תחזוקה', 'בקרות חודשיות', 'ביטוח'];
  const TAB_COUNTS = [filteredFaults.length, filteredMaintenance.length, filteredChecks.length, filteredClaims.length];
  const tabContent  = [renderFaults, renderMaintenance, renderChecks, renderClaims];

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
            flexShrink: 0,
          }}>
            <AssessmentIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>דוחות</Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>עיון וייצוא נתוני הצי לפי תקופה</Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleExport}
          disabled={loading || TAB_COUNTS[tab] === 0}
          sx={{
            borderRadius: '10px',
            fontWeight: 600,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            '&:hover': { boxShadow: '0 6px 16px rgba(99,102,241,0.4)' },
            '&:disabled': { opacity: 0.5 },
            px: 2.5,
            whiteSpace: 'nowrap',
          }}
        >
          ייצוא CSV
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Date range filter */}
      <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarToday sx={{ fontSize: 16, color: '#6366f1' }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e293b' }}>טווח תאריכים</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="מתאריך"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 165,
              '& .MuiOutlinedInput-root': { borderRadius: '10px', '&.Mui-focused fieldset': { borderColor: '#6366f1' } },
              '& label.Mui-focused': { color: '#6366f1' },
            }}
          />
          <TextField
            label="עד תאריך"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 165,
              '& .MuiOutlinedInput-root': { borderRadius: '10px', '&.Mui-focused fieldset': { borderColor: '#6366f1' } },
              '& label.Mui-focused': { color: '#6366f1' },
            }}
          />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

          {presets.map(p => (
            <Button
              key={p.label}
              variant="outlined"
              size="small"
              onClick={() => setPreset(p.from, p.to)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                borderColor: '#e2e8f0',
                color: '#475569',
                '&:hover': { borderColor: '#6366f1', color: '#6366f1', bgcolor: 'rgba(99,102,241,0.04)' },
              }}
            >
              {p.label}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Tabs + table */}
      <Paper sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2,
            borderBottom: '1px solid #e2e8f0',
            bgcolor: '#f8fafc',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#64748b',
              minHeight: 52,
            },
            '& .Mui-selected': { color: '#6366f1' },
            '& .MuiTabs-indicator': { backgroundColor: '#6366f1', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          {TAB_LABELS.map((label, i) => (
            <Tab
              key={label}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {label}
                  {!loading && (
                    <Chip
                      label={TAB_COUNTS[i]}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: tab === i ? 'rgba(99,102,241,0.12)' : '#e2e8f0',
                        color:   tab === i ? '#6366f1' : '#64748b',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: '#6366f1' }} />
            </Box>
          ) : (
            tabContent[tab]()
          )}
        </Box>
      </Paper>

    </Box>
  );
}
