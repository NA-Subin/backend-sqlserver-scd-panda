import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pool } from './db.js';

// SQL-Server port of the Postgres backend's backup.js. There's no
// pg_dump-equivalent external tool to shell out to here - SQL Server backs
// up itself natively via the T-SQL BACKUP DATABASE statement, run through
// the same pool everything else in this project already uses. That
// statement runs ON THE SQL SERVER PROCESS ITSELF, not in this Node/Bun
// process - the file it writes only shows up for readdir/stat/unlink below
// because SQL Server happens to be installed on this same machine. If the
// SQL Server service account can't write to BACKUP_DIR (a real possibility -
// it runs as its own Windows service account, not the account running this
// backend), runBackup() below surfaces that as a clear error rather than a
// generic SQL failure.
//
// Produces a native .bak file (SQL Server's own backup format) instead of
// a portable .sql text file - restoring it needs RESTORE DATABASE (or
// SSMS/DBeaver's restore wizard) against a SQL Server instance, not psql.

export const BACKUP_DIR = path.join(process.cwd(), 'backups');
await mkdir(BACKUP_DIR, { recursive: true });

const RETENTION_DAYS = 30;

function backupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `scd_panda_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.bak`
  );
}

export async function runBackup() {
  const filename = backupFilename();
  const filePath = path.join(BACKUP_DIR, filename);
  const database = process.env.MSSQL_DATABASE;

  try {
    // Database name isn't parameterizable in BACKUP DATABASE's syntax (must
    // be a literal identifier) - safe to interpolate since it only ever
    // comes from this backend's own trusted env var, never request input.
    // File path and backup-set name ARE parameterizable and go through
    // db.js's normal $1/$2 shim.
    await pool.query(
      `BACKUP DATABASE [${database}] TO DISK = $1 WITH FORMAT, INIT, NAME = $2`,
      [filePath, `${database} full backup`]
    );
  } catch (err) {
    throw new Error(
      `SQL Server BACKUP DATABASE ล้มเหลว - ตรวจสอบว่า service account ของ SQL Server เขียนไฟล์ที่ ` +
        `"${BACKUP_DIR}" ได้ (อาจต้องตั้งค่า MSSQL_BACKUP_DIR ใน .env ให้ชี้ไปที่โฟลเดอร์ที่ SQL Server เขียนได้จริง): ${err.message}`
    );
  }

  return { filename, path: filePath };
}

export async function listBackups() {
  const files = await readdir(BACKUP_DIR);
  const bakFiles = files.filter((f) => f.endsWith('.bak'));
  const details = await Promise.all(
    bakFiles.map(async (filename) => {
      const s = await stat(path.join(BACKUP_DIR, filename));
      return { filename, size: s.size, createdAt: s.birthtime ?? s.mtime };
    })
  );
  return details.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function pruneOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = await listBackups();
  const removed = [];
  for (const f of files) {
    if (new Date(f.createdAt).getTime() < cutoff) {
      await unlink(path.join(BACKUP_DIR, f.filename));
      removed.push(f.filename);
    }
  }
  return removed;
}

export async function deleteBackup(filename) {
  await unlink(path.join(BACKUP_DIR, filename));
}
