/**
 * Project: BD Job Autofill
 * Module: Content Script
 * Purpose: Detects form fields on the active page and fills them using the
 *          supplied profile data when triggered by the popup. Consults
 *          teletalk-mapping.js for exact name/id matches on Teletalk-style
 *          hostnames before falling back to generic label-text matching.
 * Author: Lead Engineer
 * Version: 1.10.0
 * Dependencies: teletalk-mapping.js
 * Last Updated: 2026-07-08
 *
 * Changelog 1.10.0: Fixed SSC/HSC (and Graduation/Masters) Result Type
 * selects sometimes requiring manual selection of "GPA(out of 5)" instead
 * of autofilling. Root cause: a bare "GPA" profile value matched multiple
 * options ("GPA(out of 4)" and "GPA(out of 5)") ambiguously, and the first
 * match won. setSelectValue now disambiguates using the paired numeric
 * result value (e.g. hscResult) to pick the correct scale, defaulting to
 * the out-of-5 scale used by current SSC/HSC grading in Bangladesh.
 */

/**
 * Maps profile field keys to arrays of matching patterns tested against
 * input name, id, placeholder, and associated label text (all lowercased).
 */
const FIELD_PATTERNS = {
  fullName: ['full name', 'fullname', 'name', 'applicant name', 'candidate name'],
  nameBn: ['name_bn', 'বাংলায়', 'bangla', "candidate's name (bangla)"],
  fatherName: ["father's name", 'father name', 'fathername', 'father'],
  fatherBn: ['father_bn', 'পিতার নাম', "father's name (bangla)"],
  motherName: ["mother's name", 'mother name', 'mothername', 'mother'],
  motherBn: ['mother_bn', 'মাতার নাম', "mother's name (bangla)"],
  dateOfBirth: ['date of birth', 'dob', 'birth date', 'birthdate'],
  gender: ['gender', 'sex'],
  nidNo: ['nid', 'national id', 'national identity', 'nid_no'],
  birthRegNo: ['birthreg', 'birth reg', 'birth registration', 'breg_no'],
  passportNo: ['passport', 'passport_no'],
  mobile: ['mobile', 'phone', 'contact number', 'cell'],
  mobileConfirm: ['confirm_mobile', 'confirm mobile', 'mobile_confirm'],
  email: ['email', 'e-mail'],
  presentCareOf: ['present_careof', 'present care of', 'care of'],
  presentAddress: ['present_village', 'present address', 'current address', 'mailing address', 'present village'],
  presentDistrict: ['present_district', 'present district'],
  presentUpazila: ['present_upazila', 'present upazila', 'present upazila/p.s.', 'present thana', 'present_thana'],
  presentPost: ['present_post', 'present post office', 'present post'],
  presentPostcode: ['present_postcode', 'present post code', 'present postcode'],
  permanentCareOf: ['permanent_careof', 'permanent care of'],
  permanentAddress: ['permanent_village', 'permanent address', 'permanent village'],
  permanentDistrict: ['permanent_district', 'permanent district'],
  permanentUpazila: ['permanent_upazila', 'permanent upazila', 'permanent upazila/p.s.', 'permanent thana', 'permanent_thana'],
  permanentPost: ['permanent_post', 'permanent post office', 'permanent post'],
  permanentPostcode: ['permanent_postcode', 'permanent post code', 'permanent postcode'],
  fatherOccupation: ["father's occupation", 'father occupation'],
  religion: ['religion'],
  nationality: ['nationality'],
  maritalStatus: ['marital status', 'marital_status'],
  spouseName: ['spouse name', 'spouse_name'],
  bloodGroup: ['blood group', 'bloodgroup'],
  quota: ['quota'],
  depStatus: ['departmental', 'candidate status', 'dep status', 'ds', 'dep_status'],
  sscExam: ['ssc_exam', 'ssc exam', 'ssc/equivalent'],
  sscRoll: ['ssc_roll', 'ssc roll'],
  sscGroup: ['ssc_group', 'ssc group', 'ssc_discipline', 'ssc board/discipline', 'ssc major'],
  sscBoard: ['ssc_board', 'ssc board'],
  sscBoardOther: ['ssc_board_other', 'ssc board other', 'ssc board (if other)', 'ssc other board'],
  sscGroupOther: ['ssc_group_other', 'ssc group other', 'ssc group (if other)', 'ssc other group'],
  sscResultType: ['ssc_result_type', 'ssc result type'],
  sscResult: ['ssc_result', 'ssc result', 'ssc score', 'ssc gpa', 'ssc marks'],
  sscYear: ['ssc_year', 'ssc year', 'ssc passing year'],
  hscExam: ['hsc_exam', 'hsc exam', 'hsc/equivalent'],
  hscRoll: ['hsc_roll', 'hsc roll'],
  hscGroup: ['hsc_group', 'hsc group', 'hsc_discipline', 'hsc board/discipline', 'hsc major'],
  hscBoard: ['hsc_board', 'hsc board'],
  hscBoardOther: ['hsc_board_other', 'hsc board other', 'hsc board (if other)', 'hsc other board'],
  hscGroupOther: ['hsc_group_other', 'hsc group other', 'hsc group (if other)', 'hsc other group'],
  hscResultType: ['hsc_result_type', 'hsc result type'],
  hscResult: ['hsc_result', 'hsc result', 'hsc score', 'hsc gpa', 'hsc marks'],
  hscYear: ['hsc_year', 'hsc year', 'hsc passing year'],
  graExam: ['gra_exam', 'gra exam', 'graduation exam', 'graduation level', 'graduation degree', 'graduation/equivalent', 'degree (honours/etc)'],
  graInstitute: ['gra_institute', 'gra institute', 'graduation institute', 'graduation university', 'university/institute', 'university', 'institute'],
  graSubject: ['gra_subject', 'gra subject', 'graduation subject', 'graduation major', 'subject/major', 'subject', 'major'],
  graResultType: ['gra_result_type', 'graduation result type'],
  graResult: ['gra_result', 'gra result', 'graduation result', 'graduation cgpa', 'cgpa', 'gpa'],
  graYear: ['gra_year', 'gra year', 'graduation passing year', 'graduation year'],
  graDuration: ['gra_duration', 'graduation duration', 'course duration'],
  masExam: ['mas_exam', 'mas exam', 'masters exam', 'masters level', 'masters degree'],
  masInstitute: ['mas_institute', 'mas institute', 'masters institute', 'masters university'],
  masSubject: ['mas_subject', 'mas subject', 'masters subject', 'masters major'],
  masResultType: ['mas_result_type', 'masters result type'],
  masResult: ['mas_result', 'mas result', 'masters result', 'masters cgpa'],
  masYear: ['mas_year', 'mas year', 'masters passing year', 'masters year'],
  masDuration: ['mas_duration', 'masters duration'],
  bachelor: ['bachelor', 'graduation', 'honours'],
  master: ['master', 'masters', 'post-graduation'],
  experienceComputer: ['word processing', 'email', 'fax machine', 'computer efficiency', 'experience in computer', 'efficiency in word'],
  experienceSatlipi: ['satlipi', 'typing speed', 'words per minute', 'wpm']
};

/**
 * Normalizes a string for pattern matching: lowercase, trimmed, collapsed spaces,
 * and removes punctuation like dots, dashes, etc. for fuzzy matching.
 * @param {string} value
 * @returns {string}
 */
function normalize(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[\s\.\-_,()']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a searchable text blob describing a form element (name, id,
 * placeholder, aria-label, and any associated <label> text).
 * @param {HTMLElement} element
 * @returns {string}
 */
function describeElement(element) {
  const parts = [
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label')
  ];

  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) {
      parts.push(label.textContent);
    }
  }

  const parentLabel = element.closest('label');
  if (parentLabel) {
    parts.push(parentLabel.textContent);
  }

  return normalize(parts.filter(Boolean).join(' '));
}

/**
 * Finds the profile field key that best matches a form element's description.
 * @param {string} description
 * @returns {string|null}
 */
function matchFieldKey(description) {
  for (const [fieldKey, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (description.includes(pattern)) {
        return fieldKey;
      }
    }
  }
  return null;
}

/**
 * Sets a value on a text-like input/textarea and dispatches events so
 * frameworks (React/Vue/vanilla listeners) observe the change.
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @param {string} value
 */
function setTextValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Selects a matching <option> in a <select> element by visible text or value.
 * Uses fuzzy matching to handle variations like "S.S.C" vs "SSC".
 * @param {HTMLSelectElement} element
 * @param {string} value
 * @returns {boolean} whether a match was applied
 */
function setSelectValue(element, value, expectedNumericResult) {
  const target = normalize(value);

  const applyOption = (option) => {
    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  // Exact match on text or value wins immediately (unambiguous).
  for (const option of element.options) {
    if (target === normalize(option.textContent) || target === normalize(option.value)) {
      return applyOption(option);
    }
  }

  // Ambiguous "scale" values like a bare "GPA" or "Division" can match
  // several options at once (e.g. "GPA(out of 4)" AND "GPA(out of 5)").
  // When that happens, prefer the option whose scale (the number in
  // "out of N") matches the numeric result already present/queued for
  // this field's paired result input, defaulting to the out-of-5 scale
  // used by current SSC/HSC/equivalent grading in Bangladesh.
  const isBareGpa = target === 'gpa' || target === 'cgpa';
  if (isBareGpa) {
    const candidates = Array.from(element.options).filter((option) => {
      const optText = normalize(option.textContent);
      return optText.includes('gpa') || optText.includes('cgpa');
    });
    if (candidates.length > 1) {
      // Prefer the numeric result value passed in from the profile data
      // (reliable even if the paired input hasn't been filled yet, since
      // DOM fill order may process the *_result_type select before the
      // *_result input). Fall back to reading the DOM input if present.
      let numericResult = parseFloat(expectedNumericResult);
      if (Number.isNaN(numericResult)) {
        const pairedInput = findPairedResultInput(element);
        numericResult = pairedInput ? parseFloat(pairedInput.value || pairedInput.getAttribute('value') || '') : NaN;
      }
      let preferredScale = 5;
      if (!Number.isNaN(numericResult)) {
        preferredScale = numericResult > 4 ? 5 : (numericResult <= 4 ? 4 : 5);
      }
      const scaleMatch = candidates.find((option) => normalize(option.textContent).includes(`out of ${preferredScale}`));
      if (scaleMatch) {
        return applyOption(scaleMatch);
      }
      // No explicit scale in options text matched; fall back to the
      // highest-scale GPA option (out of 5 beats out of 4) since that is
      // the current standard scale for SSC/HSC in Bangladesh.
      const sorted = candidates
        .map((option) => ({ option, scale: parseInt((normalize(option.textContent).match(/out of (\d+)/) || [])[1] || '0', 10) }))
        .sort((a, b) => b.scale - a.scale);
      if (sorted.length > 0 && sorted[0].scale > 0) {
        return applyOption(sorted[0].option);
      }
    } else if (candidates.length === 1) {
      return applyOption(candidates[0]);
    }
  }

  for (const option of element.options) {
    const optText = normalize(option.textContent);
    if (optText.includes(target) && target.length > 0) {
      return applyOption(option);
    }
  }
  // Reverse containment: handles cases where the profile value is more
  // specific/verbose than the option text, e.g. profile "GPA(out of 5.00)"
  // vs an option literally labelled "GPA(out of 5)".
  for (const option of element.options) {
    const optText = normalize(option.textContent);
    if (optText.length > 0 && target.includes(optText)) {
      return applyOption(option);
    }
  }
  return false;
}

/**
 * Given a "*_result_type" select element, locates its paired "*_result"
 * numeric input (e.g. ssc_result_type -> ssc_result) so the GPA scale
 * (out of 4 vs out of 5) can be inferred from the actual numeric value.
 * @param {HTMLSelectElement} element
 * @returns {HTMLInputElement|null}
 */
function findPairedResultInput(element) {
  const name = element.getAttribute('name') || '';
  const id = element.getAttribute('id') || '';
  const base = name.replace(/_type$/, '') || id.replace(/_type$/, '');
  if (!base) return null;
  return document.querySelector(`[name="${CSS.escape(base)}"], #${CSS.escape(base)}`);
}

/**
 * Checks a radio button whose value or label matches the given value.
 * @param {string} name
 * @param {string} value
 * @returns {boolean} whether a match was applied
 */
function setRadioValue(name, value) {
  const target = normalize(value);
  const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
  for (const radio of radios) {
    const description = describeElement(radio);
    if (description.includes(target) || normalize(radio.value) === target) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

/**
 * Resolves table-level context for an element.
 * @param {HTMLElement} element
 * @returns {object|null}
 */
function getTableContext(element) {
  const cell = element.closest('td, th');
  if (!cell) return null;

  const row = cell.closest('tr');
  if (!row) return null;

  const table = row.closest('table');
  if (!table) return null;

  const cells = Array.from(row.cells);
  const colIndex = cells.indexOf(cell);
  if (colIndex === -1) return null;

  const rowHeaderText = row.cells[0] ? row.cells[0].textContent.trim() : '';

  let headerRow = table.querySelector('thead tr');
  if (!headerRow) {
    headerRow = table.querySelector('tr');
  }

  let colHeaderText = '';
  if (headerRow && headerRow !== row) {
    const headerCells = Array.from(headerRow.cells);
    if (headerCells[colIndex]) {
      colHeaderText = headerCells[colIndex].textContent.trim();
    }
  }

  return {
    rowHeaderText,
    colHeaderText,
    colIndex
  };
}

/**
 * Resolves surrounding non-table container context.
 * @param {HTMLElement} element
 * @returns {object}
 */
function getContainerContext(element) {
  let parent = element.parentElement;
  let depth = 0;
  let sectionText = '';
  let labelText = '';

  if (element.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (labelEl) {
      labelText = labelEl.textContent.trim();
    }
  }
  if (!labelText) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      labelText = parentLabel.textContent.trim();
    }
  }

  while (parent && depth < 5) {
    const header = parent.querySelector('h1, h2, h3, h4, h5, h6, legend, .section-title, .card-header, .form-section-title');
    if (header) {
      sectionText = header.textContent.trim();
      break;
    }

    let prev = parent.previousElementSibling;
    while (prev) {
      if (/h[1-6]|legend/i.test(prev.tagName) || prev.classList.contains('section-title') || prev.classList.contains('form-section-title')) {
        sectionText = prev.textContent.trim();
        break;
      }
      prev = prev.previousElementSibling;
    }
    if (sectionText) break;

    parent = parent.parentElement;
    depth++;
  }

  return {
    sectionText,
    labelText
  };
}

/**
 * Detects the specific education level (ssc, hsc, gra, mas) from surrounding contexts.
 * @param {string} rowHeader
 * @param {string} sectionText
 * @param {string} name
 * @param {string} id
 * @param {string} labelText
 * @param {string} placeholder
 * @returns {string|null}
 */
function detectEducationLevel(rowHeader, sectionText, name, id, labelText, placeholder) {
  const combined = [rowHeader, sectionText, name, id, labelText, placeholder]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (combined.includes('master') || combined.includes('m.sc') || combined.includes('msc') || combined.includes('mba') || combined.includes('m.a') || combined.includes('ma ') || combined.includes('mas_') || combined.includes('postgraduate') || combined.includes('post-graduate') || combined.includes('m.com') || combined.includes('mcom')) {
    return 'mas';
  }

  if (combined.includes('graduation') || combined.includes('bachelor') || combined.includes('honours') || combined.includes('honors') || combined.includes('gra_') || combined.includes('b.sc') || combined.includes('bsc') || combined.includes('b.a') || (/\bba\b/).test(combined) || combined.includes('bba') || combined.includes('b.com') || combined.includes('bcom') || combined.includes('undergraduate') || combined.includes('engineering') || combined.includes('engg') || combined.includes('degree')) {
    if (combined.includes('ssc') || combined.includes('hsc') || combined.includes('secondary')) {
      if (!combined.includes('graduation') && !combined.includes('bachelor') && !combined.includes('honours') && !combined.includes('gra_')) {
        // Continue to check other levels
      } else {
        return 'gra';
      }
    } else {
      return 'gra';
    }
  }

  if (combined.includes('hsc') || combined.includes('higher secondary') || combined.includes('intermediate') || combined.includes('alim') || combined.includes('a level') || combined.includes('a-level')) {
    return 'hsc';
  }

  if (combined.includes('ssc') || combined.includes('secondary school') || combined.includes('matric') || combined.includes('dakhil') || combined.includes('o level') || combined.includes('o-level')) {
    return 'ssc';
  }

  return null;
}

/**
 * Detects the education field type from the column, label, names, and IDs.
 * @param {string} colHeader
 * @param {string} labelText
 * @param {string} name
 * @param {string} id
 * @param {string} placeholder
 * @param {string} level
 * @returns {string|null}
 */
function detectEducationFieldType(colHeader, labelText, name, id, placeholder, level) {
  // Check name/id explicitly first — they are the most reliable signals and
  // avoid false positives from column headers like "Result Type & Score" that
  // would otherwise cause a plain result input to be classified as resultType.
  const nameIdLower = [name, id].filter(Boolean).join(' ').toLowerCase();

  // Explicit "other" board/group text boxes (shown when the board/group
  // selected is "Other") must be detected before the generic board/group
  // checks below, otherwise they'd resolve to sscBoard/sscGroup and clobber
  // the real board/group field.
  if (nameIdLower.match(/board_?other|other_?board/)) {
    return 'boardOther';
  }
  if (nameIdLower.match(/group_?other|other_?group|subject_?other|other_?subject/)) {
    return 'groupOther';
  }

  if (nameIdLower.match(/result_?type|gradetype/)) {
    return 'resultType';
  }
  // Matches ssc_result, sscResult, ssc_result_score, ssc_result_value, etc.
  // (not just an exact "_result" suffix) so merged column headers like
  // "Result Type & Score" can't hijack the plain score/result input.
  if (nameIdLower.match(/result/) && !nameIdLower.match(/result_?type/)) {
    return 'result';
  }
  if (nameIdLower.match(/\bboard\b/) || nameIdLower.match(/\binstitute\b/) || nameIdLower.match(/\buniversity\b/)) {
    return (level === 'ssc' || level === 'hsc') ? 'board' : 'institute';
  }
  if (nameIdLower.match(/\broll\b/) || nameIdLower.match(/\bindex\b/) || nameIdLower.match(/\bsymbol\b/)) {
    return 'roll';
  }
  if (nameIdLower.match(/\byear\b/) || nameIdLower.match(/passing_?year/)) {
    return 'year';
  }
  if (nameIdLower.match(/\bduration\b/)) {
    return 'duration';
  }
  if (nameIdLower.match(/\bgroup\b/) || nameIdLower.match(/\bsubject\b/) || nameIdLower.match(/\bmajor\b/) || nameIdLower.match(/\bdiscipline\b/)) {
    return (level === 'ssc' || level === 'hsc') ? 'group' : 'subject';
  }
  if (nameIdLower.match(/\bexam\b/) || nameIdLower.match(/\bdegree\b/)) {
    return 'exam';
  }

  const combined = [colHeader, labelText, name, id, placeholder]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (combined.includes('result type') || combined.includes('grading') || combined.includes('gpa type') || combined.includes('result_type') || combined.includes('scale') || combined.includes('class/division')) {
    return 'resultType';
  }

  if (combined.includes('board') || combined.includes('university') || combined.includes('institute') || combined.includes('institution') || combined.includes('school') || combined.includes('college') || combined.includes('varsity')) {
    if (level === 'ssc' || level === 'hsc') {
      return 'board';
    } else {
      return 'institute';
    }
  }

  if (combined.includes('roll') || combined.includes('index') || combined.includes('symbol')) {
    return 'roll';
  }

  if (combined.includes('result') || combined.includes('cgpa') || combined.includes('gpa') || combined.includes('grade') || combined.includes('score') || combined.includes('marks') || combined.includes('division') || combined.includes('class')) {
    return 'result';
  }

  if (combined.includes('year') || combined.includes('passing') || combined.includes('pass_year') || combined.includes('passing_year')) {
    return 'year';
  }

  if (combined.includes('duration') || combined.includes('course duration')) {
    return 'duration';
  }

  if (combined.includes('group') || combined.includes('subject') || combined.includes('major') || combined.includes('discipline') || combined.includes('department') || combined.includes('stream') || combined.includes('branch')) {
    if (level === 'ssc' || level === 'hsc') {
      return 'group';
    } else {
      return 'subject';
    }
  }

  if (combined.includes('exam') || combined.includes('degree') || combined.includes('examination') || combined.includes('title') || combined.includes('course')) {
    return 'exam';
  }

  return null;
}

/**
 * Smartly resolves field keys for the Education/Graduation section by analyzing
 * table structures, headers, labels, and surrounding DOM context.
 * @param {HTMLElement} element
 * @returns {string|null}
 */
function resolveEducationFieldKey(element) {
  const tableCtx = getTableContext(element);
  const containerCtx = getContainerContext(element);

  const rowHeader = tableCtx ? tableCtx.rowHeaderText : '';
  const colHeader = tableCtx ? tableCtx.colHeaderText : '';
  const sectionText = containerCtx ? containerCtx.sectionText : '';
  const labelText = containerCtx ? containerCtx.labelText : '';

  const name = element.getAttribute('name') || '';
  const id = element.getAttribute('id') || '';
  const placeholder = element.getAttribute('placeholder') || '';

  const level = detectEducationLevel(rowHeader, sectionText, name, id, labelText, placeholder);
  if (!level) return null;

  const fieldType = detectEducationFieldType(colHeader, labelText, name, id, placeholder, level);
  if (!fieldType) return null;

  const resolvedKey = `${level}${fieldType.charAt(0).toUpperCase()}${fieldType.slice(1)}`;

  const validEducationKeys = [
    'sscExam', 'sscRoll', 'sscGroup', 'sscGroupOther', 'sscBoard', 'sscBoardOther', 'sscResultType', 'sscResult', 'sscYear',
    'hscExam', 'hscRoll', 'hscGroup', 'hscGroupOther', 'hscBoard', 'hscBoardOther', 'hscResultType', 'hscResult', 'hscYear',
    'graExam', 'graInstitute', 'graSubject', 'graResultType', 'graResult', 'graYear', 'graDuration',
    'masExam', 'masInstitute', 'masSubject', 'masResultType', 'masResult', 'masYear', 'masDuration'
  ];

  if (validEducationKeys.includes(resolvedKey)) {
    return resolvedKey;
  }

  return null;
}

/**
 * Resolves a profile field key for a form element: tries the smart education
 * field resolver, then falls back to Teletalk exact name/id map first (when the
 * active hostname qualifies), then falls back to generic label-text matching.
 * @param {HTMLElement} element
 * @returns {string|null}
 */
function resolveFieldKey(element) {
  const eduKey = resolveEducationFieldKey(element);
  if (eduKey) {
    return eduKey;
  }

  if (typeof isTeletalkHostname === 'function' && isTeletalkHostname(window.location.hostname)) {
    const exactKey = resolveTeletalkFieldKey(element.getAttribute('name'), element.getAttribute('id'));
    if (exactKey) {
      return exactKey;
    }
  }
  return matchFieldKey(describeElement(element));
}

/**
 * Special handling for specific form fields that need extra logic.
 * @param {HTMLElement} element
 * @param {object} profileData
 * @param {Array} filledFields
 * @returns {boolean} whether the field was handled and filled
 */
function handleSpecialFields(element, profileData, filledFields) {
  const name = element.getAttribute('name');
  const id = element.getAttribute('id');

  if (name === 'nid' || id === 'nid') {
    const hasNid = profileData.nidNo && profileData.nidNo.trim() !== '';
    const valueToSet = hasNid ? '1' : '0';
    const option = Array.from(element.options).find(opt => opt.value === valueToSet);
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledFields.push({ key: 'nid', label: 'Have National ID?', value: valueToSet === '1' ? 'Yes' : 'No' });
      return true;
    }
  }

  if (name === 'breg' || id === 'breg') {
    const hasBreg = profileData.birthRegNo && profileData.birthRegNo.trim() !== '';
    const valueToSet = hasBreg ? '1' : '0';
    const option = Array.from(element.options).find(opt => opt.value === valueToSet);
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledFields.push({ key: 'breg', label: 'Have Birth Registration?', value: valueToSet === '1' ? 'Yes' : 'No' });
      return true;
    }
  }

  if (name === 'passport' || id === 'passport') {
    const hasPassport = profileData.passportNo && profileData.passportNo.trim() !== '';
    const valueToSet = hasPassport ? '1' : '0';
    const option = Array.from(element.options).find(opt => opt.value === valueToSet);
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledFields.push({ key: 'passport', label: 'Have Passport?', value: valueToSet === '1' ? 'Yes' : 'No' });
      return true;
    }
  }

  if (name === 'same_as_present' || id === 'same_as_present') {
    if (profileData.sameAsPresent) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledFields.push({ key: 'same_as_present', label: 'Same as Present Address', value: 'Yes' });
      return true;
    }
  }

  // Graduation "If Applicable" checkbox — matches common name/id variants.
  // Ticks automatically when any graduation-level data exists in the profile.
  const isGraApplicable =
    name === 'if_applicable_gra' || id === 'if_applicable_gra' ||
    name === 'gra_applicable'    || id === 'gra_applicable'    ||
    name === 'graduation_applicable' || id === 'graduation_applicable' ||
    name === 'bachelor_applicable'   || id === 'bachelor_applicable';
  if (isGraApplicable) {
    const hasGraData =
      (profileData.graExam    && profileData.graExam.trim()    !== '') ||
      (profileData.graInstitute && profileData.graInstitute.trim() !== '') ||
      (profileData.bachelor   && profileData.bachelor.trim()   !== '');
    if (hasGraData) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledFields.push({ key: 'if_applicable_gra', label: 'Graduation Level Applicable', value: 'Yes' });
      return true;
    }
  }

  // Masters "If Applicable" checkbox — matches common name/id variants.
  // Ticks automatically when any masters-level data exists in the profile.
  const isMasApplicable =
    name === 'if_applicable_mas' || id === 'if_applicable_mas' ||
    name === 'mas_applicable'    || id === 'mas_applicable'    ||
    name === 'masters_applicable'|| id === 'masters_applicable'||
    name === 'master_applicable' || id === 'master_applicable';
  if (isMasApplicable) {
    const hasMasData =
      (profileData.masExam    && profileData.masExam.trim()    !== '') ||
      (profileData.masInstitute && profileData.masInstitute.trim() !== '') ||
      (profileData.master     && profileData.master.trim()     !== '');
    if (hasMasData) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledFields.push({ key: 'if_applicable_mas', label: 'Masters Level Applicable', value: 'Yes' });
      return true;
    }
  }

  if (name === 'agree' || id === 'agree') {
    element.checked = true;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    filledFields.push({ key: 'agree', label: 'Agree to Declaration', value: 'Yes' });
    return true;
  }

  return false;
}

/**
 * Maps field keys to a user-friendly English label for display in the feedback toast.
 * @param {string} fieldKey
 * @param {HTMLElement} [element]
 * @returns {string}
 */
function getFieldLabel(fieldKey, element) {
  const keyToFriendlyName = {
    fullName: 'Applicant Name (English)',
    nameBn: 'Applicant Name (Bangla)',
    fatherName: "Father's Name (English)",
    fatherBn: "Father's Name (Bangla)",
    motherName: "Mother's Name (English)",
    motherBn: "Mother's Name (Bangla)",
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    nidNo: 'National ID Number',
    birthRegNo: 'Birth Registration Number',
    passportNo: 'Passport Number',
    mobile: 'Mobile Number',
    mobileConfirm: 'Confirm Mobile Number',
    email: 'Email Address',
    presentCareOf: 'Present Address: Care of',
    presentAddress: 'Present Address: Village',
    presentDistrict: 'Present Address: District',
    presentUpazila: 'Present Address: Upazila/P.S.',
    presentPost: 'Present Address: Post Office',
    presentPostcode: 'Present Address: Post Code',
    permanentCareOf: 'Permanent Address: Care of',
    permanentAddress: 'Permanent Address: Village',
    permanentDistrict: 'Permanent Address: District',
    permanentUpazila: 'Permanent Address: Upazila/P.S.',
    permanentPost: 'Permanent Address: Post Office',
    permanentPostcode: 'Permanent Address: Post Code',
    fatherOccupation: "Father's Occupation",
    religion: 'Religion',
    nationality: 'Nationality',
    maritalStatus: 'Marital Status',
    spouseName: "Spouse's Name",
    bloodGroup: 'Blood Group',
    quota: 'Quota',
    depStatus: 'Departmental Candidate Status',
    sscExam: 'SSC Exam Name',
    sscRoll: 'SSC Roll Number',
    sscGroup: 'SSC Group',
    sscBoard: 'SSC Board',
    sscBoardOther: 'SSC Board (Other)',
    sscGroupOther: 'SSC Group (Other)',
    sscResultType: 'SSC Result Type',
    sscResult: 'SSC Result',
    sscYear: 'SSC Passing Year',
    hscExam: 'HSC Exam Name',
    hscRoll: 'HSC Roll Number',
    hscGroup: 'HSC Group',
    hscBoard: 'HSC Board',
    hscBoardOther: 'HSC Board (Other)',
    hscGroupOther: 'HSC Group (Other)',
    hscResultType: 'HSC Result Type',
    hscResult: 'HSC Result',
    hscYear: 'HSC Passing Year',
    graExam: 'Graduation Level',
    graInstitute: 'Graduation University',
    graSubject: 'Graduation Subject',
    graResultType: 'Graduation Result Type',
    graResult: 'Graduation Result/CGPA',
    graYear: 'Graduation Passing Year',
    graDuration: 'Graduation Duration',
    masExam: 'Masters Level',
    masInstitute: 'Masters University',
    masSubject: 'Masters Subject',
    masResultType: 'Masters Result Type',
    masResult: 'Masters Result/CGPA',
    masYear: 'Masters Passing Year',
    masDuration: 'Masters Duration',
    experienceComputer: 'Computer Experience',
    experienceSatlipi: 'Shorthand Speed'
  };

  if (keyToFriendlyName[fieldKey]) {
    return keyToFriendlyName[fieldKey];
  }

  if (element && element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label && label.textContent.trim()) {
      return label.textContent.trim().replace(/\s+/g, ' ');
    }
  }
  const parentLabel = element ? element.closest('label') : null;
  if (parentLabel && parentLabel.textContent.trim()) {
    return parentLabel.textContent.trim().replace(/\s+/g, ' ');
  }

  return fieldKey;
}

/**
 * Fills all matchable form fields on the page using the given profile.
 * @param {Record<string, string>} profileData
 * @returns {{filledCount: number, filledFields: Array<{key: string, label: string, value: string}>}}
 */
function fillForm(profileData) {
  let filledCount = 0;
  const seenRadioNames = new Set();
  const filledFields = [];

  const formElements = document.querySelectorAll('input, select, textarea');

  for (const element of formElements) {
    const type = (element.getAttribute('type') || '').toLowerCase();

    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'file' || element.disabled) {
      continue;
    }

    if (handleSpecialFields(element, profileData, filledFields)) {
      filledCount++;
      continue;
    }

    // Check custom fields first for highest flexibility/override capability
    if (Array.isArray(profileData.customFields)) {
      const description = describeElement(element);
      const nameVal = (element.getAttribute('name') || '').toLowerCase();
      const idVal = (element.getAttribute('id') || '').toLowerCase();
      
      let foundCustom = false;
      for (const customField of profileData.customFields) {
        if (!customField.key) continue;
        const normKey = normalize(customField.key);
        if (description.includes(normKey) || (nameVal && nameVal.includes(normKey)) || (idVal && idVal.includes(normKey))) {
          if (type === 'radio') {
            const name = element.getAttribute('name');
            if (name && !seenRadioNames.has(name)) {
              if (setRadioValue(name, customField.value)) {
                filledCount += 1;
                seenRadioNames.add(name);
                if (!filledFields.some(f => f.key === customField.key)) {
                  filledFields.push({ key: customField.key, label: customField.key, value: customField.value });
                }
                foundCustom = true;
                break;
              }
            }
          } else if (element.tagName === 'SELECT') {
            if (setSelectValue(element, customField.value)) {
              filledCount += 1;
              if (!filledFields.some(f => f.key === customField.key)) {
                filledFields.push({ key: customField.key, label: customField.key, value: customField.value });
              }
              foundCustom = true;
              break;
            }
          } else {
            setTextValue(element, customField.value);
            filledCount += 1;
            if (!filledFields.some(f => f.key === customField.key)) {
              filledFields.push({ key: customField.key, label: customField.key, value: customField.value });
            }
            foundCustom = true;
            break;
          }
        }
      }
      if (foundCustom) {
        continue;
      }
    }

    if (type === 'radio') {
      const name = element.getAttribute('name');
      if (!name || seenRadioNames.has(name)) {
        continue;
      }
      const fieldKey = resolveFieldKey(element) || matchFieldKey(name.toLowerCase());
      const profileValue = fieldKey ? profileData[fieldKey] : undefined;
      if (profileValue && setRadioValue(name, profileValue)) {
        filledCount += 1;
        seenRadioNames.add(name);
        if (!filledFields.some(f => f.key === fieldKey)) {
          filledFields.push({ key: fieldKey, label: getFieldLabel(fieldKey, element), value: profileValue });
        }
      }
      continue;
    }

    if (type === 'checkbox') {
      continue;
    }

    const fieldKey = resolveFieldKey(element);
    if (!fieldKey) {
      continue;
    }

    const profileValue = profileData[fieldKey];
    if (profileValue === undefined || profileValue === null || profileValue === '') {
      continue;
    }

    if (element.tagName === 'SELECT') {
      // For *ResultType selects (sscResultType, hscResultType, etc.), pass
      // along the paired numeric result (sscResult, hscResult, etc.) so a
      // bare "GPA" value can be resolved to the correct out-of-4/out-of-5
      // option instead of ambiguously matching the first "GPA" option.
      const pairedResultKey = fieldKey.endsWith('ResultType') ? fieldKey.replace(/ResultType$/, 'Result') : null;
      const pairedResultValue = pairedResultKey ? profileData[pairedResultKey] : undefined;
      if (setSelectValue(element, profileValue, pairedResultValue)) {
        filledCount += 1;
        if (!filledFields.some(f => f.key === fieldKey)) {
          filledFields.push({ key: fieldKey, label: getFieldLabel(fieldKey, element), value: profileValue });
        }
      }
      continue;
    }

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      setTextValue(element, profileValue);
      filledCount += 1;
      if (!filledFields.some(f => f.key === fieldKey)) {
        filledFields.push({ key: fieldKey, label: getFieldLabel(fieldKey, element), value: profileValue });
      }
    }
  }

  // Select elements (Upazila/P.S., Result Type, etc.) are frequently populated
  // asynchronously — either on a timer or in response to another field's
  // 'change' event (e.g. choosing a Board/Exam loads that board's grading
  // scale options for Result Type). Fixed delays can miss slow loads, so in
  // addition to a couple of fallback timers we watch the DOM and retry the
  // moment new <option> elements actually show up.
  setTimeout(() => {
    retrySelectElements(profileData);
  }, 200);

  setTimeout(() => {
    retrySelectElements(profileData);
  }, 600);

  setTimeout(() => {
    retrySelectElements(profileData);
  }, 1500);

  observeSelectsAndRetry(profileData);

  return { filledCount, filledFields };
}

/**
 * Watches the page for newly-inserted <option> elements (a sign that a
 * <select>'s choices were just populated asynchronously) and immediately
 * retries filling select elements when that happens. Auto-disconnects after
 * a few seconds so it doesn't run indefinitely.
 * @param {object} profileData
 */
function observeSelectsAndRetry(profileData) {
  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    const sawNewOptions = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(
        (node) => node.nodeName === 'OPTION' || (node.querySelectorAll && node.querySelectorAll('option').length > 0)
      )
    );
    if (!sawNewOptions) {
      return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      retrySelectElements(profileData);
    }, 120);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    clearTimeout(debounceTimer);
    observer.disconnect();
  }, 8000);
}

/**
 * Re-attempts to set values for select elements. Necessary for fields
 * like Upazila/P.S. that are loaded dynamically based on District selection.
 * @param {object} profileData
 */
function retrySelectElements(profileData) {
  const selectElements = document.querySelectorAll('select');
  for (const element of selectElements) {
    if (element.disabled) {
      continue;
    }
    const fieldKey = resolveFieldKey(element);
    if (!fieldKey) {
      // Also retry custom fields
      if (Array.isArray(profileData.customFields)) {
        const description = describeElement(element);
        const nameVal = (element.getAttribute('name') || '').toLowerCase();
        const idVal = (element.getAttribute('id') || '').toLowerCase();
        for (const customField of profileData.customFields) {
          if (!customField.key) continue;
          const normKey = normalize(customField.key);
          if (description.includes(normKey) || (nameVal && nameVal.includes(normKey)) || (idVal && idVal.includes(normKey))) {
            setSelectValue(element, customField.value);
            break;
          }
        }
      }
      continue;
    }
    const profileValue = profileData[fieldKey];
    if (profileValue !== undefined && profileValue !== null && profileValue !== '') {
      const pairedResultKey = fieldKey.endsWith('ResultType') ? fieldKey.replace(/ResultType$/, 'Result') : null;
      const pairedResultValue = pairedResultKey ? profileData[pairedResultKey] : undefined;
      setSelectValue(element, profileValue, pairedResultValue);
    }
  }
}

// Handle PING (readiness check) and AUTOFILL_PAGE messages from the popup.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }

  if (!message || message.type !== 'AUTOFILL_PAGE') {
    return false;
  }

  try {
    const { filledCount, filledFields } = fillForm(message.payload || {});
    sendResponse({ ok: true, data: { filledCount, filledFields } });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  }

  return false;
});
