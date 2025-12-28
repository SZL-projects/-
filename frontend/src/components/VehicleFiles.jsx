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
  ListItemSecondaryAction,
  IconButton,
  Tab,
  Tabs,
  Input,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  Description,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';

const categories = [
  { id: 'ביטוח', label: 'ביטוח' },
  { id: 'רישיון', label: 'רישיון' },
  { id: 'תמונות', label: 'תמונות' },
  { id: 'דוחות', label: 'דוחות' },
];

export default function VehicleFiles({ vehicleNumber, vehicleFolderData }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (vehicleFolderData?.categoryFolders) {
      loadFiles();
    }
  }, [currentTab, vehicleFolderData]);

  const getCurrentFolderId = () => {
    if (!vehicleFolderData?.categoryFolders) return null;
    const currentCategory = categories[currentTab].id;
    return vehicleFolderData.categoryFolders[currentCategory];
  };

  const loadFiles = async () => {
    const folderId = getCurrentFolderId();
    if (!folderId) return;

    setLoading(true);
    try {
      const response = await vehiclesAPI.listFiles(folderId);
      setFiles(response.data.data || []);
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
            {files.map((file) => (
              <ListItem
                key={file.id}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  {getFileIcon(file.mimeType)}
                </Box>
                <ListItemText
                  primary={file.name}
                  secondary={`${formatFileSize(file.size)} • ${new Date(file.createdTime).toLocaleDateString('he-IL')}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    component="a"
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mr: 1 }}
                  >
                    <InsertDriveFile />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteFile(file.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
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
