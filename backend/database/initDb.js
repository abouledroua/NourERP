import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { seedDatabase } from './seed.js';
import { checkAndInitializeDefaults } from '../services/startupCheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export async function initializeDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const defaultPort = parseInt(process.env.DB_PORT || '3306', 10);
  const database = process.env.DB_NAME || 'alnour_erp_db';

  const candidateCreds = [
    { user: process.env.DB_USER || 'citrus', password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'citrus21012013' },
    { user: 'citrus', password: 'citrus21012013' },
    { user: 'root', password: '' }
  ];

  const candidatePorts = [defaultPort, 3306, 3308].filter((v, i, a) => a.indexOf(v) === i);

  let connection = null;
  let chosenPort = null;
  let chosenUser = null;
  let chosenPassword = null;

  for (const cred of candidateCreds) {
    for (const port of candidatePorts) {
      try {
        console.log(`[INIT-DB] Testing connection on ${host}:${port} as '${cred.user}'...`);
        const testConn = await mysql.createConnection({
          host,
          port,
          user: cred.user,
          password: cred.password,
          multipleStatements: true
        });
        // Test if we can create database
        await testConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        connection = testConn;
        chosenPort = port;
        chosenUser = cred.user;
        chosenPassword = cred.password;
        console.log(`[INIT-DB] Successfully verified DB creation privilege on port ${port} with user '${cred.user}'!`);
        break;
      } catch (err) {
        console.warn(`[INIT-DB] Port ${port} with user '${cred.user}' not usable (${err.message}). Trying next...`);
      }
    }
    if (connection) break;
  }

  if (!connection) {
    throw new Error(`[INIT-DB] Could not connect or create database '${database}' on any candidate port (${candidatePorts.join(', ')}) with candidate credentials.`);
  }

  try {
    await connection.query(`USE \`${database}\``);
    console.log(`[INIT-DB] Selected database '${database}' on port ${chosenPort}`);

    const schemaSqlPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');

    console.log('[INIT-DB] Executing schema DDL statements...');
    await connection.query(schemaSql);
    console.log('[INIT-DB] Schema applied successfully.');

    // Seed initial data
    await seedDatabase();
    await checkAndInitializeDefaults();

    console.log('[INIT-DB] Database initialization and seeding complete.');
    return { success: true, port: chosenPort };
  } catch (error) {
    console.error('[INIT-DB] Error initializing database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Direct CLI invocation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase()
    .then((res) => {
      console.log(`[INIT-DB] Finished successfully on port ${res.port}.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[INIT-DB] Fatal initialization error:', err.message);
      process.exit(1);
    });
}
