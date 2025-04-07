const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the Supabase project reference from environment variables
const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF;
if (!supabaseProjectRef) {
  console.error('Error: SUPABASE_PROJECT_REF environment variable is not set');
  process.exit(1);
}

// Get the migrations directory
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Check if the migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error(`Error: Migrations directory not found at ${migrationsDir}`);
  process.exit(1);
}

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('No migration files found');
  process.exit(0);
}

console.log(`Found ${migrationFiles.length} migration files`);

// Run each migration
for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  console.log(`Running migration: ${file}`);
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Run the migration using the Supabase CLI
    execSync(`npx supabase db push --db-url postgres://postgres:postgres@localhost:54322/postgres`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        SUPABASE_PROJECT_REF: supabaseProjectRef
      }
    });
    
    console.log(`Migration ${file} completed successfully`);
  } catch (error) {
    console.error(`Error running migration ${file}:`, error);
    process.exit(1);
  }
}

console.log('All migrations completed successfully'); 