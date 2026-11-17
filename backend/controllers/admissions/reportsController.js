import { query } from '../../config/database.js';

export const getConversionFunnel = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    const baseWhere = [];
    const baseParams = [];
    if (branch_id) {
      baseWhere.push('branch_id = ?');
      baseParams.push(Number(branch_id));
    }
    if (academic_year_id) {
      baseWhere.push('academic_year_id = ?');
      baseParams.push(Number(academic_year_id));
    }
    const whereClause = baseWhere.length > 0 ? `WHERE ${baseWhere.join(' AND ')}` : '';

    // Total Funnel Counts
    const [enqCount] = await query(
      `SELECT COUNT(*) AS total FROM enquiries ${whereClause}`,
      baseParams
    );
    const [appCount] = await query(
      `SELECT COUNT(*) AS total FROM applications ${whereClause}`,
      baseParams
    );
    const [admCount] = await query(
      `SELECT COUNT(*) AS total FROM admissions ${whereClause}`,
      baseParams
    );

    const totalEnquiries = enqCount.total || 0;
    const totalApplications = appCount.total || 0;
    const totalAdmissions = admCount.total || 0;

    const enqToAppRate = totalEnquiries > 0 ? Number(((totalApplications / totalEnquiries) * 100).toFixed(1)) : 0;
    const appToAdmRate = totalApplications > 0 ? Number(((totalAdmissions / totalApplications) * 100).toFixed(1)) : 0;
    const overallRate = totalEnquiries > 0 ? Number(((totalAdmissions / totalEnquiries) * 100).toFixed(1)) : 0;

    // Breakdown by Lead Source
    let lsSql = `
      SELECT 
        COALESCE(ls.id, 0) AS lead_source_id,
        COALESCE(ls.name, 'Unassigned / Direct') AS lead_source_name,
        COUNT(e.id) AS total_enquiries,
        COUNT(CASE WHEN e.stage IN ('application', 'admitted') THEN 1 END) AS converted_applications,
        COUNT(CASE WHEN e.stage = 'admitted' THEN 1 END) AS confirmed_admissions
      FROM enquiries e
      LEFT JOIN lead_sources ls ON e.lead_source_id = ls.id
      ${whereClause}
      GROUP BY ls.id, ls.name
      ORDER BY total_enquiries DESC
    `;
    const leadSourceBreakdown = await query(lsSql, baseParams);

    const formattedLeadSources = leadSourceBreakdown.map((item) => {
      const enqs = item.total_enquiries || 0;
      const adms = item.confirmed_admissions || 0;
      const rate = enqs > 0 ? Number(((adms / enqs) * 100).toFixed(1)) : 0;
      return {
        ...item,
        conversion_rate: rate,
      };
    });

    res.json({
      funnel: {
        total_enquiries: totalEnquiries,
        total_applications: totalApplications,
        total_admissions: totalAdmissions,
        enquiry_to_application_rate: enqToAppRate,
        application_to_admission_rate: appToAdmRate,
        overall_conversion_rate: overallRate,
      },
      lead_sources: formattedLeadSources,
    });
  } catch (error) {
    next(error);
  }
};

export const getCapacityRoster = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    if (!branch_id) {
      return res.status(400).json({ message: 'Branch selection is required for capacity roster' });
    }

    let sql = `
      SELECT 
        bcs.id AS section_id,
        bcs.name AS section_name,
        bcs.capacity,
        bcs.room_no,
        c.id AS class_id,
        c.name AS class_name,
        c.stage AS class_stage,
        b.name AS branch_name,
        COALESCE(adm_stats.admitted_count, 0) AS admitted_count
      FROM branch_class_sections bcs
      JOIN classes c ON bcs.class_id = c.id
      JOIN branches b ON bcs.branch_id = b.id
      LEFT JOIN (
        SELECT section_id, COUNT(*) AS admitted_count
        FROM admissions
        WHERE branch_id = ?
        ${academic_year_id ? 'AND academic_year_id = ?' : ''}
        AND enrollment_status = 'active'
        GROUP BY section_id
      ) adm_stats ON bcs.id = adm_stats.section_id
      WHERE bcs.branch_id = ? AND bcs.status = 'active'
      ORDER BY c.display_order ASC, c.name ASC, bcs.name ASC
    `;

    const params = [Number(branch_id)];
    if (academic_year_id) {
      params.push(Number(academic_year_id));
    }
    params.push(Number(branch_id));

    const roster = await query(sql, params);

    let totalCapacity = 0;
    let totalAdmitted = 0;

    const sectionsWithVacancy = roster.map((item) => {
      const cap = item.capacity || 40;
      const adm = Number(item.admitted_count) || 0;
      const vacancy = Math.max(0, cap - adm);
      const occupancyRate = cap > 0 ? Number(((adm / cap) * 100).toFixed(1)) : 0;

      totalCapacity += cap;
      totalAdmitted += adm;

      let status = 'Available';
      if (adm >= cap) {
        status = 'Full';
      } else if (occupancyRate >= 85) {
        status = 'Near Full';
      }

      return {
        ...item,
        capacity: cap,
        admitted_count: adm,
        vacancy,
        occupancy_rate: occupancyRate,
        status,
      };
    });

    const totalVacancies = Math.max(0, totalCapacity - totalAdmitted);
    const overallOccupancy = totalCapacity > 0 ? Number(((totalAdmitted / totalCapacity) * 100).toFixed(1)) : 0;

    res.json({
      summary: {
        total_capacity: totalCapacity,
        total_admitted: totalAdmitted,
        total_vacancies: totalVacancies,
        overall_occupancy_rate: overallOccupancy,
      },
      roster: sectionsWithVacancy,
    });
  } catch (error) {
    next(error);
  }
};

export const getEnquiryStatusLog = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, start_date, end_date, stage, status } = req.query;

    let sql = `
      SELECT 
        e.id,
        e.enquiry_no,
        e.student_name,
        e.parent_name,
        e.primary_phone,
        e.stage,
        e.status,
        e.created_at,
        b.name AS branch_name,
        c.name AS class_name,
        ls.name AS lead_source_name,
        COUNT(ef.id) AS total_followups,
        MAX(ef.followup_date) AS last_interaction_date
      FROM enquiries e
      JOIN branches b ON e.branch_id = b.id
      JOIN classes c ON e.class_id = c.id
      LEFT JOIN lead_sources ls ON e.lead_source_id = ls.id
      LEFT JOIN enquiry_followups ef ON e.id = ef.enquiry_id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND e.branch_id = ?';
      params.push(Number(branch_id));
    }
    if (academic_year_id) {
      sql += ' AND e.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (stage) {
      sql += ' AND e.stage = ?';
      params.push(stage);
    }
    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }
    if (start_date) {
      sql += ' AND DATE(e.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(e.created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';

    const log = await query(sql, params);
    res.json({ log });
  } catch (error) {
    next(error);
  }
};
