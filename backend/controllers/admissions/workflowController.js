import { query } from '../../config/database.js';

export const getBranchWorkflow = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const rows = await query(
      `SELECT * FROM branch_admission_workflows WHERE branch_id = ?`,
      [branchId]
    );

    if (rows.length === 0) {
      // Return default configuration if not yet saved
      return res.json({
        workflow: {
          branch_id: Number(branchId),
          enable_enquiry: 1,
          enable_application: 1,
          allow_direct_enquiry_to_admission: 1,
          allow_direct_walkin_admission: 1,
        },
      });
    }

    res.json({ workflow: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateBranchWorkflow = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const {
      enable_enquiry = true,
      enable_application = true,
      allow_direct_enquiry_to_admission = true,
      allow_direct_walkin_admission = true,
    } = req.body;

    await query(
      `INSERT INTO branch_admission_workflows 
       (branch_id, enable_enquiry, enable_application, allow_direct_enquiry_to_admission, allow_direct_walkin_admission)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         enable_enquiry = VALUES(enable_enquiry),
         enable_application = VALUES(enable_application),
         allow_direct_enquiry_to_admission = VALUES(allow_direct_enquiry_to_admission),
         allow_direct_walkin_admission = VALUES(allow_direct_walkin_admission),
         updated_at = NOW()`,
      [
        Number(branchId),
        Boolean(enable_enquiry),
        Boolean(enable_application),
        Boolean(allow_direct_enquiry_to_admission),
        Boolean(allow_direct_walkin_admission),
      ]
    );

    const [updated] = await query(
      `SELECT * FROM branch_admission_workflows WHERE branch_id = ?`,
      [branchId]
    );

    res.json({
      message: 'Admission workflow updated successfully',
      workflow: updated,
    });
  } catch (error) {
    next(error);
  }
};
