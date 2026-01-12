import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tab,
  Tabs,
  Input,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  Description,
  Archive,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';

const categories = [
  { id: 'insurance', label: 'ביטוחים נוכחיים', folderKey: 'insuranceFolderId' },
  { id: 'archive', label: 'ביטוחים ישנים', folderKey: 'archiveFolderId' },
  { id: 'photos', label: 'תמונות כלי', folderKey: 'photosFolderId' },
];

export default function VehicleFiles({ vehicleNumber, vehicleFolderData, vehicleId }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (vehicleFolderData) {
      loadFiles();
    }
  }, [currentTab, vehicleFolderData]);

  const getCurrentFolderId = () => {
    if (!vehicleFolderData) return null;
    const currentCategory = categories[currentTab];
    return vehicleFolderData[currentCategory.folderKey];
  };

  const loadFiles = async () => {
    const folderId = getCurrentFolderId();
    if (!folderId) return;

    setLoading(true);
    try {
      // העברת vehicleId כדי לקבל גם את מטא-דאטה של הקבצים (visibility)
      const response = await vehiclesAPI.listFiles(folderId, vehicleId);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      showSnackbar('שגיאה בטעינת קבצים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const folderId = getCurrentFolderId();
    if (!folderId) {
      showSnackbar('שגיאה: לא נמצאה תיקייה', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);

      await vehiclesAPI.uploadFile(formData, folderId);
      showSnackbar('הקובץ הועלה בהצלחה', 'success');
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      showSnackbar('שגיאה בהעלאת קובץ', 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) {
      return;
    }

    try {
      await vehiclesAPI.deleteFile(fileId);
      showSnackbar('הקובץ נמחק בהצלחה', 'success');
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      showSnackbar('שגיאה במחיקת קובץ', 'error');
    }
  };

  const handleToggleVisibility = async (fileId, currentVisibility) => {
    try {
      await vehiclesAPI.updateFileVisibility(vehicleId, fileId, !currentVisibility);
      showSnackbar(
        !currentVisibility ? 'הקובץ כעת גלוי לרוכבים' : 'הקובץ כעת מוסתר מרוכבים',
        'success'
      );
      loadFiles();
    } catch (error) {
      console.error('Error updating file visibility:', error);
      showSnackbar('שגיאה בעדכון נראות הקובץ', 'error');
    }
  };

  const handleMoveToArchive = async (fileId) => {
    if (!window.confirm('האם להעביר קובץ זה לארכיון?')) {
      return;
    }

    try {
      await vehiclesAPI.moveToArchive(vehicleId, fileId);
      showSnackbar('הקובץ הועבר לארכיון בהצלחה', 'success');
      loadFiles();
    } catch (error) {
      console.error('Error moving file to archive:', error);
      showSnackbar('שגיאה בהעברת קובץ לארכיון', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <Image />;
    if (mimeType === 'application/pdf') return <PictureAsPdf />;
    if (mimeType.includes('document')) return <Description />;
    return <InsertDriveFile />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'לא ידוע';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!vehicleFolderData) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            טוען נתוני תיקיות...
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          קבצים ומסמכים - אופנוע {vehicleNumber}
        </Typography>

        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 2 }}>
          {categories.map((category) => (
            <Tab key={category.id} label={category.label} />
          ))}
        </Tabs>

        <Box sx={{ mb: 2 }}>
          <Input
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
              disabled={uploading || !getCurrentFolderId()}
            >
              {uploading ? 'מעלה...' : 'העלה קובץ'}
            </Button>
          </label>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : files.length === 0 ? (
          <Alert severity="info">אין קבצים בקטגוריה זו</Alert>
        ) : (
          <List>
            {files.map((file) => {
              const isInsuranceTab = currentTab === 0; // ביטוחים נוכחיים
              const isArchiveTab = currentTab === 1; // ביטוחים ישנים
              const isVisible = file.visibleToRider !== false;

              return (
                <ListItem
                  key={file.id}
                  disablePadding
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    pl: 2,
                    pr: isInsuranceTab ? '220px' : '100px', // מקום לכפתורים
                    py: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {/* כפתור צפייה */}
                      <Tooltip title="פתח בחלון חדש">
                        <IconButton
                          size="small"
                          component="a"
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <InsertDriveFile fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* כפתור נראות - רק בביטוחים נוכחיים */}
                      {isInsuranceTab && (
                        <Tooltip title={isVisible ? 'הסתר מרוכבים' : 'הצג לרוכבים'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleVisibility(file.id, isVisible)}
                          >
                            {isVisible ? <Visibility fontSize="small" color="primary" /> : <VisibilityOff fontSize="small" color="disabled" />}
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* כפתור ארכיון - רק בביטוחים נוכחיים */}
                      {isInsuranceTab && (
                        <Tooltip title="העבר לארכיון">
                          <IconButton
                            size="small"
                            onClick={() => handleMoveToArchive(file.id)}
                            color="warning"
                          >
                            <Archive fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* כפתור מחיקה */}
                      <Tooltip title="מחק קובץ">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteFile(file.id)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getFileIcon(file.mimeType)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{file.name}</span>
                        {!isVisible && (
                          <Box
                            component="span"
                            sx={{
                              fontSize: '0.75rem',
                              bgcolor: 'warning.light',
                              color: 'warning.dark',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                            }}
                          >
                            מוסתר
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={`${formatFileSize(file.size)} • ${new Date(file.createdTime).toLocaleDateString('he-IL')}`}
                  />
                </ListItem>
              );
            })}
          </List>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
