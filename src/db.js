import sql from 'mssql';

// Every route file in this project was ported from the Postgres backend and
// still writes queries in Postgres style ($1/$2/... placeholders,
// double-quoted identifiers) - rather than hand-translate each one to T-SQL
// (higher risk of introducing new bugs into logic that already works),
// pool.query() here rewrites that same SQL text into what SQL Server expects
// and normalizes the result shape back to { rows, rowCount }, so every
// existing route file works completely unchanged.

const config = {
  server: process.env.MSSQL_HOST,
  port: Number(process.env.MSSQL_PORT) || 1433,
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

const sqlPool = new sql.ConnectionPool(config);
const poolConnect = sqlPool.connect();
poolConnect.catch((err) => {
  console.error('SQL Server connection failed:', err.message);
});

// Applies `transform` only to the parts of `text` OUTSIDE single-quoted SQL
// string literals (a '' pair is the standard SQL-escaped quote within a
// literal). importData.js inlines raw JSON text - itself full of
// double-quoted keys, and occasionally a literal "$digit" in free-text data
// - directly into big literal SQL strings rather than binding it as a
// parameter (a deliberate, bulk-insert-friendly design carried over from the
// Postgres backend), so both identifier and placeholder rewriting below MUST
// skip over literal spans or they'll corrupt that inlined data instead of
// just rewriting real SQL syntax.
function outsideStringLiterals(text, transform) {
  const parts = text.split(/('(?:[^']|'')*')/g);
  return parts.map((part, i) => (i % 2 === 1 ? part : transform(part))).join('');
}

// Every identifier this codebase quotes is a plain alphanumeric/underscore
// name (table/column names from schema-manifest.json), never containing a
// literal quote - so a straight "x" -> [x] swap is safe here.
function toBracketIdentifiers(text) {
  return outsideStringLiterals(text, (part) => part.replace(/"([A-Za-z0-9_]+)"/g, '[$1]'));
}

// $1, $2, ... -> @p1, @p2, ... to match the request.input() names bound below.
function toNamedParams(text) {
  return outsideStringLiterals(text, (part) => part.replace(/\$(\d+)/g, '@p$1'));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// mssql/tedious always renders a UNIQUEIDENTIFIER column back out as an
// UPPERCASE string, whereas Postgres's uuid type (and every uuid this app
// itself generates, via crypto.randomUUID()) is always lowercase - without
// this, a uuid captured from a POST response and later compared (===)
// against the same row read back from a GET would silently never match.
// Every real uuid column in this schema is either the row's own "uuid" or a
// FK-style reference to another row's uuid, so lowercasing every value that
// looks like a GUID, regardless of which column it's in, is the correct,
// general fix rather than hardcoding a column allowlist.
function normalizeRow(row) {
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (typeof value === 'string' && UUID_RE.test(value)) {
      row[key] = value.toLowerCase();
    }
  }
  return row;
}

export const pool = {
  async query(text, params = []) {
    await poolConnect;
    const request = sqlPool.request();
    params.forEach((value, i) => {
      // mssql can't infer a type from a bare null, and throws instead of
      // treating it as "no type constraint" - NVarChar is a safe stand-in
      // since SQL Server allows NULL of any typed parameter to be assigned
      // into a column of a different type with no conversion error.
      if (value === null || value === undefined) {
        request.input(`p${i + 1}`, sql.NVarChar, null);
      } else {
        request.input(`p${i + 1}`, value);
      }
    });
    const tsql = toNamedParams(toBracketIdentifiers(text));
    const result = await request.query(tsql);
    return {
      rows: (result.recordset || []).map(normalizeRow),
      rowCount: result.rowsAffected.reduce((a, b) => a + b, 0),
    };
  },
};
