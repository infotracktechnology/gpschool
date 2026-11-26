import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist
const studentsDir = path.join(__dirname, '..', 'uploads', 'students');
const documentsDir = path.join(__dirname, '..', 'uploads', 'documents');
const branchesDir = path.join(__dirname, '..', 'uploads', 'branches');

if (!fs.existsSync(studentsDir)) {
  fs.mkdirSync(studentsDir, { recursive: true });
}
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}
if (!fs.existsSync(branchesDir)) {
  fs.mkdirSync(branchesDir, { recursive: true });
}

// Storage for Student Photo
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, studentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `student-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

// Storage for Student Documents
const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const safeName = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

// Photo File Filter
const photoFilter = (_req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed for profile photos'), false);
  }
};

// Document File Filter
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
    cb(new Error('Only PDF, Word, and Image files (JPG, PNG) are allowed for documents'), false);
  }
};

export const uploadStudentPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: photoFilter,
});

export const uploadStudentDocument = multer({
  storage: docStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: docFilter,
});

// Storage & Filter for Branch Logos
const branchLogoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, branchesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeName = `branch-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const branchLogoFilter = (_req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, SVG, WEBP, and GIF images are allowed for branch logos'), false);
  }
};

export const uploadBranchLogo = multer({
  storage: branchLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: branchLogoFilter,
});
