import 'dotenv/config';

async function seedDatabase() {
  console.log('🌱 Database seeding is skipped as per user request.');
  console.log('ℹ️  To enable seeding, modify this file to include the seeding logic.');
  return;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };