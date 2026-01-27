import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  IconButton,
  Card,
  CardContent,
  CardActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Delete,
  DragIndicator,
  Save,
  Visibility,
  TextFields,
  CheckBox,
  RadioButtonChecked,
  ArrowDropDown,
  CalendarToday,
  AttachFile,
  Build,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

const fieldTypes = [
  { value: 'text', label: 'טקסט', icon: <TextFields sx={{ fontSize: 18 }} /> },
  { value: 'textarea', label: 'טקסט ארוך', icon: <TextFields sx={{ fontSize: 18 }} /> },
  { value: 'number', label: 'מספר', icon: <TextFields sx={{ fontSize: 18 }} /> },
  { value: 'date', label: 'תאריך', icon: <CalendarToday sx={{ fontSize: 18 }} /> },
  { value: 'checkbox', label: 'תיבת סימון', icon: <CheckBox sx={{ fontSize: 18 }} /> },
  { value: 'radio', label: 'בחירה', icon: <RadioButtonChecked sx={{ fontSize: 18 }} /> },
  { value: 'select', label: 'רשימה נפתחת', icon: <ArrowDropDown sx={{ fontSize: 18 }} /> },
  { value: 'file', label: 'קובץ', icon: <AttachFile sx={{ fontSize: 18 }} /> },
];

export default function FormBuilder() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const textFieldSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
  }), []);

  const addField = (type) => {
    const newField = {
      id: Date.now(),
      type,
      label: `שדה ${fields.length + 1}`,
      required: false,
      options: type === 'select' || type === 'radio' ? ['אפשרות 1', 'אפשרות 2'] : [],
    };
    setFields([...fields, newField]);
  };

  const updateField = (id, property, value) => {
    setFields(fields.map(field =>
      field.id === id ? { ...field, [property]: value } : field
    ));
  };

  const deleteField = (id) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const moveField = (id, direction) => {
    const index = fields.findIndex(f => f.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const handleSaveForm = () => {
    if (!formName.trim()) {
      showSnackbar('נא להזין שם לטופס', 'error');
      return;
    }

    if (fields.length === 0) {
      showSnackbar('נא להוסיף לפחות שדה אחד', 'error');
      return;
    }

    console.log('Saving form:', { formName, formDescription, fields });
    showSnackbar('הטופס נשמר בהצלחה', 'success');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const renderPreviewField = (field) => {
    const previewTextFieldSx = {
      ...textFieldSx,
      '& .MuiOutlinedInput-root': {
        ...textFieldSx['& .MuiOutlinedInput-root'],
        bgcolor: '#f8fafc',
      },
    };

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <TextField
            fullWidth
            label={field.label}
            type={field.type}
            required={field.required}
            disabled
            sx={previewTextFieldSx}
          />
        );
      case 'textarea':
        return (
          <TextField
            fullWidth
            label={field.label}
            multiline
            rows={3}
            required={field.required}
            disabled
            sx={previewTextFieldSx}
          />
        );
      case 'date':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="date"
            required={field.required}
            InputLabelProps={{ shrink: true }}
            disabled
            sx={previewTextFieldSx}
          />
        );
      case 'checkbox':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBox sx={{ color: '#6366f1' }} />
            <Typography sx={{ color: '#1e293b' }}>{field.label}</Typography>
            {field.required && (
              <Chip
                label="חובה"
                size="small"
                sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontWeight: 500 }}
              />
            )}
          </Box>
        );
      case 'radio':
        return (
          <FormControl fullWidth>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 500 }}>
                {field.label}
              </Typography>
              {field.required && (
                <Chip
                  label="חובה"
                  size="small"
                  sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontWeight: 500 }}
                />
              )}
            </Box>
            {field.options.map((option, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <RadioButtonChecked sx={{ color: '#6366f1', fontSize: 20 }} />
                <Typography sx={{ color: '#64748b' }}>{option}</Typography>
              </Box>
            ))}
          </FormControl>
        );
      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>{field.label}</InputLabel>
            <Select
              label={field.label}
              required={field.required}
              disabled
              sx={{
                borderRadius: '12px',
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
              }}
            >
              {field.options.map((option, idx) => (
                <MenuItem key={idx} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'file':
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 500 }}>
                {field.label}
              </Typography>
              {field.required && (
                <Chip
                  label="חובה"
                  size="small"
                  sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontWeight: 500 }}
                />
              )}
            </Box>
            <Button
              variant="outlined"
              startIcon={<AttachFile />}
              disabled
              sx={{
                borderRadius: '10px',
                borderColor: '#6366f1',
                color: '#6366f1',
                textTransform: 'none',
              }}
            >
              בחר קובץ
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        mb: 4,
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Build sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ color: '#1e293b' }}>
              יוצר טפסים
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              צור טפסים מותאמים אישית למערכת
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant={previewMode ? 'contained' : 'outlined'}
            startIcon={<Visibility />}
            onClick={() => setPreviewMode(!previewMode)}
            fullWidth={isMobile}
            sx={previewMode ? {
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
            } : {
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': {
                borderColor: '#4f46e5',
                bgcolor: 'rgba(99, 102, 241, 0.04)',
              },
            }}
          >
            {previewMode ? 'חזור לעריכה' : 'תצוגה מקדימה'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveForm}
            fullWidth={isMobile}
            disabled={previewMode}
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              },
              '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
            }}
          >
            שמור טופס
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {!previewMode && (
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                פרטי הטופס
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="שם הטופס"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  sx={textFieldSx}
                />

                <TextField
                  fullWidth
                  label="תיאור"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  multiline
                  rows={2}
                  sx={textFieldSx}
                />

                <Divider sx={{ borderColor: '#e2e8f0' }} />

                <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
                  סוגי שדות
                </Typography>

                <Grid container spacing={1}>
                  {fieldTypes.map((fieldType) => (
                    <Grid item xs={6} key={fieldType.value}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={fieldType.icon}
                        onClick={() => addField(fieldType.value)}
                        size="small"
                        sx={{
                          justifyContent: 'flex-start',
                          borderRadius: '10px',
                          borderColor: '#e2e8f0',
                          color: '#475569',
                          textTransform: 'none',
                          py: 1,
                          '&:hover': {
                            borderColor: '#6366f1',
                            bgcolor: 'rgba(99, 102, 241, 0.04)',
                            color: '#6366f1',
                          },
                        }}
                      >
                        {fieldType.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} md={previewMode ? 12 : 8}>
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {previewMode ? (
              <>
                <Typography variant="h5" gutterBottom sx={{ color: '#1e293b', fontWeight: 700 }}>
                  {formName || 'שם הטופס'}
                </Typography>
                {formDescription && (
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                    {formDescription}
                  </Typography>
                )}
                <Divider sx={{ my: 3, borderColor: '#e2e8f0' }} />
                <Stack spacing={3}>
                  {fields.length === 0 ? (
                    <Alert
                      severity="info"
                      sx={{
                        borderRadius: '12px',
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        '& .MuiAlert-icon': { color: '#6366f1' },
                        '& .MuiAlert-message': { color: '#6366f1' },
                      }}
                    >
                      לא הוספו שדות לטופס
                    </Alert>
                  ) : (
                    fields.map((field) => (
                      <Box key={field.id}>
                        {renderPreviewField(field)}
                      </Box>
                    ))
                  )}
                </Stack>
              </>
            ) : (
              <>
                <Typography variant="h6" gutterBottom sx={{ color: '#1e293b', fontWeight: 600 }}>
                  עריכת שדות
                </Typography>

                {fields.length === 0 ? (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: '12px',
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      '& .MuiAlert-icon': { color: '#6366f1' },
                      '& .MuiAlert-message': { color: '#6366f1' },
                    }}
                  >
                    בחר סוג שדה מהרשימה בצד כדי להתחיל לבנות את הטופס
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {fields.map((field, index) => (
                      <Card
                        key={field.id}
                        sx={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: 'none',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#6366f1',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)',
                          },
                        }}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="שם השדה"
                                value={field.label}
                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                size="small"
                                sx={textFieldSx}
                              />
                            </Grid>

                            <Grid item xs={6} sm={3}>
                              <Chip
                                icon={fieldTypes.find(t => t.value === field.type)?.icon}
                                label={fieldTypes.find(t => t.value === field.type)?.label}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  color: '#6366f1',
                                  fontWeight: 500,
                                  '& .MuiChip-icon': { color: '#6366f1' },
                                }}
                              />
                            </Grid>

                            <Grid item xs={6} sm={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel sx={{ '&.Mui-focused': { color: '#6366f1' } }}>חובה?</InputLabel>
                                <Select
                                  value={field.required ? 'yes' : 'no'}
                                  onChange={(e) => updateField(field.id, 'required', e.target.value === 'yes')}
                                  label="חובה?"
                                  sx={{
                                    borderRadius: '10px',
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', borderWidth: 2 },
                                  }}
                                >
                                  <MenuItem value="no">לא</MenuItem>
                                  <MenuItem value="yes">כן</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            {(field.type === 'select' || field.type === 'radio') && (
                              <Grid item xs={12}>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                  אפשרויות (מופרדות בפסיק):
                                </Typography>
                                <TextField
                                  fullWidth
                                  value={field.options.join(', ')}
                                  onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map(o => o.trim()))}
                                  size="small"
                                  placeholder="אפשרות 1, אפשרות 2, אפשרות 3"
                                  sx={textFieldSx}
                                />
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>

                        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => moveField(field.id, 'up')}
                              disabled={index === 0}
                              sx={{
                                color: '#64748b',
                                '&:hover': { color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.08)' },
                                '&:disabled': { color: '#cbd5e1' },
                              }}
                            >
                              <ArrowUpward sx={{ fontSize: 20 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => moveField(field.id, 'down')}
                              disabled={index === fields.length - 1}
                              sx={{
                                color: '#64748b',
                                '&:hover': { color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.08)' },
                                '&:disabled': { color: '#cbd5e1' },
                              }}
                            >
                              <ArrowDownward sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={() => deleteField(field.id)}
                            sx={{
                              color: '#dc2626',
                              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
                            }}
                          >
                            <Delete sx={{ fontSize: 20 }} />
                          </IconButton>
                        </CardActions>
                      </Card>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            fontWeight: 500,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
