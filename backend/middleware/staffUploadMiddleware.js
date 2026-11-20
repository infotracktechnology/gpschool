import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const staffDocsDir = path.join(__dirname, '..', 'uploads', 'staff_documents');
const staffPhotosDir = path.join(__dirname, '..', 'uploads', 'staff_photos');

if (!fs.existsSync(staffDocsDir)) {
  fs.mkdirSync(staffDocsDir, { recursive: true });
}
if (!fs.existsSync(staffPhotosDir)) {
  fs.mkdirSync(staffPhotosDir, { recursive: true });
}

// Storage for Staff Documents
const staffDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, staffDocsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const safeName = `staff-doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

// Storage for Staff Photos
const staffPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, staffPhotosDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `staff-photo-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const docFilter = (_req, file, cb) => {
  const allowedMime = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word, and Image files (JPG, PNG) are allowed for staff documents'), false);
  }
};

const photoFilter = (_req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed for profile photos'), false);
  }
};

export const uploadStaffDocument = multer({
  storage: staffDocStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: docFilter,
});

export const uploadStaffPhoto = multer({
  storage: staffPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: photoFilter,
});
