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
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  Visibility,
  VisibilityOff,
  DriveFileMove,
  DeleteForever,
  Folder,
  Edit,
  Add,
} from '@mui/icons-material';
import { ridersAPI } from '../services/api';

const defaultCategories = [
  { id: 'documents', label: 'מסמכים', folderKey: 'documentsFolderId', isFixed: true },
  { id: 'licenses', label: 'רישיונות', folderKey: 'licensesFolderId', isFixed: true },
];

export default function RiderFiles({ riderName, riderFolderData, riderId, onFolderCreated, onFolderDeleted }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [moveMenuAnchor, setMoveMenuAnchor] = useState(null);
  const [selectedFileForMove, setSelectedFileForMove] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [addFolderDialogOpen, setAddFolderDialogOpen] = useState(false);
  const [customFolderName, setCustomFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);

  // בניית רשימת הקטגוריות - כולל תיקיות מותאמות אישית
  const categories = [
    ...defaultCategories,
    ...(riderFolderData?.customFolders || []).map(folder => ({
      id: `custom_${folder.id}`,
      label: folder.name,
      folderKey: null,
      folderId: folder.id,
      isCustom: true
    }))
  ];

  useEffect(() => {
    if (riderFolderData) {
      loadFiles();
    }
  }, [currentTab, riderFolderData]);

  const getCurrentFolderId = () => {
    if (!riderFolderData) return null;
    const currentCategory = categories[currentTab];
    if (!currentCategory) return null;
    if (currentCategory.folderId) {
      return currentCategory.folderId;
    }
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

  // עדכון נראות קובץ לרוכב
  const handleToggleVisibility = async (fileId, currentVisibility) => {
    try {
      await ridersAPI.updateFileVisibility(riderId, fileId, !currentVisibility);
      showSnackbar(
        !currentVisibility ? 'הקובץ יוצג לרוכב' : 'הקובץ הוסתר מהרוכב',
        'success'
      );
      loadFiles();
    } catch (error) {
      console.error('Error updating visibility:', error);
      showSnackbar('שגיאה בעדכון נראות הקובץ', 'error');
    }
  };

  // פתיחת תפריט העברת קובץ
  const handleOpenMoveMenu = (event, fileId) => {
    setMoveMenuAnchor(event.currentTarget);
    setSelectedFileForMove(fileId);
  };

  // סגירת תפריט העברת קובץ
  const handleCloseMoveMenu = () => {
    setMoveMenuAnchor(null);
    setSelectedFileForMove(null);
  };

  // העברת קובץ לתיקייה אחרת
  const handleMoveToFolder = async (targetFolderId, targetFolderName) => {
    if (!selectedFileForMove) return;

    try {
      await ridersAPI.moveFile(riderId, selectedFileForMove, targetFolderId);
      showSnackbar(`הקובץ הועבר ל${targetFolderName} בהצלחה`, 'success');
      handleCloseMoveMenu();
      loadFiles();
    } catch (error) {
      console.error('Error moving file:', error);
      showSnackbar('שגיאה בהעברת הקובץ', 'error');
    }
  };

  // בדיקה אם התיקייה ניתנת לעריכה (לא קבועה)
  const isFolderEditable = () => {
    const currentCategory = categories[currentTab];
    return currentCategory && !currentCategory.isFixed;
  };

  // קבלת מידע על התיקייה הנוכחית
  const getCurrentFolderInfo = () => {
    const currentCategory = categories[currentTab];
    if (!currentCategory) return null;

    const folderId = currentCategory.folderId || riderFolderData[currentCategory.folderKey];
    return {
      ...currentCategory,
      folderId,
      folderKey: currentCategory.folderKey
    };
  };

  // מחיקת תיקייה (לא קבועה)
  const handleDeleteFolder = async () => {
    const folderInfo = getCurrentFolderInfo();
    if (!folderInfo || folderInfo.isFixed) return;

    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את התיקייה "${folderInfo.label}"? כל הקבצים בתוכה יימחקו!`)) {
      return;
    }

    setDeletingFolder(true);
    try {
      if (folderInfo.isCustom) {
        await ridersAPI.deleteCustomFolder(riderId, folderInfo.folderId);
      } else {
        await ridersAPI.deleteDefaultFolder(riderId, folderInfo.folderKey, folderInfo.folderId);
      }
      showSnackbar('התיקייה נמחקה בהצלחה', 'success');
      setCurrentTab(0);
      if (onFolderDeleted) {
        onFolderDeleted();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      showSnackbar('שגיאה במחיקת התיקייה', 'error');
    } finally {
      setDeletingFolder(false);
    }
  };

  // פתיחת דיאלוג שינוי שם
  const handleOpenRenameDialog = () => {
    const folderInfo = getCurrentFolderInfo();
    if (!folderInfo || folderInfo.isFixed) return;
    setNewFolderName(folderInfo.label);
    setRenameDialogOpen(true);
  };

  // שינוי שם תיקייה
  const handleRenameFolder = async () => {
    const folderInfo = getCurrentFolderInfo();
    if (!folderInfo || !newFolderName.trim()) return;

    setRenamingFolder(true);
    try {
      await ridersAPI.renameFolder(riderId, folderInfo.folderId, newFolderName.trim(), folderInfo.folderKey, folderInfo.isCustom);
      showSnackbar('שם התיקייה שונה בהצלחה', 'success');
      setRenameDialogOpen(false);
      setNewFolderName('');
      if (onFolderDeleted) {
        onFolderDeleted(); // רענון נתוני הרוכב
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      showSnackbar('שגיאה בשינוי שם התיקייה', 'error');
    } finally {
      setRenamingFolder(false);
    }
  };

  // הוספת תיקייה מותאמת אישית
  const handleAddCustomFolder = async () => {
    if (!customFolderName.trim()) return;

    setAddingFolder(true);
    try {
      await ridersAPI.addCustomFolder(riderId, customFolderName.trim());
      showSnackbar('תיקייה חדשה נוצרה בהצלחה', 'success');
      setAddFolderDialogOpen(false);
      setCustomFolderName('');
      if (onFolderDeleted) {
        onFolderDeleted(); // רענון נתוני הרוכב
      }
    } catch (error) {
      console.error('Error adding custom folder:', error);
      showSnackbar(error.response?.data?.message || 'שגיאה ביצירת תיקייה', 'error');
    } finally {
      setAddingFolder(false);
    }
  };

  // קבלת רשימת תיקיות יעד להעברה (כל התיקיות חוץ מהנוכחית)
  const getMoveTargetFolders = () => {
    return categories.filter((cat, index) => {
      if (index === currentTab) return false;
      const folderId = cat.folderId || riderFolderData[cat.folderKey];
      return !!folderId;
    }).map(cat => ({
      ...cat,
      folderId: cat.folderId || riderFolderData[cat.folderKey]
    }));
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
          variant="scrollable"
          scrollButtons="auto"
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

          {/* כפתור הוספת תיקייה מותאמת */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => setAddFolderDialogOpen(true)}
            sx={{
              borderRadius: '12px',
              fontWeight: 600,
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': {
                borderColor: '#4f46e5',
                bgcolor: 'rgba(99, 102, 241, 0.04)',
              },
            }}
          >
            תיקייה חדשה
          </Button>

          {/* כפתורי עריכת תיקייה - רק לתיקיות לא קבועות */}
          {isFolderEditable() && (
            <>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Edit />}
                onClick={handleOpenRenameDialog}
                sx={{ borderRadius: '12px', fontWeight: 600 }}
              >
                שנה שם
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={deletingFolder ? <CircularProgress size={16} /> : <DeleteForever />}
                onClick={handleDeleteFolder}
                disabled={deletingFolder}
                sx={{ borderRadius: '12px', fontWeight: 600 }}
              >
                {deletingFolder ? 'מוחק...' : 'מחק תיקייה'}
              </Button>
            </>
          )}
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
                  pr: '180px',
                  py: 1,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
                  bgcolor: file.visibleToRider === false ? 'rgba(255, 152, 0, 0.08)' : 'inherit',
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
                        sx={{ color: '#6366f1' }}
                      >
                        <InsertDriveFile fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {/* כפתור נראות לרוכב */}
                    <Tooltip title={file.visibleToRider ? 'הסתר מהרוכב' : 'הצג לרוכב'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleVisibility(file.id, file.visibleToRider)}
                        color={file.visibleToRider ? 'success' : 'warning'}
                      >
                        {file.visibleToRider ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                      </IconButton>
                    </Tooltip>

                    {/* כפתור העברה לתיקייה אחרת */}
                    <Tooltip title="העבר לתיקייה אחרת">
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMoveMenu(e, file.id)}
                        sx={{ color: '#6366f1' }}
                      >
                        <DriveFileMove fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {/* כפתור מחיקה */}
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
                      {file.visibleToRider === false ? ' • מוסתר מרוכב' : ''}
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

        {/* תפריט העברה לתיקייה */}
        <Menu
          anchorEl={moveMenuAnchor}
          open={Boolean(moveMenuAnchor)}
          onClose={handleCloseMoveMenu}
        >
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary">
              העבר לתיקייה:
            </Typography>
          </MenuItem>
          {getMoveTargetFolders().map((folder) => (
            <MenuItem
              key={folder.id}
              onClick={() => handleMoveToFolder(folder.folderId, folder.label)}
            >
              <ListItemIcon>
                <Folder fontSize="small" />
              </ListItemIcon>
              {folder.label}
            </MenuItem>
          ))}
        </Menu>

        {/* דיאלוג שינוי שם תיקייה */}
        <Dialog
          open={renameDialogOpen}
          onClose={() => {
            setRenameDialogOpen(false);
            setNewFolderName('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>שינוי שם תיקייה</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="שם חדש"
              fullWidth
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setRenameDialogOpen(false);
                setNewFolderName('');
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleRenameFolder}
              variant="contained"
              disabled={renamingFolder || !newFolderName.trim()}
            >
              {renamingFolder ? 'משנה...' : 'שנה שם'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* דיאלוג הוספת תיקייה מותאמת אישית */}
        <Dialog
          open={addFolderDialogOpen}
          onClose={() => {
            setAddFolderDialogOpen(false);
            setCustomFolderName('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>יצירת תיקייה חדשה</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="שם התיקייה"
              fullWidth
              value={customFolderName}
              onChange={(e) => setCustomFolderName(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAddFolderDialogOpen(false);
                setCustomFolderName('');
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleAddCustomFolder}
              variant="contained"
              disabled={addingFolder || !customFolderName.trim()}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                },
              }}
            >
              {addingFolder ? 'יוצר...' : 'צור תיקייה'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
