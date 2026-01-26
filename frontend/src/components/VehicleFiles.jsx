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
  Archive,
  Visibility,
  VisibilityOff,
  DriveFileMove,
  DeleteForever,
  Folder,
  Edit,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';

const defaultCategories = [
  { id: 'insurance', label: 'ביטוחים נוכחיים', folderKey: 'insuranceFolderId', isFixed: true },
  { id: 'archive', label: 'ביטוחים ישנים', folderKey: 'archiveFolderId', isFixed: true },
  { id: 'photos', label: 'תמונות כלי', folderKey: 'photosFolderId', isFixed: false },
  { id: 'misc', label: 'שונות', folderKey: 'miscFolderId', isFixed: false },
];

export default function VehicleFiles({ vehicleNumber, vehicleFolderData, vehicleId, onFolderDeleted }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [moveMenuAnchor, setMoveMenuAnchor] = useState(null);
  const [selectedFileForMove, setSelectedFileForMove] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(false);

  // בניית רשימת הקטגוריות - כולל תיקיות מותאמות אישית
  const categories = [
    ...defaultCategories,
    ...(vehicleFolderData?.customFolders || []).map(folder => ({
      id: `custom_${folder.id}`,
      label: folder.name,
      folderKey: null, // תיקיות מותאמות משתמשות ב-ID ישירות
      folderId: folder.id,
      isCustom: true
    }))
  ];

  useEffect(() => {
    if (vehicleFolderData) {
      loadFiles();
    }
  }, [currentTab, vehicleFolderData]);

  const getCurrentFolderId = () => {
    if (!vehicleFolderData) return null;
    const currentCategory = categories[currentTab];
    // תיקיות מותאמות אישית משתמשות ב-folderId ישירות
    if (currentCategory.folderId) {
      return currentCategory.folderId;
    }
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

  // עדכון נראות קובץ לרוכב
  const handleToggleVisibility = async (fileId, currentVisibility) => {
    try {
      await vehiclesAPI.updateFileVisibility(vehicleId, fileId, !currentVisibility);
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
      await vehiclesAPI.moveFile(vehicleId, selectedFileForMove, targetFolderId);
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

  // קבלת מזהה התיקייה הנוכחית
  const getCurrentFolderInfo = () => {
    const currentCategory = categories[currentTab];
    if (!currentCategory) return null;

    const folderId = currentCategory.folderId || vehicleFolderData[currentCategory.folderKey];
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
      // אם זו תיקייה מותאמת אישית
      if (folderInfo.isCustom) {
        await vehiclesAPI.deleteCustomFolder(vehicleId, folderInfo.folderId);
      } else {
        // תיקייה דיפולטית (לא קבועה) כמו "תמונות" או "שונות"
        await vehiclesAPI.deleteDefaultFolder(vehicleId, folderInfo.folderKey, folderInfo.folderId);
      }
      showSnackbar('התיקייה נמחקה בהצלחה', 'success');
      setCurrentTab(0); // חזרה לטאב הראשון
      if (onFolderDeleted) {
        onFolderDeleted(); // רענון נתוני הכלי
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
      await vehiclesAPI.renameFolder(vehicleId, folderInfo.folderId, newFolderName.trim(), folderInfo.folderKey, folderInfo.isCustom);
      showSnackbar('שם התיקייה שונה בהצלחה', 'success');
      setRenameDialogOpen(false);
      setNewFolderName('');
      if (onFolderDeleted) {
        onFolderDeleted(); // רענון נתוני הכלי
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      showSnackbar('שגיאה בשינוי שם התיקייה', 'error');
    } finally {
      setRenamingFolder(false);
    }
  };

  // קבלת רשימת תיקיות יעד להעברה (כל התיקיות חוץ מהנוכחית)
  const getMoveTargetFolders = () => {
    return categories.filter((cat, index) => {
      if (index === currentTab) return false; // לא התיקייה הנוכחית
      // קבלת ה-folderId של התיקייה
      const folderId = cat.folderId || vehicleFolderData[cat.folderKey];
      return !!folderId; // רק תיקיות עם ID
    }).map(cat => ({
      ...cat,
      folderId: cat.folderId || vehicleFolderData[cat.folderKey]
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

        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* כפתורי עריכת תיקייה - רק לתיקיות לא קבועות */}
          {isFolderEditable() && (
            <>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Edit />}
                onClick={handleOpenRenameDialog}
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
              >
                {deletingFolder ? 'מוחק...' : 'מחק תיקייה'}
              </Button>
            </>
          )}
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
              const currentCategory = categories[currentTab];

              return (
                <ListItem
                  key={file.id}
                  disablePadding
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    pl: 2,
                    pr: '180px', // מקום לכפתורים
                    py: 1,
                    '&:hover': { bgcolor: 'action.hover' },
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
                          color="primary"
                        >
                          <DriveFileMove fontSize="small" />
                        </IconButton>
                      </Tooltip>

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
                    primary={file.name}
                    secondary={`${formatFileSize(file.size)} • ${new Date(file.createdTime).toLocaleDateString('he-IL')}${file.visibleToRider === false ? ' • מוסתר מרוכב' : ''}`}
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
      </CardContent>
    </Card>
  );
}
