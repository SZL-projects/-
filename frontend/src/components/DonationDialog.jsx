import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  Autocomplete,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  InsertDriveFile,
  Delete,
  Edit,
  Check,
  VolunteerActivism,
} from '@mui/icons-material';
import { donationsAPI } from '../services/api';

const paymentMethodLabels = {
  credit_card: 'אשראי',
  bit: 'ביט',
  nedarim_plus: 'נדרים פלוס',
  other: 'אחר',
};

// פונקציה לפרסור תאריך מפורמטים שונים
const parseDate = (timestamp) => {
  if (!timestamp) return new Date().toISOString().split('T')[0];
  try {
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export default function DonationDialog({ open, onClose, donation, riders, onSave }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    riderId: '',
    riderName: '',
    amount: '',
    paymentMethod: 'credit_card',
    donationDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, customName, editingName }]
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const isEditing = !!donation;

  // מילוי טופס בעריכה
  useEffect(() => {
    if (donation) {
      setFormData({
        riderId: donation.riderId || '',
        riderName: donation.riderName || '',
        amount: donation.amount || '',
        paymentMethod: donation.paymentMethod || 'credit_card',
        donationDate: parseDate(donation.donationDate),
        notes: donation.notes || '',
      });
    } else {
      setFormData({
        riderId: '',
        riderName: '',
        amount: '',
        paymentMethod: 'credit_card',
        donationDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setSelectedFiles([]);
    setError('');
  }, [donation, open]);

  // מציאת הרוכב הנבחר
  const selectedRider = riders?.find(r => r.id === formData.riderId) || null;

  const handleRiderChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        riderId: newValue.id,
        riderName: `${newValue.firstName} ${newValue.lastName}`,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        riderId: '',
        riderName: '',
      }));
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => {
      // הפרדת שם קובץ מסיומת
      const lastDot = file.name.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
      const ext = lastDot > 0 ? file.name.substring(lastDot) : '';
      return { file, customName: nameWithoutExt, ext, editingName: false };
    });
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleEditFileName = (index) => {
    setSelectedFiles(prev => prev.map((f, i) => i === index ? { ...f, editingName: !f.editingName } : f));
  };

  const handleChangeFileName = (index, newName) => {
    setSelectedFiles(prev => prev.map((f, i) => i === index ? { ...f, customName: newName } : f));
  };

  const handleSubmit = async () => {
    // ולידציה
    if (!formData.riderId) {
      setError('יש לבחור רוכב');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('סכום חייב להיות גדול מאפס');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;

      const dataToSend = {
        ...formData,
        amount: Number(formData.amount),
      };

      if (isEditing) {
        const response = await donationsAPI.update(donation.id, dataToSend);
        result = response.data.donation;
      } else {
        const response = await donationsAPI.create(dataToSend);
        result = response.data.donation;
      }

      // העלאת קבצים אם יש
      if (selectedFiles.length > 0 && result?.id) {
        setUploadingFiles(true);
        for (const fileEntry of selectedFiles) {
          const finalName = (fileEntry.customName || 'file') + fileEntry.ext;
          // יצירת קובץ חדש עם השם המותאם
          const renamedFile = new File([fileEntry.file], finalName, { type: fileEntry.file.type });
          const formDataUpload = new FormData();
          formDataUpload.append('file', renamedFile);
          formDataUpload.append('donationId', result.id);
          if (selectedRider?.driveFolderId) {
            formDataUpload.append('folderId', selectedRider.driveFolderId);
          }
          try {
            await donationsAPI.uploadFile(formDataUpload);
          } catch (err) {
            console.error('Error uploading file:', err);
          }
        }
        setUploadingFiles(false);
      }

      if (onSave) onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בשמירת התרומה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      dir="rtl"
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolunteerActivism sx={{ color: '#6366f1' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {isEditing ? 'עריכת תרומה' : 'תרומה חדשה'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* בחירת רוכב */}
          <Grid item xs={12}>
            <Autocomplete
              value={selectedRider}
              onChange={handleRiderChange}
              options={riders || []}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.idNumber || ''})`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="רוכב *"
                  placeholder="חפש רוכב..."
                />
              )}
              noOptionsText="לא נמצאו רוכבים"
              isOptionEqualToValue={(option, value) => option.id === value?.id}
            />
          </Grid>

          {/* סכום */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="סכום *"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">₪</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>

          {/* אמצעי תשלום */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>אמצעי תשלום *</InputLabel>
              <Select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                label="אמצעי תשלום *"
              >
                <MenuItem value="credit_card">אשראי</MenuItem>
                <MenuItem value="bit">ביט</MenuItem>
                <MenuItem value="nedarim_plus">נדרים פלוס</MenuItem>
                <MenuItem value="other">אחר</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* תאריך */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="תאריך תרומה"
              type="date"
              value={formData.donationDate}
              onChange={(e) => setFormData(prev => ({ ...prev, donationDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* הערות */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="הערות"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="הערות נוספות..."
            />
          </Grid>

          {/* העלאת קבצים */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#475569' }}>
              קבצים (קבלות, אישורים)
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
            >
              העלאת קובץ
              <input
                type="file"
                hidden
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
            </Button>

            {selectedFiles.length > 0 && (
              <List dense>
                {selectedFiles.map((fileEntry, index) => (
                  <ListItem key={index} sx={{ pr: 12 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <InsertDriveFile fontSize="small" color="primary" />
                    </ListItemIcon>
                    {fileEntry.editingName ? (
                      <TextField
                        size="small"
                        variant="standard"
                        value={fileEntry.customName}
                        onChange={(e) => handleChangeFileName(index, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleToggleEditFileName(index); }}
                        autoFocus
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" color="text.secondary">{fileEntry.ext}</Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                    ) : (
                      <ListItemText
                        primary={fileEntry.customName + fileEntry.ext}
                        secondary={`${(fileEntry.file.size / 1024).toFixed(1)} KB`}
                      />
                    )}
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => handleToggleEditFileName(index)} title="שנה שם קובץ">
                        {fileEntry.editingName ? <Check fontSize="small" color="success" /> : <Edit fontSize="small" />}
                      </IconButton>
                      <IconButton edge="end" size="small" onClick={() => handleRemoveFile(index)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {/* קבצים קיימים בעריכה */}
            {isEditing && donation?.documents?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  קבצים קיימים:
                </Typography>
                <List dense>
                  {donation.documents.map((doc, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <InsertDriveFile fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.originalName || doc.filename}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          ביטול
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || uploadingFiles}
          startIcon={loading || uploadingFiles ? <CircularProgress size={20} /> : <VolunteerActivism />}
        >
          {loading ? 'שומר...' : uploadingFiles ? 'מעלה קבצים...' : isEditing ? 'עדכון' : 'שמירה'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
