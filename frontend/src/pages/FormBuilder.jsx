import { useState } from 'react';
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
} from '@mui/icons-material';

const fieldTypes = [
  { value: 'text', label: 'טקסט', icon: <TextFields /> },
  { value: 'textarea', label: 'טקסט ארוך', icon: <TextFields /> },
  { value: 'number', label: 'מספר', icon: <TextFields /> },
  { value: 'date', label: 'תאריך', icon: <CalendarToday /> },
  { value: 'checkbox', label: 'תיבת סימון', icon: <CheckBox /> },
  { value: 'radio', label: 'בחירה', icon: <RadioButtonChecked /> },
  { value: 'select', label: 'רשימה נפתחת', icon: <ArrowDropDown /> },
  { value: 'file', label: 'קובץ', icon: <AttachFile /> },
];

export default function FormBuilder() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

    // Here you would save to backend
    console.log('Saving form:', { formName, formDescription, fields });
    showSnackbar('הטופס נשמר בהצלחה', 'success');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const renderPreviewField = (field) => {
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
          />
        );
      case 'checkbox':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBox />
            <Typography>{field.label}</Typography>
            {field.required && <Chip label="חובה" size="small" color="error" />}
          </Box>
        );
      case 'radio':
        return (
          <FormControl fullWidth>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {field.label} {field.required && <Chip label="חובה" size="small" color="error" />}
            </Typography>
            {field.options.map((option, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <RadioButtonChecked />
                <Typography>{option}</Typography>
              </Box>
            ))}
          </FormControl>
        );
      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              label={field.label}
              required={field.required}
              disabled
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
            <Typography variant="body2" sx={{ mb: 1 }}>
              {field.label} {field.required && <Chip label="חובה" size="small" color="error" />}
            </Typography>
            <Button variant="outlined" startIcon={<AttachFile />} disabled>
              בחר קובץ
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          יוצר טפסים
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant={previewMode ? 'contained' : 'outlined'}
            startIcon={<Visibility />}
            onClick={() => setPreviewMode(!previewMode)}
            fullWidth={isMobile}
          >
            {previewMode ? 'חזור לעריכה' : 'תצוגה מקדימה'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveForm}
            fullWidth={isMobile}
            disabled={previewMode}
          >
            שמור טופס
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {!previewMode && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                פרטי הטופס
              </Typography>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="שם הטופס"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />

                <TextField
                  fullWidth
                  label="תיאור"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  multiline
                  rows={2}
                />

                <Divider />

                <Typography variant="h6">
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
                        sx={{ justifyContent: 'flex-start' }}
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
          <Paper sx={{ p: 3 }}>
            {previewMode ? (
              <>
                <Typography variant="h5" gutterBottom>
                  {formName || 'שם הטופס'}
                </Typography>
                {formDescription && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {formDescription}
                  </Typography>
                )}
                <Divider sx={{ my: 3 }} />
                <Stack spacing={3}>
                  {fields.length === 0 ? (
                    <Alert severity="info">
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
                <Typography variant="h6" gutterBottom>
                  עריכת שדות
                </Typography>

                {fields.length === 0 ? (
                  <Alert severity="info">
                    בחר סוג שדה מהרשימה בצד כדי להתחיל לבנות את הטופס
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {fields.map((field, index) => (
                      <Card key={field.id} variant="outlined">
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="שם השדה"
                                value={field.label}
                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                size="small"
                              />
                            </Grid>

                            <Grid item xs={6} sm={3}>
                              <Chip
                                label={fieldTypes.find(t => t.value === field.type)?.label}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Grid>

                            <Grid item xs={6} sm={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>חובה?</InputLabel>
                                <Select
                                  value={field.required ? 'yes' : 'no'}
                                  onChange={(e) => updateField(field.id, 'required', e.target.value === 'yes')}
                                  label="חובה?"
                                >
                                  <MenuItem value="no">לא</MenuItem>
                                  <MenuItem value="yes">כן</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            {(field.type === 'select' || field.type === 'radio') && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                  אפשרויות (מופרדות בפסיק):
                                </Typography>
                                <TextField
                                  fullWidth
                                  value={field.options.join(', ')}
                                  onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map(o => o.trim()))}
                                  size="small"
                                  placeholder="אפשרות 1, אפשרות 2, אפשרות 3"
                                />
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>

                        <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => moveField(field.id, 'up')}
                              disabled={index === 0}
                            >
                              <DragIndicator sx={{ transform: 'rotate(-90deg)' }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => moveField(field.id, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              <DragIndicator sx={{ transform: 'rotate(90deg)' }} />
                            </IconButton>
                          </Box>

                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteField(field.id)}
                          >
                            <Delete />
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
