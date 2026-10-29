import { execSync } from 'child_process';

console.log('--- CI Check 1: Forbidden hardcoded names in src/ ---');
try {
  const result = execSync('git grep -i -E "(Bobo|Chisenga|Chipo|Princess|Joe|Nathaniel)" src/', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.error('FAIL: Found forbidden hardcoded names in src/:\n', result);
  process.exit(1);
} catch (err) {
  // Exit code 1 from git grep means no matches found
  console.log('PASS: 0 occurrences of hardcoded house/persona names in src/');
}

console.log('\n--- CI Check 2: No deleteDoc in src/ ---');
try {
  const result = execSync('git grep "deleteDoc" src/', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.error('FAIL: Found deleteDoc in src/:\n', result);
  process.exit(1);
} catch (err) {
  console.log('PASS: 0 occurrences of deleteDoc in src/');
}

console.log('\n--- CI Check 3: No sanitizeRoom, sanitizeProperty, isObsoleteOrTestRequest in src/ ---');
try {
  const result = execSync('git grep -E "(sanitizeRoom|sanitizeProperty|isObsoleteOrTestRequest)" src/', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.error('FAIL: Found forbidden sanitizer functions in src/:\n', result);
  process.exit(1);
} catch (err) {
  console.log('PASS: 0 occurrences of automatic sanitizers in src/');
}

console.log('\nALL CODE CLEANLINESS CHECKS PASSED!');
