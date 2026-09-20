import { Elysia } from 'elysia';
import { pool } from '../db.js';
import { buildImportPlan, buildIncrementalImportPlan } from '../importData.js';
import { setManifest } from '../schema-manifest.js';
import { requireAdmin } from '../authMiddleware.js';
import { hashPlaintextPasswords } from '../hashPasswords.js';

export const adminRoutes = new Elysia()
  .post('/api/admin/import', async ({ headers, body, set }) => {
    requireAdmin(headers);

    const data = body?.data;
    if (!data) {
      set.status = 400;
      return { error: 'Missing "data" (the Firebase export JSON) in request body' };
    }

    const { sql, manifest, summary, fkSummary, warnings } = buildImportPlan(data);

    // Our db.js shim's pool has no separate connect()/client concept (unlike
    // pg's Pool) - the whole multi-statement script is just one big batch
    // sent through the same pool.query() every other route already uses.
    await pool.query(sql);

    setManifest(manifest);

    const passwordResults = await hashPlaintextPasswords(pool);

    return {
      ok: true,
      tables: summary.length,
      totalRows: summary.reduce((sum, t) => sum + t.rows, 0),
      summary,
      passwordsHashed: passwordResults,
      fkReferencesNotResolved: fkSummary,
      warnings,
    };
  })

  // Adds only the rows a newer Firebase export has that this database
  // doesn't yet (matched by each row's original Firebase key) - unlike
  // /api/admin/import, this never drops or touches anything already in SQL
  // Server, so it's safe to run against a live database that's had real
  // activity (new customers, transfers, tickets) since the original cutover.
  .post('/api/admin/import-incremental', async ({ headers, body, set }) => {
    requireAdmin(headers);

    const data = body?.data;
    if (!data) {
      set.status = 400;
      return { error: 'Missing "data" (the Firebase export JSON) in request body' };
    }

    const { alterSql, sql, manifest, summary, fkSummary, manifestUpdates, totalNewRows, warnings } =
      await buildIncrementalImportPlan(data, pool);

    if (totalNewRows === 0) {
      return {
        ok: true,
        totalNewRows: 0,
        summary,
        message: 'ไม่มีข้อมูลใหม่ที่ต้องเพิ่ม - ทุกแถวในไฟล์นี้มีอยู่ในฐานข้อมูลแล้ว',
        warnings,
      };
    }

    // Must fully commit before `sql` runs - a column added via ALTER TABLE
    // ADD isn't visible to an INSERT in the same T-SQL batch, only in a
    // later one. See importData.js's alterSqlParts comment for why.
    if (alterSql) await pool.query(alterSql);
    await pool.query(sql);

    // Only persist the manifest update after the SQL above actually
    // committed - if that query had thrown, nothing here would run, so the
    // on-disk/in-memory manifest never drifts from the real schema.
    setManifest(manifest);

    const passwordResults = await hashPlaintextPasswords(pool);

    return {
      ok: true,
      totalNewRows,
      summary,
      columnsAdded: manifestUpdates,
      passwordsHashed: passwordResults,
      fkReferencesNotResolved: fkSummary,
      warnings,
    };
  });
