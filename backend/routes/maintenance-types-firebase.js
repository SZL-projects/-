const express = require('express');
const router = express.Router();
const MaintenanceTypeModel = require('../models/firestore/MaintenanceTypeModel');
const { protect } = require('../middleware/auth-firebase');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

// GET /api/maintenance-types
router.get('/', async (req, res) => {
  try {
    const types = await MaintenanceTypeModel.getAll();
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/maintenance-types
router.post('/', checkPermission('maintenance', 'edit'), async (req, res) => {
  try {
    if (!req.body.label) {
      return res.status(400).json({ success: false, message: 'שם סוג הטיפול הוא שדה חובה' });
    }
    const type = await MaintenanceTypeModel.create(req.body, req.user.id);
    res.status(201).json({ success: true, type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/maintenance-types/:id
router.put('/:id', checkPermission('maintenance', 'edit'), async (req, res) => {
  try {
    const type = await MaintenanceTypeModel.update(req.params.id, req.body, req.user.id);
    res.json({ success: true, type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/maintenance-types/:id
router.delete('/:id', checkPermission('maintenance', 'edit'), async (req, res) => {
  try {
    await MaintenanceTypeModel.delete(req.params.id);
    res.json({ success: true, message: 'סוג טיפול נמחק' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/maintenance-types/initialize - זרוע ברירות מחדל
router.post('/initialize', checkPermission('maintenance', 'edit'), async (req, res) => {
  try {
    const existing = await MaintenanceTypeModel.getAll();
    if (existing.length > 0) {
      return res.json({ success: true, message: 'סוגי טיפולים כבר קיימים', types: existing });
    }

    const defaults = [
      { label: 'טיפול תקופתי', value: 'routine' },
      { label: 'תיקון', value: 'repair' },
      { label: 'חירום', value: 'emergency' },
      { label: 'ריקול', value: 'recall' },
      { label: 'תיקון תאונה', value: 'accident_repair' },
      { label: 'אחר', value: 'other' },
    ];

    const types = [];
    for (const d of defaults) {
      const t = await MaintenanceTypeModel.create(d, req.user.id);
      types.push(t);
    }

    res.status(201).json({ success: true, message: 'סוגי טיפולים אותחלו בהצלחה', types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
