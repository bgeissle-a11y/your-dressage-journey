const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const files = {
  main: path.join(BASE, 'comprehensive_dressage_test_database.json'),
  intro_training: path.join(BASE, 'dressage tests', 'usdf_intro_training_tests.json'),
  first: path.join(BASE, 'dressage tests', 'usdf_first_level_tests.json'),
  second_third_fourth: path.join(BASE, 'dressage tests', 'usdf_tests_second_third_fourth.json'),
  freestyle: path.join(BASE, 'dressage tests', 'usdf_freestyle_tests.json'),
  fei: path.join(BASE, 'dressage tests', 'fei_test_database_complete.json'),
};

const parsed = {};
for (const [key, filepath] of Object.entries(files)) {
  parsed[key] = JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

// ========== TV-1.2: SCHEMA CONSISTENCY ==========
console.log('\n========== TV-1.2: SCHEMA CONSISTENCY ==========');

// Collect all test_ids from detail files
const allTestIds = [];

// --- intro_training ---
console.log('\n--- usdf_intro_training_tests.json ---');
const it = parsed.intro_training;
console.log('Has metadata section:', !!it.metadata ? 'PASS' : 'FAIL');
console.log('Has tests array:', Array.isArray(it.tests) ? 'PASS' : 'FAIL');
console.log('Test count:', it.tests.length);
for (const t of it.tests) {
  allTestIds.push(t.test_id);
  const issues = [];
  if (!t.test_id) issues.push('no test_id');
  if (!t.name) issues.push('no name');
  if (!t.level) issues.push('no level');
  if (!t.test_info) issues.push('no test_info');
  if (!t.test_info || typeof t.test_info.max_points !== 'number') issues.push('no numeric max_points');
  if (!t.purpose) issues.push('no purpose');
  if (!Array.isArray(t.movements)) issues.push('no movements array');
  else {
    for (const m of t.movements) {
      if (typeof m.number !== 'number') issues.push('mvmt ' + m.number + ': number not numeric');
      if (!('marker' in m)) issues.push('mvmt ' + m.number + ': no marker');
      if (!('description' in m)) issues.push('mvmt ' + m.number + ': no description');
      if (!('directives' in m)) issues.push('mvmt ' + m.number + ': no directives');
      if (!('coefficient' in m)) issues.push('mvmt ' + m.number + ': no coefficient');
    }
  }
  console.log('  ' + t.test_id + ': ' + (issues.length === 0 ? 'PASS' : 'ISSUES: ' + issues.join('; ')));
}

// --- first ---
console.log('\n--- usdf_first_level_tests.json ---');
const fl = parsed.first;
console.log('Has metadata section:', !!fl.metadata ? 'PASS' : 'FAIL');
console.log('Has tests array:', Array.isArray(fl.tests) ? 'PASS' : 'FAIL');
console.log('Test count:', fl.tests.length);
for (const t of fl.tests) {
  allTestIds.push(t.test_id);
  const issues = [];
  if (!t.test_id) issues.push('no test_id');
  if (!t.name) issues.push('no name');
  if (!t.level) issues.push('no level');
  if (!t.test_info) issues.push('no test_info');
  if (!t.test_info || typeof t.test_info.max_points !== 'number') issues.push('no numeric max_points');
  if (!t.purpose) issues.push('no purpose');
  if (!Array.isArray(t.movements)) { issues.push('no movements array'); }
  else {
    // First level uses 'movement' and 'directive' keys
    const m0 = t.movements[0];
    const fieldNames = Object.keys(m0);
    if ('movement' in m0 && !('description' in m0)) {
      issues.push('SCHEMA DIFF: uses "movement" instead of "description"');
    }
    if ('directive' in m0 && !('directives' in m0)) {
      issues.push('SCHEMA DIFF: uses "directive" (singular) instead of "directives"');
    }
    if (!('marker' in m0) && 'marker' in m0 === false) {
      issues.push('SCHEMA DIFF: missing "marker"');
    }
    console.log('    Movement field names: ' + fieldNames.join(', '));
    for (const m of t.movements) {
      if (typeof m.number !== 'number') issues.push('mvmt ' + m.number + ': number not numeric');
      if (!('coefficient' in m)) issues.push('mvmt ' + m.number + ': no coefficient');
    }
  }
  console.log('  ' + t.test_id + ': ' + (issues.length === 0 ? 'PASS' : issues.join('; ')));
}

// --- second/third/fourth ---
console.log('\n--- usdf_tests_second_third_fourth.json ---');
const stf = parsed.second_third_fourth;
console.log('Has metadata section (database_info):', !!stf.database_info ? 'PASS' : 'FAIL');
console.log('Tests is object (not array):', typeof stf.tests === 'object' && !Array.isArray(stf.tests) ? 'YES - SCHEMA DIFF' : 'array');
const stfKeys = Object.keys(stf.tests);
console.log('Test count:', stfKeys.length);

// Map stf keys to expected test_ids
const stfIdMap = {
  'second_level_test_1': '2023_second_1',
  'second_level_test_2': '2023_second_2',
  'second_level_test_3': '2023_second_3',
  'third_level_test_1': '2023_third_1',
  'third_level_test_2': '2023_third_2',
  'third_level_test_3': '2023_third_3',
  'fourth_level_test_1': '2023_fourth_1',
  'fourth_level_test_2': '2023_fourth_2',
  'fourth_level_test_3': '2023_fourth_3',
};

for (const key of stfKeys) {
  const t = stf.tests[key];
  const issues = [];

  // These tests don't have test_id fields - they use object keys
  if (!('test_id' in t)) {
    issues.push('NO test_id field (uses object key "' + key + '" instead)');
  }
  // Add the mapped test_id
  allTestIds.push(stfIdMap[key] || key);

  if (!t.metadata) issues.push('no metadata');
  else {
    if (!t.metadata.name) issues.push('no name');
    if (!t.metadata.level) issues.push('no level');
    if (typeof t.metadata.maximum_points !== 'number') issues.push('SCHEMA DIFF: uses "maximum_points" instead of "max_points"');
    if (!t.metadata.purpose) issues.push('no purpose');
  }
  if (!Array.isArray(t.movements)) { issues.push('no movements array'); }
  else {
    const m0 = t.movements[0];
    const fieldNames = Object.keys(m0);
    if ('movement' in m0 && !('description' in m0)) {
      issues.push('SCHEMA DIFF: uses "movement" instead of "description"');
    }
    if ('directive' in m0 && !('directives' in m0)) {
      issues.push('SCHEMA DIFF: uses "directive" (singular) instead of "directives"');
    }
    if ('location' in m0 && !('marker' in m0)) {
      issues.push('SCHEMA DIFF: uses "location" instead of "marker"');
    }
    console.log('    Movement field names: ' + fieldNames.join(', '));
    for (const m of t.movements) {
      if (typeof m.number !== 'number') issues.push('mvmt ' + m.number + ': number not numeric');
      if (!('coefficient' in m)) issues.push('mvmt ' + m.number + ': no coefficient');
    }
  }
  console.log('  ' + key + ': ' + (issues.length === 0 ? 'PASS' : issues.join('; ')));
}

// --- freestyle ---
console.log('\n--- usdf_freestyle_tests.json ---');
const frs = parsed.freestyle;
console.log('Has metadata section:', !!frs.metadata ? 'PASS' : 'FAIL');
console.log('Has tests array:', Array.isArray(frs.tests) ? 'PASS' : 'FAIL');
console.log('Test count:', frs.tests.length);
for (const t of frs.tests) {
  allTestIds.push(t.test_id);
  const issues = [];
  if (!t.test_id) issues.push('no test_id');
  if (!t.name) issues.push('no name');
  if (!t.level) issues.push('no level');
  if (!t.test_info) issues.push('no test_info');
  if (t.purpose) issues.push('NOTE: has purpose field');
  if (Array.isArray(t.movements)) issues.push('NOTE: has movements array (freestyle)');
  if (!Array.isArray(t.compulsory_elements)) issues.push('no compulsory_elements');
  else {
    for (const e of t.compulsory_elements) {
      if (typeof e.number !== 'number') issues.push('elem ' + e.number + ': number not numeric');
      if (!('description' in e)) issues.push('elem ' + e.number + ': no description');
      if (!('coefficient' in e)) issues.push('elem ' + e.number + ': no coefficient');
    }
  }
  // Check max points fields
  if (t.test_info) {
    if (!('max_points' in t.test_info) && !('max_total_points' in t.test_info)) {
      issues.push('SCHEMA DIFF: no max_points (uses max_total_points instead)');
    }
    if ('max_total_points' in t.test_info && !('max_points' in t.test_info)) {
      issues.push('SCHEMA DIFF: uses "max_total_points" instead of "max_points"');
    }
  }
  console.log('  ' + t.test_id + ': ' + (issues.length === 0 ? 'PASS' : issues.join('; ')));
}

// --- FEI ---
console.log('\n--- fei_test_database_complete.json ---');
const fei = parsed.fei;
const feiKeys = Object.keys(fei);
console.log('Has top-level test keys (no metadata wrapper):', 'YES - DIFFERENT SCHEMA');
console.log('Test count:', feiKeys.length);
for (const key of feiKeys) {
  allTestIds.push(key);
  const t = fei[key];
  const issues = [];
  if (!t.testName) issues.push('no testName');
  else issues.push('SCHEMA DIFF: uses "testName" instead of "name"');
  if (!t.level) issues.push('no level');
  if (typeof t.totalPoints !== 'number') issues.push('no numeric totalPoints');
  else issues.push('SCHEMA DIFF: uses "totalPoints" instead of "max_points"');
  if (!t.requiredMovements) issues.push('no requiredMovements');
  else issues.push('SCHEMA DIFF: uses "requiredMovements" object instead of "movements" array');
  if (!Array.isArray(t.movements)) issues.push('NOTE: No movements array (uses requiredMovements by gait instead)');
  if (!Array.isArray(t.coefficientMovements)) issues.push('no coefficientMovements array');
  else issues.push('coefficientMovements is array of numbers (movement indices)');
  console.log('  ' + key + ' (' + (t.testName || 'unnamed') + '): ' + issues.join('; '));
}

// ========== TV-1.3: CROSS-REFERENCE INTEGRITY ==========
console.log('\n\n========== TV-1.3: CROSS-REFERENCE INTEGRITY ==========');

const main = parsed.main;

// Check external_files filenames
console.log('\n--- External File References ---');
const actualFiles = fs.readdirSync(path.join(BASE, 'dressage tests')).filter(f => f.endsWith('.json'));
console.log('Actual files in dressage tests/:', actualFiles.join(', '));

for (const ref of main.external_files.files) {
  const exists = actualFiles.includes(ref.filename);
  console.log('  ' + ref.filename + ': ' + (exists ? 'PASS - exists' : 'FAIL - NOT FOUND'));
}

// Specifically check the known mismatch
console.log('\n--- Known filename mismatch check ---');
console.log('Main file references: "usdf_second_third_fourth_tests.json"');
console.log('Actual file name: "usdf_tests_second_third_fourth.json"');
const refName = 'usdf_second_third_fourth_tests.json';
const actualName = 'usdf_tests_second_third_fourth.json';
console.log('Reference matches actual: ' + (actualFiles.includes(refName) ? 'YES' : 'NO - MISMATCH CONFIRMED'));

// Check test_ids cross-reference
console.log('\n--- Test ID Cross-Reference ---');
const mainStdIds = main.test_categories.usdf_standard_tests.test_ids;
const mainFreeIds = main.test_categories.usdf_freestyle_tests.test_ids;
const mainFeiIds = main.test_categories.fei_tests.test_ids;
const allMainIds = [...mainStdIds, ...mainFreeIds, ...mainFeiIds];

console.log('Main file lists ' + mainStdIds.length + ' standard test_ids');
console.log('Main file lists ' + mainFreeIds.length + ' freestyle test_ids');
console.log('Main file lists ' + mainFeiIds.length + ' FEI test_ids');
console.log('Total in main: ' + allMainIds.length);
console.log('Total found in detail files: ' + allTestIds.length);

// Check each main id exists in detail files
console.log('\nChecking standard test_ids:');
for (const id of mainStdIds) {
  const found = allTestIds.includes(id);
  if (!found) console.log('  FAIL: ' + id + ' NOT FOUND in detail files');
}
const stdMissing = mainStdIds.filter(id => !allTestIds.includes(id));
console.log(stdMissing.length === 0 ? '  All ' + mainStdIds.length + ' standard IDs found: PASS' : '  MISSING: ' + stdMissing.join(', '));

console.log('\nChecking freestyle test_ids:');
for (const id of mainFreeIds) {
  const found = allTestIds.includes(id);
  if (!found) console.log('  FAIL: ' + id + ' NOT FOUND in detail files');
}
const freeMissing = mainFreeIds.filter(id => !allTestIds.includes(id));
console.log(freeMissing.length === 0 ? '  All ' + mainFreeIds.length + ' freestyle IDs found: PASS' : '  MISSING: ' + freeMissing.join(', '));

console.log('\nChecking FEI test_ids:');
for (const id of mainFeiIds) {
  const found = allTestIds.includes(id);
  if (!found) console.log('  FAIL: ' + id + ' NOT FOUND in detail files');
}
const feiMissing = mainFeiIds.filter(id => !allTestIds.includes(id));
console.log(feiMissing.length === 0 ? '  All ' + mainFeiIds.length + ' FEI IDs found: PASS' : '  MISSING: ' + feiMissing.join(', '));

// Check test counts
console.log('\n--- Test Count Verification ---');
const mainCounts = main.database_metadata.test_count;
// Count actual tests
const actualStd = it.tests.length + fl.tests.length + stfKeys.length;
const actualFree = frs.tests.length;
const actualFei = feiKeys.length;
const actualTotal = actualStd + actualFree + actualFei;

console.log('usdf_standard: main says ' + mainCounts.usdf_standard + ', actual: ' + actualStd + ' -> ' + (mainCounts.usdf_standard === actualStd ? 'PASS' : 'FAIL'));
console.log('usdf_freestyle: main says ' + mainCounts.usdf_freestyle + ', actual: ' + actualFree + ' -> ' + (mainCounts.usdf_freestyle === actualFree ? 'PASS' : 'FAIL'));
console.log('fei: main says ' + mainCounts.fei + ', actual: ' + actualFei + ' -> ' + (mainCounts.fei === actualFei ? 'PASS' : 'FAIL'));
console.log('total: main says ' + mainCounts.total + ', actual: ' + actualTotal + ' -> ' + (mainCounts.total === actualTotal ? 'PASS' : 'FAIL'));

// Check external_files test_count
console.log('\n--- External File Test Count Verification ---');
for (const ref of main.external_files.files) {
  let actualCount;
  if (ref.filename === 'usdf_intro_training_tests.json') actualCount = it.tests.length;
  else if (ref.filename === 'usdf_first_level_tests.json') actualCount = fl.tests.length;
  else if (ref.filename === 'usdf_second_third_fourth_tests.json') actualCount = stfKeys.length;
  else if (ref.filename === 'usdf_freestyle_tests.json') actualCount = frs.tests.length;
  else if (ref.filename === 'fei_test_database_complete.json') actualCount = feiKeys.length;
  else actualCount = '?';
  console.log('  ' + ref.filename + ': claims ' + ref.test_count + ', actual: ' + actualCount + ' -> ' + (ref.test_count === actualCount ? 'PASS' : 'FAIL'));
}


// ========== TV-1.4: DATA TYPE VERIFICATION ==========
console.log('\n\n========== TV-1.4: DATA TYPE VERIFICATION ==========');

// Check coefficients are null or numeric
console.log('\n--- Coefficient Type Check ---');
let coeffIssues = [];

function checkCoefficients(testLabel, movements, descField, coefField) {
  for (const m of movements) {
    const coef = m[coefField || 'coefficient'];
    if (coef !== null && typeof coef !== 'number') {
      coeffIssues.push(testLabel + ' mvmt ' + m.number + ': coefficient is ' + typeof coef + ' ("' + coef + '")');
    }
  }
}

// Intro/Training
for (const t of it.tests) checkCoefficients(t.test_id, t.movements);
// First
for (const t of fl.tests) checkCoefficients(t.test_id, t.movements);
// Second/Third/Fourth
for (const key of stfKeys) checkCoefficients(key, stf.tests[key].movements);
// Freestyle compulsory elements
for (const t of frs.tests) checkCoefficients(t.test_id, t.compulsory_elements);

if (coeffIssues.length === 0) {
  console.log('All coefficients are null or numeric: PASS');
} else {
  console.log('FAIL - coefficient issues:');
  coeffIssues.forEach(i => console.log('  ' + i));
}

// Check movement numbers are sequential starting from 1
console.log('\n--- Movement Number Sequencing Check ---');
let seqIssues = [];

function checkSequential(testLabel, movements) {
  for (let i = 0; i < movements.length; i++) {
    if (movements[i].number !== i + 1) {
      seqIssues.push(testLabel + ': expected movement ' + (i+1) + ' but got ' + movements[i].number + ' at index ' + i);
    }
  }
}

for (const t of it.tests) checkSequential(t.test_id, t.movements);
for (const t of fl.tests) checkSequential(t.test_id, t.movements);
for (const key of stfKeys) checkSequential(key, stf.tests[key].movements);
for (const t of frs.tests) checkSequential(t.test_id, t.compulsory_elements);

if (seqIssues.length === 0) {
  console.log('All movement numbers sequential from 1: PASS');
} else {
  console.log('ISSUES found:');
  seqIssues.forEach(i => console.log('  ' + i));
}

// Check max points are numeric
console.log('\n--- Max Points Type Check ---');
let maxPtsIssues = [];

for (const t of it.tests) {
  if (typeof t.test_info.max_points !== 'number') maxPtsIssues.push(t.test_id + ': max_points is ' + typeof t.test_info.max_points);
}
for (const t of fl.tests) {
  if (typeof t.test_info.max_points !== 'number') maxPtsIssues.push(t.test_id + ': max_points is ' + typeof t.test_info.max_points);
}
for (const key of stfKeys) {
  const mp = stf.tests[key].metadata.maximum_points;
  if (typeof mp !== 'number') maxPtsIssues.push(key + ': maximum_points is ' + typeof mp);
}
for (const t of frs.tests) {
  if (typeof t.test_info.max_total_points !== 'number') maxPtsIssues.push(t.test_id + ': max_total_points is ' + typeof t.test_info.max_total_points);
}
for (const key of feiKeys) {
  if (typeof fei[key].totalPoints !== 'number') maxPtsIssues.push(key + ': totalPoints is ' + typeof fei[key].totalPoints);
}

if (maxPtsIssues.length === 0) {
  console.log('All max points values are numeric: PASS');
} else {
  console.log('ISSUES:');
  maxPtsIssues.forEach(i => console.log('  ' + i));
}

// Check test_id naming convention
console.log('\n--- Test ID Naming Convention Check ---');
console.log('USDF Standard IDs:');
const usdfStdIds = [...it.tests.map(t=>t.test_id), ...fl.tests.map(t=>t.test_id)];
// stf doesn't have test_ids on the objects, uses keys instead
console.log('  Intro/Training/First: ' + usdfStdIds.join(', '));
console.log('  Second/Third/Fourth keys: ' + stfKeys.join(', '));
console.log('  NOTE: Second/Third/Fourth uses object keys (e.g. "second_level_test_1") not test_id fields like "2023_second_1"');

console.log('USDF Freestyle IDs: ' + frs.tests.map(t=>t.test_id).join(', '));
console.log('FEI keys: ' + feiKeys.join(', '));

// Convention analysis
const usdfPattern = /^2023_\w+_\d+$/;
const usdfFreePattern = /^2023_\w+_freestyle$/;
const feiPattern = /^[a-z_]+$/;

const stdIdCheck = usdfStdIds.every(id => usdfPattern.test(id) || /^2023_intro_[abc]$/.test(id));
const freeIdCheck = frs.tests.every(t => usdfFreePattern.test(t.test_id));
const feiIdCheck = feiKeys.every(k => feiPattern.test(k));

console.log('USDF standard IDs follow "2023_level_number" pattern: ' + (stdIdCheck ? 'PASS' : 'FAIL'));
console.log('USDF freestyle IDs follow "2023_level_freestyle" pattern: ' + (freeIdCheck ? 'PASS' : 'FAIL'));
console.log('FEI IDs follow "snake_case" pattern: ' + (feiIdCheck ? 'PASS' : 'FAIL'));

// Check for null directives
console.log('\n--- Null/Missing Directives Check ---');
let nullDirIssues = [];
for (const key of stfKeys) {
  for (const m of stf.tests[key].movements) {
    if (m.directive === null || m.directive === undefined) {
      nullDirIssues.push(key + ' mvmt ' + m.number + ': directive is ' + m.directive);
    }
  }
}
if (nullDirIssues.length === 0) {
  console.log('No null directives in Second/Third/Fourth: PASS');
} else {
  console.log('Null directive issues:');
  nullDirIssues.forEach(i => console.log('  ' + i));
}

console.log('\n========== VERIFICATION COMPLETE ==========');
