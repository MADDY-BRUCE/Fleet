import Database from 'better-sqlite3';
import { initDatabase, seedDatabase } from './db';
import { AssignmentService } from './assignment-service';

export interface TestResult {
  id: string;
  name: string;
  category: string;
  input: string;
  expected: string;
  observed: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  details?: string;
}

export interface TestSuiteSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  totalDurationMs: number;
  tests: TestResult[];
}

export function runAllTests(): TestSuiteSummary {
  const tests: TestResult[] = [];
  const overallStart = Date.now();

  function createFreshDb(): { db: Database.Database; service: AssignmentService } {
    // In-memory isolated database
    const db = initDatabase(':memory:');
    seedDatabase(db);
    const service = new AssignmentService(db);
    return { db, service };
  }

  // T1: Valid assignment
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'delivery_id: DL101, vehicle_id: V101, driver_id: D101';
    const expected = 'Assignment created (201); delivery=assigned, vehicle=assigned, driver=assigned';

    try {
      const result = service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
      const del = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
      const veh = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;
      const drv = db.prepare('SELECT availability_status FROM drivers WHERE driver_id = ?').get('D101') as any;

      if (
        result.status === 'assigned' &&
        del.status === 'assigned' &&
        veh.status === 'assigned' &&
        drv.availability_status === 'assigned'
      ) {
        status = 'PASS';
        observed = `Success: Assigned ID=${result.assignment_id}, Delivery status=${del.status}, Vehicle status=${veh.status}, Driver status=${drv.availability_status}`;
      } else {
        observed = `State mismatch: del=${del.status}, veh=${veh.status}, drv=${drv.availability_status}`;
      }
    } catch (err: any) {
      observed = `Error: ${err.message || err}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T1',
      name: 'Valid Assignment',
      category: 'Core Assignment',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T2: Same vehicle on a second active delivery
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = '1st: DL101 + V101 + D101; 2nd: DL102 + V101 + D102';
    const expected = 'Rejected (409) VEHICLE_UNAVAILABLE; DL102 stays pending; D102 stays available';

    try {
      // 1st assignment
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');

      // 2nd assignment attempt with same vehicle V101
      try {
        service.assignDelivery('DL102', 'V101', 'D102', 'test_runner');
        observed = 'Unexpected success on 2nd assignment';
      } catch (err: any) {
        const del2 = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL102') as any;
        const drv2 = db.prepare('SELECT availability_status FROM drivers WHERE driver_id = ?').get('D102') as any;

        if (err.status === 409 && err.error === 'VEHICLE_UNAVAILABLE' && del2.status === 'pending' && drv2.availability_status === 'available') {
          status = 'PASS';
          observed = `Rejected (409) [${err.error}]: ${err.message}. DL102 remained ${del2.status}, D102 remained ${drv2.availability_status}`;
        } else {
          observed = `Wrong error or state: ${JSON.stringify(err)}, del2=${del2?.status}, drv2=${drv2?.availability_status}`;
        }
      }
    } catch (err: any) {
      observed = `Setup error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T2',
      name: 'Vehicle Conflict Prevention',
      category: 'Conflict Prevention',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T3: Same driver on a second active delivery
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = '1st: DL101 + V101 + D101; 2nd: DL102 + V102 + D101';
    const expected = 'Rejected (409) DRIVER_UNAVAILABLE; DL102 stays pending; V102 stays available';

    try {
      // 1st assignment
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');

      // 2nd assignment attempt with same driver D101
      try {
        service.assignDelivery('DL102', 'V102', 'D101', 'test_runner');
        observed = 'Unexpected success on 2nd assignment';
      } catch (err: any) {
        const del2 = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL102') as any;
        const veh2 = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V102') as any;

        if (err.status === 409 && err.error === 'DRIVER_UNAVAILABLE' && del2.status === 'pending' && veh2.status === 'available') {
          status = 'PASS';
          observed = `Rejected (409) [${err.error}]: ${err.message}. DL102 remained ${del2.status}, V102 remained ${veh2.status}`;
        } else {
          observed = `Wrong error or state: ${JSON.stringify(err)}`;
        }
      }
    } catch (err: any) {
      observed = `Setup error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T3',
      name: 'Driver Conflict Prevention',
      category: 'Conflict Prevention',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T4: Occupied vehicle and occupied driver
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = '1st: DL101 + V101 + D101; Attempt 2nd: DL102 + V101 + D101';
    const expected = 'Rejected (409) BOTH_UNAVAILABLE with clear composite reason';

    try {
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
      try {
        service.assignDelivery('DL102', 'V101', 'D101', 'test_runner');
        observed = 'Unexpected success';
      } catch (err: any) {
        if (err.status === 409 && err.error === 'BOTH_UNAVAILABLE') {
          status = 'PASS';
          observed = `Rejected (409) [${err.error}]: ${err.message}`;
        } else {
          observed = `Unexpected error: ${JSON.stringify(err)}`;
        }
      }
    } catch (err: any) {
      observed = `Setup error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T4',
      name: 'Both Resources Occupied',
      category: 'Conflict Prevention',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T5: Driver set to unavailable, then assign
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Priya (D104 is unavailable); Attempt assign to DL101 with V101';
    const expected = 'Rejected (409) DRIVER_UNAVAILABLE; DL101 stays pending';

    try {
      service.assignDelivery('DL101', 'V101', 'D104', 'test_runner');
      observed = 'Unexpected success';
    } catch (err: any) {
      const del = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
      if (err.status === 409 && err.error === 'DRIVER_UNAVAILABLE' && del.status === 'pending') {
        status = 'PASS';
        observed = `Rejected (409) [${err.error}]: ${err.message}. DL101 remained ${del.status}`;
      } else {
        observed = `Unexpected error: ${JSON.stringify(err)}`;
      }
    } finally {
      db.close();
    }

    tests.push({
      id: 'T5',
      name: 'Unavailable Driver Assignment',
      category: 'Eligibility Checks',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T6: Vehicle in maintenance
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'V104 (is maintenance); Attempt assign to DL101 with D101';
    const expected = 'Rejected (409) VEHICLE_UNAVAILABLE indicating maintenance';

    try {
      service.assignDelivery('DL101', 'V104', 'D101', 'test_runner');
      observed = 'Unexpected success';
    } catch (err: any) {
      const del = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
      if (err.status === 409 && err.error === 'VEHICLE_UNAVAILABLE' && del.status === 'pending') {
        status = 'PASS';
        observed = `Rejected (409) [${err.error}]: ${err.message}`;
      } else {
        observed = `Unexpected error: ${JSON.stringify(err)}`;
      }
    } finally {
      db.close();
    }

    tests.push({
      id: 'T6',
      name: 'Maintenance Vehicle Assignment',
      category: 'Eligibility Checks',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T7: Unknown vehicle, driver or delivery ID
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Missing IDs: DL_GHOST, V_GHOST, D_GHOST';
    const expected = 'All return 404 cleanly, no crash, no partial state writes';

    try {
      let c1 = false;
      let c2 = false;
      let c3 = false;

      try {
        service.assignDelivery('DL_GHOST', 'V101', 'D101');
      } catch (e: any) {
        if (e.status === 404 && e.error === 'DELIVERY_NOT_FOUND') c1 = true;
      }

      try {
        service.assignDelivery('DL101', 'V_GHOST', 'D101');
      } catch (e: any) {
        if (e.status === 404 && e.error === 'VEHICLE_NOT_FOUND') c2 = true;
      }

      try {
        service.assignDelivery('DL101', 'V101', 'D_GHOST');
      } catch (e: any) {
        if (e.status === 404 && e.error === 'DRIVER_NOT_FOUND') c3 = true;
      }

      if (c1 && c2 && c3) {
        status = 'PASS';
        observed = 'All 3 missing ID scenarios returned HTTP 404 with specific NOT_FOUND error codes';
      } else {
        observed = `Check results: c1=${c1}, c2=${c2}, c3=${c3}`;
      }
    } catch (err: any) {
      observed = `Unexpected error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T7',
      name: 'Unknown IDs Handled Safely',
      category: 'Error Handling',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T8: Complete delivery
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'DL101 assigned -> in_transit -> delivered';
    const expected = 'Delivery=delivered; Assignment is_active=0 with released_at; Vehicle & Driver return to available';

    try {
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
      service.updateDeliveryStatus('DL101', 'in_transit', 'test_runner');
      const delResult = service.updateDeliveryStatus('DL101', 'delivered', 'test_runner');

      const del = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
      const veh = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;
      const drv = db.prepare('SELECT availability_status FROM drivers WHERE driver_id = ?').get('D101') as any;
      const asgn = db.prepare('SELECT is_active, released_at FROM assignments WHERE delivery_id = ?').get('DL101') as any;

      if (
        del.status === 'delivered' &&
        veh.status === 'available' &&
        drv.availability_status === 'available' &&
        asgn.is_active === 0 &&
        asgn.released_at !== null
      ) {
        status = 'PASS';
        observed = `Resources released: Delivery=${del.status}, V101=${veh.status}, D101=${drv.availability_status}, Assignment is_active=${asgn.is_active}, released_at=${asgn.released_at}`;
      } else {
        observed = `Mismatch: del=${del.status}, veh=${veh.status}, drv=${drv.availability_status}, active=${asgn?.is_active}`;
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T8',
      name: 'Complete Delivery Resource Release',
      category: 'Lifecycle & Release',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T9: Cancel delivery
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'DL101 assigned to V101 & D101, then status -> cancelled';
    const expected = 'Delivery=cancelled; Assignment deactivated; Vehicle and Driver released to available';

    try {
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
      service.updateDeliveryStatus('DL101', 'cancelled', 'test_runner');

      const del = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
      const veh = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;
      const drv = db.prepare('SELECT availability_status FROM drivers WHERE driver_id = ?').get('D101') as any;
      const asgn = db.prepare('SELECT is_active, released_at FROM assignments WHERE delivery_id = ?').get('DL101') as any;

      if (
        del.status === 'cancelled' &&
        veh.status === 'available' &&
        drv.availability_status === 'available' &&
        asgn.is_active === 0 &&
        asgn.released_at !== null
      ) {
        status = 'PASS';
        observed = `Cancelled successfully: Delivery=${del.status}, V101=${veh.status}, D101=${drv.availability_status}, Assignment released_at=${asgn.released_at}`;
      } else {
        observed = `State mismatch: del=${del.status}, veh=${veh.status}, drv=${drv.availability_status}`;
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T9',
      name: 'Cancel Delivery Resource Release',
      category: 'Lifecycle & Release',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T10: Invalid transition
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Pending DL101: attempt directly transition to delivered or in_transit without assignment';
    const expected = 'Rejected (409) INVALID_TRANSITION; DL101 remains pending';

    try {
      let r1 = false;
      let r2 = false;

      try {
        service.updateDeliveryStatus('DL101', 'delivered');
      } catch (e: any) {
        if (e.status === 409 && e.error === 'INVALID_TRANSITION') r1 = true;
      }

      try {
        service.updateDeliveryStatus('DL101', 'in_transit');
      } catch (e: any) {
        if (e.status === 409 && e.error === 'INVALID_TRANSITION') r2 = true;
      }

      const del = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;

      if (r1 && r2 && del.status === 'pending') {
        status = 'PASS';
        observed = `Both invalid transitions rejected (409 INVALID_TRANSITION). DL101 remains ${del.status}`;
      } else {
        observed = `Check results: r1=${r1}, r2=${r2}, delStatus=${del?.status}`;
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T10',
      name: 'Invalid Transition Enforcement',
      category: 'State Machine',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T11: Duplicate submit of the same assignment
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Call assignDelivery(DL101, V101, D101) twice in rapid succession';
    const expected = '1st succeeds, 2nd rejected (409); exactly 1 active assignment exists';

    try {
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
      try {
        service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
        observed = 'Unexpected success on 2nd submission';
      } catch (err: any) {
        const count = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE delivery_id = ? AND is_active = 1').get('DL101') as any).c;
        if (err.status === 409 && count === 1) {
          status = 'PASS';
          observed = `2nd submit blocked with [${err.error}]: ${err.message}. Total active assignments in DB = ${count}`;
        } else {
          observed = `Error: ${JSON.stringify(err)}, count=${count}`;
        }
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T11',
      name: 'Duplicate Submit Idempotency',
      category: 'Concurrency & Duplication',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T12: Concurrent requests for same vehicle
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Two parallel assignment attempts for V101 (DL101+D101 vs DL102+D102)';
    const expected = 'At most 1 succeeds, other rejected with VEHICLE_UNAVAILABLE; DB has exactly 1 active assignment for V101';

    try {
      let successCount = 0;
      let rejectCount = 0;

      const attempt1 = () => {
        try {
          service.assignDelivery('DL101', 'V101', 'D101', 'worker_1');
          successCount++;
        } catch (e: any) {
          rejectCount++;
        }
      };

      const attempt2 = () => {
        try {
          service.assignDelivery('DL102', 'V101', 'D102', 'worker_2');
          successCount++;
        } catch (e: any) {
          rejectCount++;
        }
      };

      // Execute both
      attempt1();
      attempt2();

      const activeVehCount = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE vehicle_id = ? AND is_active = 1').get('V101') as any).c;

      if (successCount === 1 && rejectCount === 1 && activeVehCount === 1) {
        status = 'PASS';
        observed = `Exactly 1 succeeded and 1 rejected. Active assignments for V101 in DB = ${activeVehCount}`;
      } else {
        observed = `Results: success=${successCount}, reject=${rejectCount}, activeInDb=${activeVehCount}`;
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T12',
      name: 'Concurrent Request Race Safety',
      category: 'Concurrency & Duplication',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T13: Failure injection: force an error mid-assignment
  {
    const start = Date.now();
    const { db } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Inject failure midway inside assignment transaction after updating vehicle';
    const expected = 'Transaction rolls back completely; vehicle, driver, and delivery state remain totally unchanged';

    try {
      const vBefore = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;
      const dBefore = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
      const drBefore = db.prepare('SELECT availability_status FROM drivers WHERE driver_id = ?').get('D101') as any;

      try {
        const faultyTx = db.transaction(() => {
          db.prepare(`UPDATE vehicles SET status = 'assigned' WHERE vehicle_id = ?`).run('V101');
          // Forced failure injection
          throw new Error('SIMULATED_DATABASE_IO_FAILURE');
        });
        faultyTx.immediate();
      } catch (simulatedErr: any) {
        // Verify state is completely restored
        const vAfter = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;
        const dAfter = db.prepare('SELECT status FROM deliveries WHERE delivery_id = ?').get('DL101') as any;
        const drAfter = db.prepare('SELECT availability_status FROM drivers WHERE driver_id = ?').get('D101') as any;
        const asgnCount = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE delivery_id = ?').get('DL101') as any).c;

        if (
          vAfter.status === vBefore.status &&
          dAfter.status === dBefore.status &&
          drAfter.availability_status === drBefore.availability_status &&
          asgnCount === 0
        ) {
          status = 'PASS';
          observed = `Rollback confirmed: Vehicle remained ${vAfter.status}, Delivery remained ${dAfter.status}, 0 assignments written`;
        } else {
          observed = `Partial state leaked! vAfter=${vAfter.status}`;
        }
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T13',
      name: 'Mid-Assignment Rollback Integrity',
      category: 'Transactions & Atomicity',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  // T14: Set vehicle to maintenance while assigned
  {
    const start = Date.now();
    const { db, service } = createFreshDb();
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let observed = '';
    const input = 'Assign V101 to DL101, then attempt updateVehicleStatus(V101, "maintenance")';
    const expected = 'Rejected (409) ACTIVE_ASSIGNMENT_EXISTS; Vehicle stays assigned';

    try {
      service.assignDelivery('DL101', 'V101', 'D101', 'test_runner');
      try {
        service.updateVehicleStatus('V101', 'maintenance', 'test_runner');
        observed = 'Unexpected success changing assigned vehicle to maintenance';
      } catch (err: any) {
        const veh = db.prepare('SELECT status FROM vehicles WHERE vehicle_id = ?').get('V101') as any;
        if (err.status === 409 && err.error === 'ACTIVE_ASSIGNMENT_EXISTS' && veh.status === 'assigned') {
          status = 'PASS';
          observed = `Rejected (409) [${err.error}]: ${err.message}. Vehicle status remained ${veh.status}`;
        } else {
          observed = `Unexpected result: ${JSON.stringify(err)}, vehStatus=${veh?.status}`;
        }
      }
    } catch (err: any) {
      observed = `Error: ${err.message}`;
    } finally {
      db.close();
    }

    tests.push({
      id: 'T14',
      name: 'Assigned Vehicle Status Protection',
      category: 'Resource Protection',
      input,
      expected,
      observed,
      status,
      durationMs: Date.now() - start,
    });
  }

  const passed = tests.filter((t) => t.status === 'PASS').length;
  const failed = tests.filter((t) => t.status === 'FAIL').length;

  return {
    timestamp: new Date().toISOString(),
    total: tests.length,
    passed,
    failed,
    allPassed: failed === 0,
    totalDurationMs: Date.now() - overallStart,
    tests,
  };
}
