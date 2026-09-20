import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, 'schema-manifest.json');

let manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Replaces the in-memory manifest (used right after a JSON re-import) and
// persists it to disk so it survives a backend restart.
export function setManifest(newManifest) {
  manifest = newManifest;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

export function getTableNames() {
  return Object.keys(manifest);
}

// Raw manifest object, for callers that need to inspect a table's existing
// columns without throwing when the table isn't known yet (assertValidTable
// always throws) - e.g. the incremental importer, which needs to tell "this
// field already has a column" from "this field needs one added" per table.
export function getManifest() {
  return manifest;
}

export function assertValidTable(table) {
  if (!(table in manifest)) {
    const err = new Error(`Unknown table "${table}"`);
    err.status = 404;
    throw err;
  }
  return manifest[table];
}

// Builds: SELECT "uuid", "row_key", "col1" AS "OriginalField1", ...
export function selectColumnsSql(table) {
  const def = assertValidTable(table);
  const cols = def.columns.map((c) => `"${c.column}" AS "${c.field}"`);
  return ['"uuid"', '"row_key"', ...cols].join(', ');
}

export function assertValidColumns(table, fields) {
  const def = assertValidTable(table);
  const validFields = new Set(def.columns.map((c) => c.field));
  for (const field of fields) {
    if (!validFields.has(field)) {
      const err = new Error(`Unknown column "${field}" on table "${table}"`);
      err.status = 400;
      throw err;
    }
  }
}

export function columnNameForField(table, field) {
  const def = assertValidTable(table);
  const col = def.columns.find((c) => c.field === field);
  return col ? col.column : null;
}

// SQL Server has no native JSONB type - JSONB columns live as NVARCHAR(MAX)
// JSON text here, so a row read back from pool.query() needs each of those
// fields parsed back into an object/array, the same shape node-postgres
// already hands back automatically for a real JSONB column. Mutates and
// returns `row` for convenient chaining in a .map().
export function parseJsonColumns(table, row) {
  if (!row) return row;
  const def = assertValidTable(table);
  for (const col of def.columns) {
    if (col.type === 'JSONB' && typeof row[col.field] === 'string') {
      try {
        row[col.field] = JSON.parse(row[col.field]);
      } catch {
        // Leave the raw string in place rather than throwing - matches
        // node-postgres's own behavior of just handing back whatever is
        // actually stored, malformed or not.
      }
    }
  }
  return row;
}

// Reference/"basic data" tables consumed by the frontend's BasicDataProvider.
// Keys match BasicDataProvider's state shape exactly.
export const BASIC_DATA_MAP = {
  company: 'company',
  companyHistory: 'company_history',
  customer: 'customer',
  positions: 'positions',
  officers: 'employee_officers',
  drivers: 'employee_drivers',
  creditors: 'employee_creditors',
  reghead: 'truck_registration',
  regtail: 'truck_registration_tail',
  small: 'truck_small',
  transport: 'truck_transport',
  depots: 'depot_oils',
  gasstation: 'depot_gas_stations',
  deductibleincome: 'deductibleincome',
  companypayment: 'companypayment',
  expenseitems: 'expenseitems',
  quotation: 'quotation',
  inspection: 'inspection',
  products: 'products',
};

// The 5 customer categories used to live in separate tables
// (customers_bigtruck, customers_smalltruck, ...); they're now one merged
// "customers" table (see importData.js) so order.TicketName/tickets.TicketName
// can FK into it. Kept as 5 separate basic-data keys anyway, filtered by
// Category, so none of the frontend pages that read these keys need to change.
export const CATEGORY_FILTERED_KEYS = {
  customerbigtruck: { table: 'customers', category: 'bigtruck' },
  customersmalltruck: { table: 'customers', category: 'smalltruck' },
  customergasstations: { table: 'customers', category: 'gasstations' },
  customertickets: { table: 'customers', category: 'tickets' },
  customertransports: { table: 'customers', category: 'transports' },
};
