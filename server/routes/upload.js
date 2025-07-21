const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: fileFilter
});

// Upload and process receipt image
router.post('/receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a receipt image to upload.'
      });
    }

    const fileId = uuidv4();
    const fileName = `receipt_${fileId}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    // Process image with Sharp (resize, optimize, convert to JPEG)
    await sharp(req.file.buffer)
      .resize(1200, 1600, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toFile(filePath);

    // Get file stats
    const stats = fs.statSync(filePath);

    const fileInfo = {
      id: fileId,
      originalName: req.file.originalname,
      fileName: fileName,
      filePath: `/uploads/${fileName}`,
      size: stats.size,
      mimeType: 'image/jpeg',
      uploadedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: fileInfo,
      message: 'Receipt uploaded and processed successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Get uploaded file info
router.get('/file/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const fileName = `receipt_${fileId}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist.'
      });
    }

    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      data: {
        id: fileId,
        fileName: fileName,
        filePath: `/uploads/${fileName}`,
        size: stats.size,
        mimeType: 'image/jpeg',
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get file info',
      message: error.message
    });
  }
});

// Delete uploaded file
router.delete('/file/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const fileName = `receipt_${fileId}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist.'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

// Clean up old files (utility endpoint)
router.post('/cleanup', (req, res) => {
  try {
    const { olderThanDays = 7 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const files = fs.readdirSync(uploadDir);
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.birthtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    res.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} files older than ${olderThanDays} days.`,
      deletedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

module.exports = router;