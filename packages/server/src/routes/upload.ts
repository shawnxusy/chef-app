import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/error.js';
import fs from 'fs';

const router = Router();

// Configure multer storage
const mediaPath = process.env.NODE_ENV === 'production' ? '/media' : './media';

// Ensure media directory exists
if (!fs.existsSync(mediaPath)) {
  fs.mkdirSync(mediaPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, mediaPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPEG, PNG, GIF, WebP 格式的图片'));
    }
  }
});

// POST /api/upload - Upload recipe cover images
router.post('/', upload.array('files', 10), asyncHandler(async (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError('NO_FILES', '请选择要上传的文件', 400);
  }

  const uploadedFiles = files.map(file => ({
    id: path.basename(file.filename, path.extname(file.filename)),
    filePath: `/media/${file.filename}`,
    originalName: file.originalname
  }));

  return res.json({
    success: true,
    data: { files: uploadedFiles }
  });
}));

export default router;
