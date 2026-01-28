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
  FolderOpen,
  CreateNewFolder,
} from '@mui/icons-material';
import { ridersAPI } from '../services/api';

const categories = [
  { id: 'documents', label: 'מסמכים', folderKey: 'documentsFolderId' },
  { id: 'licenses', label: 'רישיונות', folderKey: 'licensesFolderId' },
];

export default function RiderFiles({ riderName, riderFolderData, riderId, onFolderCreated }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (riderFolderData) {
      loadFiles();
    }
  }, [currentTab, riderFolderData]);

  const getCurrentFolderId = () => {
    if (!riderFolderData) return null;
    const currentCategory = categories[currentTab];
    return riderFolderData[currentCategory.folderKey];
  };

  const loadFiles = async () => {
    const folderId = getCurrentFolderId();
    if (!folderId) return;

    setLoading(true);
    try {
      const response = await ridersAPI.listFiles(folderId, riderId);
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

      await ridersAPI.uploadFile(formData, folderId);
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
      await ridersAPI.deleteFile(fileId);
      showSnackbar('הקובץ נמחק בהצלחה', 'success');
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      showSnackbar('שגיאה במחיקת קובץ', 'error');
    }
  };

  const handleCreateFolder = async () => {
    setCreatingFolder(true);
    try {
      await ridersAPI.createFolder(riderId);
      showSnackbar('מבנה תיקיות רוכב נוצר בהצלחה', 'success');
      if (onFolderCreated) {
        onFolderCreated();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showSnackbar(error.response?.data?.message || 'שגיאה ביצירת תיקייה', 'error');
    } finally {
      setCreatingFolder(false);
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

  // אם אין נתוני תיקיות - הצג אפשרות ליצירה
  if (!riderFolderData) {
    return (
      <Card sx={{
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FolderOpen sx={{ color: '#6366f1', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              קבצים ומסמכים
            </Typography>
          </Box>

          <Alert
            severity="info"
            sx={{
              mb: 2,
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            לא נמצאו תיקיות עבור רוכב זה. יש ליצור מבנה תיקיות תחילה.
          </Alert>

          <Button
            variant="contained"
            startIcon={creatingFolder ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <CreateNewFolder />}
            onClick={handleCreateFolder}
            disabled={creatingFolder}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
              '&:disabled': {
                background: '#e2e8f0',
                boxShadow: 'none',
              },
            }}
          >
            {creatingFolder ? 'יוצר תיקיות...' : 'צור מבנה תיקיות'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FolderOpen sx={{ color: '#6366f1', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            קבצים ומסמכים - {riderName}
          </Typography>
        </Box>

        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              fontWeight: 600,
              color: '#64748b',
              '&.Mui-selected': {
                color: '#6366f1',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#6366f1',
            },
          }}
        >
          {categories.map((category) => (
            <Tab key={category.id} label={category.label} />
          ))}
        </Tabs>

        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="rider-file-upload"
          />
          <label htmlFor="rider-file-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={uploading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <CloudUpload />}
              disabled={uploading || !getCurrentFolderId()}
              sx={{
                borderRadius: '12px',
                px: 3,
                py: 1,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  boxShadow: 'none',
                },
              }}
            >
              {uploading ? 'מעלה...' : 'העלה קובץ'}
            </Button>
          </label>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress sx={{ color: '#6366f1' }} />
          </Box>
        ) : files.length === 0 ? (
          <Alert
            severity="info"
            sx={{
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            אין קבצים בקטגוריה זו
          </Alert>
        ) : (
          <List>
            {files.map((file) => (
              <ListItem
                key={file.id}
                disablePadding
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  mb: 1,
                  pl: 2,
                  pr: '100px',
                  py: 1,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Tooltip title="פתח בחלון חדש">
                      <IconButton
                        size="small"
                        component="a"
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: '#6366f1' }}
                      >
                        <InsertDriveFile fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="מחק קובץ">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteFile(file.id)}
                        sx={{ color: '#dc2626' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, color: '#64748b' }}>
                  {getFileIcon(file.mimeType)}
                </Box>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 500, color: '#1e293b' }}>
                      {file.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      {formatFileSize(file.size)} • {new Date(file.createdTime).toLocaleDateString('he-IL')}
                    </Typography>
                  }
                />
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
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{
              borderRadius: '12px',
              fontWeight: 500,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
