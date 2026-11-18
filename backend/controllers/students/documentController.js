import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..', '..');

/**
 * Upload Student Photo (Avatar)
 * Route: POST /api/students/:id/photo
 * Also works for staged photo upload: POST /api/students/upload-photo
 */
export const uploadStudentPhotoHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    const relativeUrl = `/uploads/students/${req.file.filename}`;
    const studentId = req.params?.id;

    // If an existing student ID is given and valid, update the database record
    if (studentId && studentId !== 'new' && !isNaN(Number(studentId))) {
      await query('UPDATE students SET avatar_url = ?, updated_at = NOW() WHERE id = ?', [
        relativeUrl,
        Number(studentId),
      ]);
    }

    res.json({
      success: true,
      message: 'Student photo uploaded successfully',
      avatar_url: relativeUrl,
      file_name: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all documents for a student
 * Route: GET /api/students/:id/documents
 */
export const getStudentDocuments = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }

    const docs = await query(
      `SELECT d.*, u.name AS uploader_name
       FROM student_documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.student_id = ?
       ORDER BY d.created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      documents: docs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a document for a student
 * Route: POST /api/students/:id/documents
 */
export const uploadStudentDocumentHandler = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select a document file to upload' });
    }

    // Verify student exists
    const [student] = await query('SELECT id, student_name FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const { document_type = 'Other', title } = req.body;
    const docTitle = title?.trim() || req.file.originalname;
    const relativeUrl = `/uploads/documents/${req.file.filename}`;
    const fileSize = req.file.size;
    const fileType = req.file.mimetype;
    const uploadedBy = req.user?.id || null;

    const result = await query(
      `INSERT INTO student_documents 
        (student_id, document_type, title, file_name, file_url, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        document_type,
        docTitle,
        req.file.originalname,
        relativeUrl,
        fileSize,
        fileType,
        uploadedBy,
      ]
    );

    const [newDoc] = await query('SELECT * FROM student_documents WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: newDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a student document
 * Route: DELETE /api/students/:id/documents/:docId
 */
export const deleteStudentDocumentHandler = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const docId = Number(req.params.docId);

    if (!studentId || !docId) {
      return res.status(400).json({ message: 'Student ID and Document ID are required' });
    }

    const [doc] = await query(
      'SELECT id, file_url FROM student_documents WHERE id = ? AND student_id = ?',
      [docId, studentId]
    );

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Try deleting physical file from disk
    if (doc.file_url) {
      const diskPath = path.join(backendRoot, doc.file_url.replace(/^\//, ''));
      try {
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch (err) {
        console.warn('[Doc Delete] Could not unlink file from disk:', err.message);
      }
    }

    await query('DELETE FROM student_documents WHERE id = ?', [docId]);

    res.json({
      success: true,
      message: 'Document deleted successfully',
      deleted_id: docId,
    });
  } catch (error) {
    next(error);
  }
};
