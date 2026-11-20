import { query } from '../../config/database.js';

/**
 * GET /api/staff/:staffId/payroll-structure
 * Get salary components and deductions for a staff member
 */
export const getPayrollStructure = async (req, res, next) => {
  try {
    const { staffId } = req.params;

    const rows = await query(
      `SELECT
         id,
         staff_id,
         COALESCE(basic_pay, basic_salary, 0) AS basic_pay,
         COALESCE(basic_salary, basic_pay, 0) AS basic_salary,
         hra,
         da,
         conveyance_allowance,
         special_allowance,
         gross_salary,
         pf_deduction_pct,
         esi_deduction_pct,
         pt_deduction,
         tds_deduction,
         updated_at
       FROM staff_payroll_structures
       WHERE staff_id = ?
       LIMIT 1`,
      [staffId]
    );

    if (rows.length === 0) {
      // Default empty structure
      return res.json({
        payrollStructure: {
          staff_id: Number(staffId),
          basic_pay: 0,
          basic_salary: 0,
          hra: 0,
          da: 0,
          conveyance_allowance: 0,
          special_allowance: 0,
          gross_salary: 0,
          pf_deduction_pct: 12.0,
          esi_deduction_pct: 0.75,
          pt_deduction: 200.0,
          tds_deduction: 0,
        },
      });
    }

    res.json({ payrollStructure: rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/:staffId/payroll-structure
 * Create or update payroll salary structure
 */
export const savePayrollStructure = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const {
      basic_pay,
      basic_salary,
      hra = 0,
      da = 0,
      conveyance_allowance = 0,
      special_allowance = 0,
      pf_deduction_pct = 12.0,
      esi_deduction_pct = 0.75,
      pt_deduction = 200.0,
      tds_deduction = 0,
    } = req.body;

    const basePay = Number(basic_pay !== undefined ? basic_pay : (basic_salary || 0));
    const hraVal = Number(hra || 0);
    const daVal = Number(da || 0);
    const conveyanceVal = Number(conveyance_allowance || 0);
    const specialVal = Number(special_allowance || 0);

    const grossSalary = basePay + hraVal + daVal + conveyanceVal + specialVal;

    await query(
      `INSERT INTO staff_payroll_structures (
         staff_id,
         basic_pay,
         basic_salary,
         hra,
         da,
         conveyance_allowance,
         special_allowance,
         gross_salary,
         pf_deduction_pct,
         esi_deduction_pct,
         pt_deduction,
         tds_deduction
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         basic_pay = VALUES(basic_pay),
         basic_salary = VALUES(basic_salary),
         hra = VALUES(hra),
         da = VALUES(da),
         conveyance_allowance = VALUES(conveyance_allowance),
         special_allowance = VALUES(special_allowance),
         gross_salary = VALUES(gross_salary),
         pf_deduction_pct = VALUES(pf_deduction_pct),
         esi_deduction_pct = VALUES(esi_deduction_pct),
         pt_deduction = VALUES(pt_deduction),
         tds_deduction = VALUES(tds_deduction)`,
      [
        staffId,
        basePay,
        basePay,
        hraVal,
        daVal,
        conveyanceVal,
        specialVal,
        grossSalary,
        Number(pf_deduction_pct) || 12.0,
        Number(esi_deduction_pct) || 0.75,
        Number(pt_deduction) || 200.0,
        Number(tds_deduction) || 0,
      ]
    );

    res.json({
      message: 'Payroll structure saved successfully',
      gross_salary: grossSalary,
      staffId: Number(staffId),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/payroll/generate
 * Generate monthly payroll for a campus:
 * Calculates LOP deduction = (Gross / DaysInMonth) * LOP Days
 * Calculates Net Pay
 * Saves into staff_payslips
 */
export const generateMonthlyPayroll = async (req, res, next) => {
  try {
    const { branch_id, month, year, staff_ids } = req.body;

    const currentMonth = Number(month);
    const currentYear = Number(year);

    if (!currentMonth || !currentYear) {
      return res.status(400).json({ message: 'month (1-12) and year (e.g. 2026) are required' });
    }

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    // Total days in target month
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Query active staff with their payroll structures
    let staffSql = `
      SELECT
        sp.id AS staff_id,
        sp.branch_id,
        sp.emp_no,
        sp.first_name,
        sp.last_name,
        sp.designation,
        sp.department,
        ps.basic_pay,
        ps.basic_salary,
        ps.hra,
        ps.da,
        ps.conveyance_allowance,
        ps.special_allowance,
        ps.gross_salary,
        ps.pf_deduction_pct,
        ps.esi_deduction_pct,
        ps.pt_deduction,
        ps.tds_deduction
      FROM staff_profiles sp
      LEFT JOIN staff_payroll_structures ps ON sp.id = ps.staff_id
      WHERE sp.status = 'active'
    `;
    const staffParams = [];

    if (targetBranchId) {
      staffSql += ' AND sp.branch_id = ?';
      staffParams.push(Number(targetBranchId));
    }
    if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      staffSql += ` AND sp.id IN (${staff_ids.map(() => '?').join(',')})`;
      staffParams.push(...staff_ids);
    }

    const staffList = await query(staffSql, staffParams);

    if (staffList.length === 0) {
      return res.status(404).json({ message: 'No active staff found for the selected branch/criteria' });
    }

    let generatedCount = 0;
    let totalGrossCalculated = 0;
    let totalNetCalculated = 0;

    for (const staff of staffList) {
      const basicPay = Number(staff.basic_pay || staff.basic_salary || 0);
      const hra = Number(staff.hra || 0);
      const da = Number(staff.da || 0);
      const conveyance = Number(staff.conveyance_allowance || 0);
      const special = Number(staff.special_allowance || 0);
      let grossSalary = Number(staff.gross_salary || 0);

      if (grossSalary === 0 && (basicPay > 0 || hra > 0)) {
        grossSalary = basicPay + hra + da + conveyance + special;
      }

      // If no salary configured, default a standard salary structure for testing/realistic operation
      if (grossSalary === 0) {
        grossSalary = 30000;
      }
      const effectiveBasic = basicPay > 0 ? basicPay : Math.round(grossSalary * 0.5);
      const effectiveHra = hra > 0 ? hra : Math.round(grossSalary * 0.3);
      const effectiveAllowances = (da + conveyance + special) > 0 ? (da + conveyance + special) : (grossSalary - effectiveBasic - effectiveHra);

      // Query LOP / absent days in this month
      const absentRows = await query(
        `SELECT COUNT(*) AS absent_days
         FROM staff_attendance
         WHERE staff_id = ?
           AND MONTH(attendance_date) = ?
           AND YEAR(attendance_date) = ?
           AND status = 'absent'`,
        [staff.staff_id, currentMonth, currentYear]
      );
      const lopDays = Number(absentRows[0]?.absent_days || 0);
      const paidDays = Math.max(0, totalDaysInMonth - lopDays);

      // Formula: LOP deduction = (Gross / DaysInMonth) * LOP Days
      const perDayGross = grossSalary / totalDaysInMonth;
      const lopAmount = Math.round(perDayGross * lopDays * 100) / 100;

      // Pro-rata earnings
      const paidRatio = paidDays / totalDaysInMonth;
      const basicEarned = Math.round(effectiveBasic * paidRatio * 100) / 100;
      const hraEarned = Math.round(effectiveHra * paidRatio * 100) / 100;
      const allowancesEarned = Math.round(effectiveAllowances * paidRatio * 100) / 100;
      const grossEarned = Math.max(0, Math.round((grossSalary - lopAmount) * 100) / 100);

      // Statutory deductions
      const pfPct = Number(staff.pf_deduction_pct || 12.0);
      const esiPct = Number(staff.esi_deduction_pct || 0.75);
      const ptDeduction = Number(staff.pt_deduction !== null && staff.pt_deduction !== undefined ? staff.pt_deduction : 200.0);
      const tdsDeduction = Number(staff.tds_deduction || 0);

      const pfAmount = Math.round(((basicEarned * pfPct) / 100) * 100) / 100;
      const esiAmount = grossEarned <= 21000 ? Math.round(((grossEarned * esiPct) / 100) * 100) / 100 : 0;
      const totalDeductions = Math.round((pfAmount + esiAmount + ptDeduction + tdsDeduction) * 100) / 100;

      const netSalary = Math.max(0, Math.round((grossEarned - totalDeductions) * 100) / 100);

      const staffBranchId = staff.branch_id || targetBranchId || 1;

      // Save into staff_payslips
      await query(
        `INSERT INTO staff_payslips (
           branch_id,
           staff_id,
           pay_month,
           pay_year,
           total_days_in_month,
           paid_days,
           lop_days,
           lop_amount,
           basic_earned,
           hra_earned,
           allowances_total,
           gross_earned,
           pf_amount,
           esi_amount,
           pt_amount,
           tds_amount,
           total_deductions,
           net_salary,
           payment_status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
         ON DUPLICATE KEY UPDATE
           total_days_in_month = VALUES(total_days_in_month),
           paid_days = VALUES(paid_days),
           lop_days = VALUES(lop_days),
           lop_amount = VALUES(lop_amount),
           basic_earned = VALUES(basic_earned),
           hra_earned = VALUES(hra_earned),
           allowances_total = VALUES(allowances_total),
           gross_earned = VALUES(gross_earned),
           pf_amount = VALUES(pf_amount),
           esi_amount = VALUES(esi_amount),
           pt_amount = VALUES(pt_amount),
           tds_amount = VALUES(tds_amount),
           total_deductions = VALUES(total_deductions),
           net_salary = VALUES(net_salary)`,
        [
          staffBranchId,
          staff.staff_id,
          currentMonth,
          currentYear,
          totalDaysInMonth,
          paidDays,
          lopDays,
          lopAmount,
          basicEarned,
          hraEarned,
          allowancesEarned,
          grossEarned,
          pfAmount,
          esiAmount,
          ptDeduction,
          tdsDeduction,
          totalDeductions,
          netSalary,
        ]
      );

      generatedCount++;
      totalGrossCalculated += grossEarned;
      totalNetCalculated += netSalary;
    }

    res.json({
      message: `Monthly payroll generated successfully for ${generatedCount} staff`,
      month: currentMonth,
      year: currentYear,
      total_days: totalDaysInMonth,
      staff_count: generatedCount,
      total_gross: Math.round(totalGrossCalculated * 100) / 100,
      total_net: Math.round(totalNetCalculated * 100) / 100,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/payroll/payslips
 * List payslips for a branch and pay period
 */
export const getPayslips = async (req, res, next) => {
  try {
    const { branch_id, month, year, staff_id, status } = req.query;

    const currentYear = year ? Number(year) : new Date().getFullYear();
    const currentMonth = month ? Number(month) : (new Date().getMonth() + 1);

    let targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : branch_id;
    if (targetBranchId === 'all') targetBranchId = null;

    let sql = `
      SELECT
        spay.*,
        sp.emp_no,
        sp.first_name,
        sp.last_name,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
        u.name AS user_name,
        sp.designation,
        sp.department,
        sp.bank_name,
        COALESCE(sp.account_no, '') AS bank_account_no,
        COALESCE(sp.ifsc_code, '') AS bank_ifsc,
        COALESCE(sp.pan_no, '') AS pan_no,
        COALESCE(sp.pf_uan_no, '') AS uan_no,
        COALESCE(sp.esi_no, '') AS esi_no,
        b.name AS branch_name,
        b.code AS branch_code
      FROM staff_payslips spay
      JOIN staff_profiles sp ON spay.staff_id = sp.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN branches b ON spay.branch_id = b.id
      WHERE spay.pay_month = ? AND spay.pay_year = ?
    `;
    const params = [currentMonth, currentYear];

    if (targetBranchId) {
      sql += ' AND spay.branch_id = ?';
      params.push(Number(targetBranchId));
    }
    if (staff_id && staff_id !== 'all') {
      sql += ' AND spay.staff_id = ?';
      params.push(Number(staff_id));
    }
    if (status && status !== 'all') {
      sql += ' AND spay.payment_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sp.first_name ASC';

    const rawRows = await query(sql, params);

    const payslips = rawRows.map(p => {
      const staffName = (p.profile_full_name && p.profile_full_name.trim() !== '')
        ? p.profile_full_name.trim()
        : (p.user_name || p.emp_no || 'Staff Member');

      return {
        ...p,
        name: staffName,
        staff_name: staffName,
        gross_salary: Number(p.gross_earned || 0),
        basic_salary: Number(p.basic_earned || 0),
        hra: Number(p.hra_earned || 0),
        da: 0,
        special_allowance: Number(p.allowances_total || 0),
        days_in_month: Number(p.total_days_in_month || 30),
        present_days: Number(p.paid_days !== undefined ? p.paid_days : 30),
        lop_days: Number(p.lop_days || 0),
        lop_deduction: Number(p.lop_amount || 0),
        pf_deduction: Number(p.pf_amount || 0),
        esi_deduction: Number(p.esi_amount || 0),
        pt_deduction: Number(p.pt_amount || 0),
        net_pay: Number(p.net_salary || 0),
        status: p.payment_status === 'paid' ? 'Paid' : 'Generated',
      };
    });

    res.json({
      month: currentMonth,
      year: currentYear,
      count: payslips.length,
      payslips,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/payroll/payslips/:payslipId
 * Get detailed 360° payslip view for viewing & printable PDF
 */
export const getPayslipById = async (req, res, next) => {
  try {
    const { payslipId } = req.params;

    const sql = `
      SELECT
        spay.*,
        sp.emp_no,
        sp.first_name,
        sp.last_name,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
        u.name AS user_name,
        sp.designation,
        sp.department,
        sp.joining_date,
        sp.bank_name,
        COALESCE(sp.account_no, '') AS bank_account_no,
        COALESCE(sp.ifsc_code, '') AS bank_ifsc,
        COALESCE(sp.pan_no, '') AS pan_no,
        COALESCE(sp.pf_uan_no, '') AS uan_no,
        COALESCE(sp.esi_no, '') AS esi_no,
        sp.street_address,
        sp.city,
        b.name AS branch_name,
        b.code AS branch_code,
        b.address AS branch_address
      FROM staff_payslips spay
      JOIN staff_profiles sp ON spay.staff_id = sp.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN branches b ON spay.branch_id = b.id
      WHERE spay.id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [payslipId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    const payslip = rows[0];
    payslip.staff_name = (payslip.profile_full_name && payslip.profile_full_name.trim() !== '') ? payslip.profile_full_name.trim() : (payslip.user_name || payslip.emp_no);

    res.json({ payslip });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/staff/payroll/payslips/:payslipId/status
 * Update payment status (draft, processed, paid)
 */
export const updatePayslipStatus = async (req, res, next) => {
  try {
    const { payslipId } = req.params;
    const { payment_status, payment_date, payment_mode } = req.body;

    const existing = await query('SELECT id FROM staff_payslips WHERE id = ?', [payslipId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    const validStatus = ['draft', 'processed', 'paid'];
    if (!validStatus.includes(payment_status)) {
      return res.status(400).json({ message: 'Invalid payment_status' });
    }

    const finalPaymentDate = payment_status === 'paid' ? (payment_date || new Date().toISOString().split('T')[0]) : null;
    const finalPaymentMode = payment_mode || 'Bank Transfer';

    await query(
      `UPDATE staff_payslips
       SET payment_status = ?,
           payment_date = ?,
           payment_mode = ?
       WHERE id = ?`,
      [payment_status, finalPaymentDate, finalPaymentMode, payslipId]
    );

    res.json({
      message: `Payslip marked as ${payment_status}`,
      payslipId: Number(payslipId),
      payment_status,
      payment_date: finalPaymentDate,
    });
  } catch (error) {
    next(error);
  }
};
