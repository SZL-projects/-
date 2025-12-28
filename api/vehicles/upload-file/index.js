const driveService = require('../../services/driveService');
const formidable = require('formidable');
const fs = require('fs');

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
    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(400).json({ message: 'Error parsing file upload' });
      }

      const file = files.file;
      const folderId = fields.folderId;

      if (!file || !folderId) {
        return res.status(400).json({ message: 'File and folderId are required' });
      }

      try {
        const fileBuffer = fs.createReadStream(file.filepath);
        const fileName = file.originalFilename || file.newFilename;
        const mimeType = file.mimetype || 'application/octet-stream';

        const uploadedFile = await driveService.uploadFile(
          fileBuffer,
          fileName,
          mimeType,
          folderId
        );

        fs.unlinkSync(file.filepath);

        res.status(200).json({
          message: 'File uploaded successfully',
          data: uploadedFile,
        });
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        res.status(500).json({ message: 'Error uploading file to Drive' });
      }
    });
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
