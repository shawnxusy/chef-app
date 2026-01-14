import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/error.js';
import fs from 'fs';
import { db } from '../db/client.js';

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

  const uploadedFiles = [];

  for (const file of files) {
    const id = path.basename(file.filename, path.extname(file.filename));
    const filePath = `/media/${file.filename}`;

    // Insert into recipe_images with recipe_id = NULL
    // The recipe_id will be set when the recipe is created/updated
    await db.query(
      `INSERT INTO recipe_images (id, recipe_id, file_path, sort_order)
       VALUES ($1, NULL, $2, 0)`,
      [id, filePath]
    );

    uploadedFiles.push({
      id,
      filePath,
      originalName: file.originalname
    });
  }

  return res.json({
    success: true,
    data: { files: uploadedFiles }
  });
}));

export default router;
