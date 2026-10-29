import { runAllTests } from './test-suite';

console.log('===============================================================');
console.log('   FLEETWISE: AUTOMATED LOGISTICS RULE VERIFICATION SUITE      ');
console.log('   IT HAPPENS @ RAALE #13 · Kovai Central Dispatch Yard        ');
console.log('===============================================================\n');

const summary = runAllTests();

for (const t of summary.tests) {
  const icon = t.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
  console.log(`[${t.id}] ${t.name.padEnd(36)} [${icon}] (${t.durationMs}ms)`);
  console.log(`     Input:    ${t.input}`);
  console.log(`     Expected: ${t.expected}`);
  console.log(`     Observed: ${t.observed}\n`);
}

console.log('---------------------------------------------------------------');
console.log(`Summary: ${summary.passed}/${summary.total} tests passed in ${summary.totalDurationMs}ms`);
if (summary.allPassed) {
  console.log('Result: ALL CORE ASSIGNMENT & CONFLICT RULES VERIFIED SUCCESSFULLY.');
  process.exit(0);
} else {
  console.error(`Result: ${summary.failed} tests FAILED.`);
  process.exit(1);
}
