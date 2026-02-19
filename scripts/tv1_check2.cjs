const fs = require('fs');
const main = JSON.parse(fs.readFileSync('comprehensive_dressage_test_database.json', 'utf8'));
const detailKeys = Object.keys(main.file_organization.detail_files);
console.log('file_organization detail_files keys:');
detailKeys.forEach(k => console.log('  ' + k));
console.log('Count:', detailKeys.length);
console.log('Missing usdf_first_level_tests.json:', !detailKeys.includes('usdf_first_level_tests.json'));
console.log('Has wrong name usdf_second_third_fourth_tests.json:', detailKeys.includes('usdf_second_third_fourth_tests.json'));

// Also check external_files section for same issue
console.log('\nexternal_files section references:');
main.external_files.files.forEach(f => console.log('  ' + f.filename));

// Check FEI naming convention
console.log('\nFEI key naming analysis:');
const fei = JSON.parse(fs.readFileSync('dressage tests/fei_test_database_complete.json', 'utf8'));
Object.keys(fei).forEach(k => {
  const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(k);
  console.log('  ' + k + ' -> snake_case: ' + isSnakeCase);
});
