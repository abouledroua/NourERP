import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target folders: backend/Uploads/Students and backend/Uploads/Teachers
const baseUploadsDir = path.join(__dirname, '..', 'Uploads');
const studentsDir = path.join(baseUploadsDir, 'Students');
const teachersDir = path.join(baseUploadsDir, 'Teachers');

if (!fs.existsSync(studentsDir)) fs.mkdirSync(studentsDir, { recursive: true });
if (!fs.existsSync(teachersDir)) fs.mkdirSync(teachersDir, { recursive: true });

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype;
  if (allowed.test(ext) || mime.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('الملف المرفوع يجب أن يكون صورة صالحة (JPG, PNG, WEBP) / Only image files allowed'), false);
  }
};

const studentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, studentsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `student-${uniqueSuffix}${ext.toLowerCase()}`);
  }
});

const teacherStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, teachersDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `teacher-${uniqueSuffix}${ext.toLowerCase()}`);
  }
});

export const uploadStudentPhoto = multer({
  storage: studentStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadTeacherPhoto = multer({
  storage: teacherStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export { baseUploadsDir, studentsDir, teachersDir };
