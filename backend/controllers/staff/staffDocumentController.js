import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/staff/documents/upload
 * Multer upload to uploads/staff_documents/, insert into staff_documents
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const { staff_id, document_type, document_name } = req.body;

    if (!staff_id) {
      return res.status(400).json({ message: 'staff_id is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const docType = document_type || 'General Document';
    const docName = document_name || req.file.originalname || 'Document';
    const fileUrl = `/uploads/staff_documents/${req.file.filename}`;
    const fileSize = req.file.size;

    const result = await query(
      `INSERT INTO staff_documents (staff_id, document_type, document_name, file_url, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [staff_id, docType, docName, fileUrl, fileSize]
    );

    const newDoc = {
      id: result.insertId,
      staff_id: Number(staff_id),
      document_type: docType,
      document_name: docName,
      file_url: fileUrl,
      file_size: fileSize,
      uploaded_at: new Date(),
    };

    res.status(201).json({
      message: 'Staff document uploaded successfully',
      document: newDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/:staffId/documents
 * List all documents for a staff member
 */
export const getStaffDocuments = async (req, res, next) => {
  try {
    const { staffId } = req.params;

    const documents = await query(
      `SELECT id, staff_id, document_type, document_name, file_url, file_size, uploaded_at
       FROM staff_documents
       WHERE staff_id = ?
       ORDER BY uploaded_at DESC`,
      [staffId]
    );

    res.json({ documents });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/staff/documents/:docId
 * Delete a staff document
 */
export const deleteStaffDocument = async (req, res, next) => {
  try {
    const { docId } = req.params;

    const rows = await query('SELECT * FROM staff_documents WHERE id = ?', [docId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Staff document not found' });
    }

    const doc = rows[0];

    // Remove file from disk if it exists
    if (doc.file_url) {
      const relativePath = doc.file_url.replace(/^\//, '');
      const fullPath = path.join(__dirname, '..', '..', relativePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (unlinkErr) {
          console.warn('Could not delete physical file:', unlinkErr.message);
        }
      }
    }

    await query('DELETE FROM staff_documents WHERE id = ?', [docId]);

    res.json({ message: 'Staff document deleted successfully' });
  } catch (error) {
    next(error);
  }
};
