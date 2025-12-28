const driveService = require('../../services/driveService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicleNumber } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({ message: 'Vehicle number is required' });
    }

    const folderStructure = await driveService.createVehicleFolderStructure(vehicleNumber);

    res.status(200).json({
      message: 'Folder structure created successfully',
      data: folderStructure,
    });
  } catch (error) {
    console.error('Error creating folder structure:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
