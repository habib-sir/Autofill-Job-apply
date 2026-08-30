/**
 * Project: BD Job Autofill
 * Module: Education & Quota Reference Data
 * Purpose: Canonical, read-only reference dataset for SSC/HSC education
 *          boards, exam levels, result types, subject groups (SSC/HSC/
 *          Bachelor/Master), quota categories, and dependency-status
 *          options - keyed the same way as the source government job
 *          application form (id -> label). Consumed by profile forms and
 *          content-script autofill logic to populate and match dropdown
 *          fields without hardcoding values inline in the UI code.
 * Author: Lead Engineer
 * Version: 1.0.0
 * Dependencies: none (pure ES module, no external imports)
 * Last Updated: 2026-07-06
 */

/** SSC-level exam types (exam1) */
export const SSC_EXAM_TYPES = Object.freeze([
  { id: "1", name: "S.S.C" },
  { id: "4", name: "Dakhil" },
  { id: "3", name: "S.S.C Vocational" },
  { id: "2", name: "O Level/Cambridge" },
  { id: "5", name: "S.S.C Equivalent" }
]);

/** SSC education boards (institute1) */
export const SSC_BOARDS = Object.freeze([
  { id: "1", name: "Cumilla" },
  { id: "2", name: "Rajshahi" },
  { id: "3", name: "Jashore" },
  { id: "4", name: "Chittagong" },
  { id: "5", name: "Dhaka" },
  { id: "6", name: "Barishal" },
  { id: "7", name: "Sylhet" },
  { id: "8", name: "Technical" },
  { id: "9", name: "Madrasah" },
  { id: "10", name: "Cambridge International - IGCE" },
  { id: "11", name: "Dinajpur" },
  { id: "12", name: "Edexcel International" },
  { id: "13", name: "Others" },
  { id: "14", name: "Bangladesh Technical Education Board (BTEB)" }
]);

/** HSC-level exam types (exam2) */
export const HSC_EXAM_TYPES = Object.freeze([
  { id: "16", name: "H.S.C" },
  { id: "15", name: "Alim" },
  { id: "10", name: "Business Management" },
  { id: "12", name: "Diploma Engineering" },
  { id: "11", name: "A Level/Sr. Cambridge" },
  { id: "14", name: "H.S.C Equivalent" },
  { id: "13", name: "Diploma in Pharmacy" }
]);

/** HSC education boards (institute2) */
export const HSC_BOARDS = Object.freeze([
  { id: "15", name: "Chittagong" },
  { id: "16", name: "Jashore" },
  { id: "17", name: "Cumilla" },
  { id: "18", name: "Rajshahi" },
  { id: "19", name: "Dhaka" },
  { id: "20", name: "Sylhet" },
  { id: "21", name: "Madrasah" },
  { id: "22", name: "Technical" },
  { id: "23", name: "Dinajpur" },
  { id: "24", name: "Barishal" },
  { id: "25", name: "Edexcel International" },
  { id: "26", name: "Cambridge International - IGCE" },
  { id: "27", name: "Bangladesh Technical Education Board (BTEB)" },
  { id: "28", name: "Others" }
]);

/** Result / grading types shared by SSC & HSC (result1 / result2) */
export const SCHOOL_RESULT_TYPES = Object.freeze([
  { id: "1", name: "1st Division" },
  { id: "2", name: "2nd Division" },
  { id: "3", name: "3rd Division" },
  { id: "4", name: "GPA(Out of 4)" },
  { id: "5", name: "GPA(Out of 5)" }
]);

/** Result / grading types for Bachelor & Master (result3 / result4) */
export const DEGREE_RESULT_TYPES = Object.freeze([
  { id: "1", name: "1st Class" },
  { id: "2", name: "2nd Class" },
  { id: "3", name: "3rd Class" },
  { id: "4", name: "CGPA(Out of 4)" },
  { id: "5", name: "CGPA(Out of 5)" }
]);

/** SSC subject/group options (subject1) */
export const SSC_SUBJECT_GROUPS = Object.freeze([
  { id: "1", name: "Humanities" },
  { id: "2", name: "Science" },
  { id: "3", name: "Business Studies" },
  { id: "24", name: "Others" }
]);

/** HSC subject/group options (subject2) */
export const HSC_SUBJECT_GROUPS = Object.freeze([
  { id: "26", name: "Business Studies" },
  { id: "27", name: "Humanities" },
  { id: "28", name: "Others" },
  { id: "29", name: "Science" }
]);

/** Bachelor-level degree/exam types (exam3) */
export const BACHELOR_EXAM_TYPES = Object.freeze([
  { id: "18", name: "B.Sc (Engineering/Architecture)" },
  { id: "32", name: "B.Sc (Agricultural Science)" },
  { id: "33", name: "B.Sc (Engineering/Architecture)" },
  { id: "19", name: "B.Sc (Agricultural Science)" },
  { id: "42", name: "M.B.B.S/ B.D.S" },
  { id: "24", name: "B.A (Honors)" },
  { id: "25", name: "B.Com (Honors)" },
  { id: "27", name: "B.Ed (Honors)" },
  { id: "29", name: "B.S.S (Honors)" },
  { id: "31", name: "B.Sc (Honors)" },
  { id: "41", name: "LL.B. (Honours)" },
  { id: "26", name: "B.A (Pass Course)" },
  { id: "28", name: "B.Com (Pass Course)" },
  { id: "30", name: "B.S.S (Pass Course)" },
  { id: "34", name: "B.Sc (Pass Course)" },
  { id: "38", name: "BBS (Pass Course)" },
  { id: "39", name: "L.L.B (Pass Course)" },
  { id: "22", name: "Fazil" },
  { id: "23", name: "Graduation Equivalent" },
  { id: "35", name: "BBA" },
  { id: "36", name: "BBS" },
  { id: "37", name: "B.Tech" },
  { id: "40", name: "Others" }
]);

/** Bachelor-level subject options (subject3) */
export const BACHELOR_SUBJECTS = Object.freeze([
  { id: "50", name: "Applied Chemistry" },
  { id: "51", name: "Applied Physics" },
  { id: "53", name: "Applied Mathematics" },
  { id: "56", name: "Botany" },
  { id: "59", name: "Biochemistry" },
  { id: "60", name: "Chemistry" },
  { id: "62", name: "Computer Science" },
  { id: "63", name: "Clinical Psychology" },
  { id: "72", name: "Geography" },
  { id: "81", name: "Information Com. Tech. (ICT)" },
  { id: "85", name: "Mathematics" },
  { id: "87", name: "Marine Science" },
  { id: "88", name: "Microbiology" },
  { id: "89", name: "Medical Technology" },
  { id: "91", name: "Pharmacy" },
  { id: "93", name: "Physics" },
  { id: "97", name: "Psychology" },
  { id: "101", name: "Pharmaceutical Chemistry" },
  { id: "104", name: "Statistics" },
  { id: "111", name: "Zoology" },
  { id: "112", name: "Genetic and Breeding" },
  { id: "122", name: "Forestry" },
  { id: "131", name: "Agriculture" }
]);

/** Master's-level degree/exam types (exam4) */
export const MASTERS_EXAM_TYPES = Object.freeze([
  { id: "44", name: "Kamil" },
  { id: "47", name: "M.Ed" },
  { id: "50", name: "M.Sc (Engineering/Architecture)" },
  { id: "51", name: "ME/Mtech" },
  { id: "52", name: "MBS" },
  { id: "54", name: "M.Sc (Agricultural Science)" },
  { id: "55", name: "Mmed" },
  { id: "43", name: "M.A" },
  { id: "48", name: "M.S.S" },
  { id: "53", name: "M.Sc" },
  { id: "45", name: "M.Com" },
  { id: "49", name: "MBA" },
  { id: "46", name: "LL.M" },
  { id: "56", name: "Others" }
]);

/** Master's-level subject options (subject4) */
export const MASTERS_SUBJECTS = Object.freeze([
  { id: "283", name: "Applied Chemistry" },
  { id: "284", name: "Applied Mathematics" },
  { id: "285", name: "Agriculture" },
  { id: "286", name: "Applied Physics" },
  { id: "287", name: "Clinical Psychology" },
  { id: "288", name: "Botany" },
  { id: "289", name: "Forestry" },
  { id: "290", name: "Computer Science" },
  { id: "291", name: "Chemistry" },
  { id: "292", name: "Genetic and Breeding" },
  { id: "293", name: "Biochemistry" },
  { id: "294", name: "Geography" },
  { id: "295", name: "M.Sc" },
  { id: "296", name: "Information Com. Tech. (ICT)" },
  { id: "297", name: "Marine Science" },
  { id: "298", name: "Mathematics" },
  { id: "299", name: "Microbiology" },
  { id: "300", name: "Medical Technology" },
  { id: "301", name: "Pharmaceutical Chemistry" },
  { id: "302", name: "Physics" },
  { id: "303", name: "Pharmacy" },
  { id: "304", name: "Statistics" },
  { id: "305", name: "Psychology" },
  { id: "306", name: "Zoology" }
]);

/** Quota / freedom-fighter-family category options (ffq) */
export const QUOTA_CATEGORIES = Object.freeze([
  { id: "1", name: "Freedom Fighter" },
  { id: "2", name: "Child of Freedom Fighter" },
  { id: "3", name: "Grand Child of Freedom Fighter" },
  { id: "4", name: "Physically Handicapped" },
  { id: "5", name: "Orphan" },
  { id: "6", name: "Ethnic Minority" },
  { id: "7", name: "Ansar-VDP" },
  { id: "8", name: "Non Quota" }
]);

/** Dependency status options (ds) - relation of applicant to a Govt./Semi-Govt. employee */
export const DEPENDENCY_STATUSES = Object.freeze([
  { id: "1", name: "Govt. Employee" },
  { id: "2", name: "Semi Govt. Employee" },
  { id: "3", name: "Autonomous" },
  { id: "4", name: "Employee of this department" },
  { id: "5", name: "Other" }
]);

/**
 * Look up a reference item by id within any of the option lists above.
 * @param {ReadonlyArray<{id:string,name:string}>} list - one of the exported option lists
 * @param {string} id - the id to find
 * @returns {{id:string,name:string}|undefined}
 */
export function findById(list, id) {
  return list.find((item) => item.id === id);
}

/**
 * Look up a reference item by exact (case-insensitive) name within any of
 * the option lists above.
 * @param {ReadonlyArray<{id:string,name:string}>} list - one of the exported option lists
 * @param {string} name - the name to find
 * @returns {{id:string,name:string}|undefined}
 */
export function findByName(list, name) {
  const target = name.trim().toLowerCase();
  return list.find((item) => item.name.trim().toLowerCase() === target);
}
