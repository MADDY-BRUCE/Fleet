import { initDatabase, resetDatabase } from './db';

console.log('🌱 Seeding FleetWise database for Kovai Central Dispatch Yard...');
const db = initDatabase();
resetDatabase(db);
console.log('✅ FleetWise database seeded successfully with 8 vehicles, 6 drivers, 7 deliveries, admin, and driver accounts.');
process.exit(0);
