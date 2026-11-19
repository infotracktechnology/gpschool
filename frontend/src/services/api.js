
import { api } from '../api/client';

// Helper: Safely extract array from API response
const getArray = (res, keys = []) => {
    for (const key of keys) {
        if (Array.isArray(res?.[key])) {
            return res[key];
        }
    }

    if (Array.isArray(res?.data)) {
        return res.data;
    }

    return [];
};


// ==========================================
// BRANCHES
// ==========================================
export async function getBranches(filters = {}) {
    const query = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });

    const url = query.toString()
        ? `/settings/branches?${query.toString()}`
        : '/settings/branches';

    const res = await api.get(url);

    return getArray(res, ['branches']);
}


// ==========================================
// ACADEMIC YEARS
// ==========================================
export async function getAcademicYears(branchId, filters = {}) {
    const query = new URLSearchParams();

    if (branchId) {
        query.set('branch_id', String(branchId));
    }

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });

    const url = query.toString()
        ? `/settings/academic-years?${query.toString()}`
        : '/settings/academic-years';

    const res = await api.get(url);

    return {
        data: getArray(res, ['academicYears', 'academic_years'])
    };
}


// ==========================================
// CLASSES
// ==========================================
export async function getClasses(branchId, academicYearId, filters = {}) {
    const query = new URLSearchParams();

    if (branchId) {
        query.set('branch_id', String(branchId));
    }

    if (academicYearId) {
        query.set('academic_year_id', String(academicYearId));
    }

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });

    const res = await api.get(
        `/academics/classes?${query.toString()}`
    );

    return {
        data: getArray(res, ['classes'])
    };
}


// ==========================================
// SECTIONS
// ==========================================
export async function getSections(branchId, academicYearId, filters = {}) {
    const query = new URLSearchParams();

    if (branchId) {
        query.set('branch_id', String(branchId));
    }

    if (academicYearId) {
        query.set('academic_year_id', String(academicYearId));
    }

    if (filters.class_id) {
        query.set('class_id', String(filters.class_id));
    }

    const res = await api.get(
        `/academics/sections?${query.toString()}`
    );

    return {
        data: getArray(res, ['sections'])
    };
}


// ==========================================
// CLASS SUBJECTS
// ==========================================
export async function getClassSubjects(branchId, academicYearId, classId) {
    if (!branchId || !academicYearId || !classId) {
        return [];
    }

    const query = new URLSearchParams();

    query.set('branch_id', String(branchId));
    query.set('academic_year_id', String(academicYearId));
    query.set('class_id', String(classId));

    const res = await api.get(
        `/academics/subjects?${query.toString()}`
    );

    const subjects = getArray(res, ['subjects']);

    return subjects.map((s) => ({
        ...s,
        subject_id: s.subject_id ?? s.id,
        subject_name: s.subject_name ?? s.name,
        subject_code: s.subject_code ?? s.code
    }));
}


// ==========================================
// ACADEMIC GROUPS
// ==========================================
export async function getAcademicGroups(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });

    const url = query.toString()
        ? `/academic-groups?${query.toString()}`
        : '/academic-groups';

    const res = await api.get(url);

    return getArray(res, ['groups']);
}
