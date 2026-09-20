import { Router } from 'express';
import { uploadStudentPhoto, uploadTeacherPhoto } from '../middlewares/uploadMiddleware.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Upload student photo -> /Uploads/Students/student-xxx.jpg
router.post('/student', authenticateToken, uploadStudentPhoto.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرسال ملف الصورة / No file uploaded' });
  }

  const relativeUrl = `/Uploads/Students/${req.file.filename}`;
  res.json({
    success: true,
    message: 'تم رفع صورة التلميذ بنجاح / Student photo uploaded successfully',
    photo_url: relativeUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

// Upload teacher photo -> /Uploads/Teachers/teacher-xxx.jpg
router.post('/teacher', authenticateToken, uploadTeacherPhoto.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم إرسال ملف الصورة / No file uploaded' });
  }

  const relativeUrl = `/Uploads/Teachers/${req.file.filename}`;
  res.json({
    success: true,
    message: 'تم رفع صورة الأستاذ بنجاح / Teacher photo uploaded successfully',
    photo_url: relativeUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

export default router;
