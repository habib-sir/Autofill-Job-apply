/**
 * Project: BD Job Autofill
 * Module: Teletalk Field Mapping
 * Purpose: Exact name/id-keyed field map for bsdb.teletalk.com.bd-style forms.
 * Author: Lead Engineer
 * Version: 1.3.0
 * Last Updated: 2026-07-06
 */

const TELETALK_EXACT_FIELD_MAP = {
  name: 'fullName',
  name_bn: 'nameBn',
  father: 'fatherName',
  father_bn: 'fatherBn',
  mother: 'motherName',
  mother_bn: 'motherBn',
  dob: 'dateOfBirth',
  nationality: 'nationality',
  religion: 'religion',
  gender: 'gender',
  nid_no: 'nidNo',
  breg_no: 'birthRegNo',
  passport_no: 'passportNo',
  marital_status: 'maritalStatus',
  spouse_name: 'spouseName',
  mobile: 'mobile',
  confirm_mobile: 'mobileConfirm',
  email: 'email',
  quota: 'quota',
  quota_details: 'quotaDetails',
  dep_status: 'depStatus',
  present_careof: 'presentCareOf',
  present_village: 'presentAddress',
  present_district: 'presentDistrict',
  present_upazila: 'presentUpazila',
  present_post: 'presentPost',
  present_postcode: 'presentPostcode',
  same_as_present: 'sameAsPresent',
  permanent_careof: 'permanentCareOf',
  permanent_village: 'permanentAddress',
  permanent_district: 'permanentDistrict',
  permanent_upazila: 'permanentUpazila',
  permanent_post: 'permanentPost',
  permanent_postcode: 'permanentPostcode',
  ssc_exam: 'sscExam',
  ssc_roll: 'sscRoll',
  ssc_group: 'sscGroup',
  ssc_group_other: 'sscGroupOther',
  ssc_board: 'sscBoard',
  ssc_board_other: 'sscBoardOther',
  ssc_result_type: 'sscResultType',
  ssc_result: 'sscResult',
  ssc_year: 'sscYear',
  hsc_exam: 'hscExam',
  hsc_roll: 'hscRoll',
  hsc_group: 'hscGroup',
  hsc_group_other: 'hscGroupOther',
  hsc_board: 'hscBoard',
  hsc_board_other: 'hscBoardOther',
  hsc_result_type: 'hscResultType',
  hsc_result: 'hscResult',
  hsc_year: 'hscYear',
  gra_exam: 'graExam',
  gra_institute: 'graInstitute',
  gra_subject: 'graSubject',
  gra_result_type: 'graResultType',
  gra_result: 'graResult',
  gra_year: 'graYear',
  gra_duration: 'graDuration',
  mas_exam: 'masExam',
  mas_institute: 'masInstitute',
  mas_subject: 'masSubject',
  mas_result_type: 'masResultType',
  mas_result: 'masResult',
  mas_year: 'masYear',
  mas_duration: 'masDuration',
  // Other Qualifications – these are arrays with indices
  'other_exp[0][value]': 'experienceComputer',
  'other_exp[1][value]': 'experienceSatlipi'
};

const TELETALK_HOSTNAMES = ['teletalk.com.bd'];

function isTeletalkHostname(hostname) {
  const isDemo = hostname === 'localhost' || hostname.includes('run.app') || window.location.pathname.includes('demo-form.html');
  return isDemo || TELETALK_HOSTNAMES.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function resolveTeletalkFieldKey(nameAttr, idAttr) {
  if (nameAttr && TELETALK_EXACT_FIELD_MAP[nameAttr]) {
    return TELETALK_EXACT_FIELD_MAP[nameAttr];
  }
  if (idAttr && TELETALK_EXACT_FIELD_MAP[idAttr]) {
    return TELETALK_EXACT_FIELD_MAP[idAttr];
  }
  return null;
}
