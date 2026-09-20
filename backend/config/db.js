import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

let pool = null;
let detectedPort = parseInt(process.env.DB_PORT || '3306', 10);

async function testConnection(port, host, user, password, dbName) {
  try {
    const conn = await mysql.createConnection({ host, port, user, password });
    // Check if we can create or use the database
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);
    await conn.end();
    return true;
  } catch (err) {
    return false;
  }
}

export async function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST || '127.0.0.1';
  const database = process.env.DB_NAME || 'alnour_erp_db';

  // Candidate credentials to try (citrus, env, root)
  const candidateCreds = [
    { user: process.env.DB_USER || 'citrus', password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'citrus21012013' },
    { user: 'citrus', password: 'citrus21012013' },
    { user: 'root', password: '' }
  ];

  // Candidate ports to try (Port 3306 WampServer MySQL first, then 3308 embedded)
  const candidatePorts = [
    detectedPort,
    3306,
    3308
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  let activePort = null;
  let activeUser = null;
  let activePassword = null;

  for (const cred of candidateCreds) {
    for (const port of candidatePorts) {
      const ok = await testConnection(port, host, cred.user, cred.password, database);
      if (ok) {
        activePort = port;
        activeUser = cred.user;
        activePassword = cred.password;
        break;
      }
    }
    if (activePort) break;
  }

  if (!activePort) {
    activePort = detectedPort;
    activeUser = process.env.DB_USER || 'root';
    activePassword = process.env.DB_PASSWORD || '';
    console.warn(`[DB] Could not verify database connection on candidate ports/credentials. Defaulting to port ${activePort} with user '${activeUser}'`);
  } else {
    detectedPort = activePort;
    console.log(`[DB] Discovered responsive database server on port ${activePort} using user '${activeUser}'`);
  }

  pool = mysql.createPool({
    host,
    port: activePort,
    user: activeUser,
    password: activePassword,
    database,
    waitForConnections: true,
    connectionLimit: 25,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    charset: 'utf8mb4'
  });

  return pool;
}

export async function query(sql, params = []) {
  const activePool = await getPool();
  const [results] = await activePool.query(sql, params);
  return results;
}

export async function executeTransaction(callback) {
  const activePool = await getPool();
  const connection = await activePool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  getPool,
  query,
  executeTransaction
};
