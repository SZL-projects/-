const driveService = require('../../services/driveService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { folderId } = req.query;

    if (!folderId) {
      return res.status(400).json({ message: 'folderId is required' });
    }

    const files = await driveService.listFiles(folderId);

    res.status(200).json({
      message: 'Files retrieved successfully',
      data: files,
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
