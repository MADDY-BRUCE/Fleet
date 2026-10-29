import { initDatabase, seedDatabase } from '../server/db';
import { AssignmentService } from '../server/assignment-service';

async function runConcurrencyStressTest() {
  console.log('===============================================================');
  console.log('   FLEETWISE CONCURRENCY STRESS TEST (20 PARALLEL REQUESTS)   ');
  console.log('   Target: Simultaneous race condition on Vehicle V101         ');
  console.log('===============================================================\n');

  // Fresh isolated database
  const db = initDatabase(':memory:');
  seedDatabase(db);
  const service = new AssignmentService(db);

  // We have 20 mock delivery requests targeting the same vehicle V101
  // Add additional mock pending deliveries for the race
  const insertDelivery = db.prepare(`
    INSERT INTO deliveries (delivery_id, pickup, dropoff, scheduled_time, priority, status)
    VALUES (?, 'Coimbatore Hub', 'Destination', '10:00 AM', 'Medium', 'pending')
  `);

  for (let i = 1; i <= 20; i++) {
    const dId = `RACE_${i}`;
    insertDelivery.run(dId);
  }

  // Pick 20 available drivers (or rotate through available drivers)
  // Even if drivers are available, vehicle V101 is the single contested resource.
  // We'll see how many succeed in reserving V101.
  console.log('Firing 20 simultaneous assignment requests for Vehicle V101...');

  const promises = [];
  for (let i = 1; i <= 20; i++) {
    const deliveryId = `RACE_${i}`;
    // Assigning to V101 with D101, D102, D103, D105, D106 etc.
    const driverId = i === 1 ? 'D101' : (i === 2 ? 'D102' : (i === 3 ? 'D103' : 'D105'));

    promises.push(
      new Promise<{ index: number; success: boolean; result?: any; error?: any }>((resolve) => {
        // Microtask tick to ensure simultaneous dispatch
        setImmediate(() => {
          try {
            const res = service.assignDelivery(deliveryId, 'V101', driverId, `worker_${i}`);
            resolve({ index: i, success: true, result: res });
          } catch (err: any) {
            resolve({ index: i, success: false, error: err });
          }
        });
      })
    );
  }

  const results = await Promise.all(promises);

  const successes = results.filter((r) => r.success);
  const rejections = results.filter((r) => !r.success);

  console.log(`\nResults summary:`);
  console.log(`  Total requests fired: 20`);
  console.log(`  Successful assignments: ${successes.length}`);
  console.log(`  Rejected conflicts:    ${rejections.length}`);

  if (successes.length === 1) {
    console.log(`\nWinning assignment: Delivery ${successes[0].result.delivery_id} won Vehicle V101 (Assignment ID: ${successes[0].result.assignment_id})`);
  }

  // Verify database integrity
  const activeAssignments = db.prepare('SELECT * FROM assignments WHERE vehicle_id = ? AND is_active = 1').all('V101');
  const vehicleStatus = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;

  console.log(`\nDatabase State Verification:`);
  console.log(`  Active assignments in DB for V101: ${activeAssignments.length}`);
  console.log(`  Vehicle status in DB:              ${vehicleStatus.status}`);

  if (successes.length === 1 && rejections.length === 19 && activeAssignments.length === 1) {
    console.log('\n>>> STRESS TEST PASSED: EXACTLY 1 REQUEST SUCCEEDED. ZERO DOUBLE BOOKINGS. <<<');
    process.exit(0);
  } else {
    console.error('\n>>> STRESS TEST FAILED: Race condition leaked multiple assignments! <<<');
    process.exit(1);
  }
}

runConcurrencyStressTest();
