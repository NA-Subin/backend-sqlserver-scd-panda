import { getManifest } from './schema-manifest.js';

// SQL-Server port of the Postgres backend's importData.js. Every piece of
// pure business logic below (FK resolution, the 5-way customers merge,
// duplicate-id dedup, synthetic columns, discriminator fields) is ported
// UNCHANGED from that file - only the actual SQL text this emits is T-SQL
// instead of Postgres SQL:
//   - JSONB/BOOLEAN/UUID/TEXT are still the abstract manifest type names
//     (everything else in this codebase keys off them - schema-manifest.js,
//     tables.js, parseJsonColumns) - only translated to a real T-SQL type
//     keyword (sqlTypeFor below) at the point a CREATE/ALTER TABLE statement
//     is actually written out.
//   - 'value'::jsonb -> just N'value' (JSONB columns are NVARCHAR(MAX) text
//     here, no native JSON type/cast).
//   - TRUE/FALSE -> 1/0 (T-SQL BIT literals).
//   - every string literal gets an N'...' prefix - this app's data is
//     Thai-heavy, and a plain '...' literal would silently mangle non-ASCII
//     text once bound into an NVARCHAR column.
//   - DROP TABLE ... CASCADE has no T-SQL equivalent - dropTableCascadeSql()
//     below emits a small dynamic-SQL preamble that finds and drops any FK
//     constraint pointing at the table first, then drops the table, which is
//     the same net effect.
//   - the company_history-from-company.history derivation uses OPENJSON/
//     JSON_VALUE/JSON_QUERY instead of jsonb_array_elements/->>/->, and
//     NEWID() instead of gen_random_uuid().
//   - the FK backfill UPDATE...FROM(VALUES) pattern uses T-SQL's
//     UPDATE alias SET ... FROM table AS alias JOIN (VALUES ...) AS v(...)
//     ON ... shape instead of Postgres's UPDATE table AS alias SET ... FROM.
//   - current_schema() -> SCHEMA_NAME().
// See the Postgres backend's src/importData.js for the original, more
// detailed comments on every business-logic piece below - kept verbatim.

const NAMESPACE_NODES = new Set(['customers', 'depot', 'employee', 'report', 'truck']);

const CUSTOMER_CATEGORIES = new Set(['bigtruck', 'smalltruck', 'gasstations', 'tickets', 'transports']);
const CUSTOMER_MERGE_DROP_FIELDS = ['companyName', 'creditTime'];

const TICKET_NAME_DISCRIMINATOR = {
  target: 'customers',
  discriminatorField: 'CustomerType',
  discriminatorMap: {
    'ตั๋วน้ำมัน': 'tickets',
    'ตั๋วปั้ม': 'gasstations',
    'ตั๋วรับจ้างขนส่ง': 'transports',
    'ตั๋วรถใหญ่': 'bigtruck',
    'ตั๋วรถเล็ก': 'smalltruck',
    'ตั๋วเปล่า': null,
  },
};

function resolveDiscriminatorCategory(fk, record) {
  const discValue = record[fk.discriminatorField];
  const isKnownBlank = discValue in fk.discriminatorMap && fk.discriminatorMap[discValue] == null;
  return { category: fk.discriminatorMap[discValue], isKnownBlank };
}

const FK_FIELDS = {
  customers: { Company: { target: 'company' } },
  employee_drivers: {
    Position: { target: 'positions' },
    Registration: {
      splitByTruckType: {
        'รถใหญ่': { target: 'truck_registration', field: 'Registration', column: 'registration', nameField: 'RegistrationName', nameColumn: 'registration_name' },
        'รถเล็ก': { target: 'truck_small', field: 'RegistrationSmall', column: 'registration_small', nameField: 'RegistrationSmallName', nameColumn: 'registration_small_name' },
      },
    },
  },
  employee_officers: { Position: { target: 'positions' }, GasStation: { target: 'depot_gas_stations' } },
  inspection: { Employee: { target: 'employee_drivers' }, employee: { target: 'employee_drivers' } },
  invoice: {
    Transport: { target: 'company' },
    TicketName: {
      target: 'customers',
      discriminatorField: 'TicketType',
      discriminatorMap: TICKET_NAME_DISCRIMINATOR.discriminatorMap,
    },
  },
  order: {
    Driver: { target: 'employee_drivers' },
    Registration: { target: 'truck_registration' },
    TicketName: TICKET_NAME_DISCRIMINATOR,
  },
  quotation: {
    Company: { target: 'company' },
    Employee: { target: 'employee_officers' },
    Customer: {
      target: 'customers',
      discriminatorField: 'Truck',
      discriminatorMap: {
        'รถใหญ่': 'bigtruck',
        'รถเล็ก': 'smalltruck',
      },
    },
  },
  report_financial: {
    Driver: { target: 'employee_drivers' },
    RegHead: { target: 'truck_registration' },
    RegTail: { target: 'truck_registration_tail' },
    Name: { target: 'deductibleincome' },
  },
  report_invoice: {
    Bank: { target: 'expenseitems' },
    Company: { target: 'companypayment' },
    Registration: {
      splitByTruckType: {
        'หัวรถใหญ่': { target: 'truck_registration', field: 'RegistrationHead', column: 'registration_head', nameField: 'RegistrationHeadName', nameColumn: 'registration_head_name' },
        'หางรถใหญ่': { target: 'truck_registration_tail', field: 'RegistrationTail', column: 'registration_tail', nameField: 'RegistrationTailName', nameColumn: 'registration_tail_name' },
        'รถเล็ก': { target: 'truck_small', field: 'RegistrationSmall', column: 'registration_small', nameField: 'RegistrationSmallName', nameColumn: 'registration_small_name' },
      },
    },
  },
  tickets: {
    Driver: { target: 'employee_drivers' },
    Registration: { target: 'truck_registration' },
    TicketName: TICKET_NAME_DISCRIMINATOR,
  },
  transfermoney: {
    BankName: { target: 'banks' },
    Transport: { target: 'company' },
    TicketName: {
      target: 'customers',
      discriminatorField: 'TicketType',
      discriminatorMap: TICKET_NAME_DISCRIMINATOR.discriminatorMap,
    },
  },
  trip: { Driver: { target: 'employee_drivers' }, Registration: { target: 'truck_registration' } },
  truck_registration: {
    Driver: { target: 'employee_drivers' },
    RegTail: { target: 'truck_registration_tail' },
    Company: { target: 'company' },
  },
  truck_registration_tail: { Company: { target: 'company' } },
  truck_small: { Company: { target: 'company' }, Driver: { target: 'employee_drivers' } },
  truck_transport: { Company: { target: 'company' } },
  depot_gas_stations: { Stock: { target: 'depot_stock' } },
};

function computeFkTargetTables() {
  const targets = new Set();
  for (const fields of Object.values(FK_FIELDS)) {
    for (const fk of Object.values(fields)) {
      if (fk.target) targets.add(fk.target);
      if (fk.splitByTruckType) {
        for (const dest of Object.values(fk.splitByTruckType)) targets.add(dest.target);
      }
    }
  }
  return targets;
}
const FK_TARGET_TABLES = computeFkTargetTables();

const NON_FIREBASE_TABLES = new Set(['company_history', 'customer']);

const PRODUCT_TH_NAME = {
  G95: 'แก๊สโซฮอล์ 95',
  G91: 'แก๊สโซฮอล์ 91',
  'B7(D)': 'ดีเซล B7',
  B95: 'เบนซิน 95',
  B10: 'ดีเซล B10',
  B20: 'ดีเซล B20',
  E20: 'แก๊สโซฮอล์ E20',
  E85: 'แก๊สโซฮอล์ E85',
  PWD: 'ดีเซลพรีเมียม (Premium Diesel)',
  ULG95: 'เบนซิน 95 (ULG)',
};

const SYNTHETIC_COLUMNS = {
  products: [
    {
      field: 'NameTH',
      column: 'name_th',
      type: 'TEXT',
      compute: (record) => PRODUCT_TH_NAME[record.Product_name] || null,
    },
    {
      field: 'IsActive',
      column: 'is_active',
      type: 'BOOLEAN',
      compute: () => true,
    },
  ],
};

function toSnakeCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function quoteIdent(name) {
  return '"' + name.replace(/"/g, '""') + '"';
}

function escapeText(str) {
  return str.replace(/'/g, "''");
}

// Abstract manifest type name -> real T-SQL column type keyword. Only used
// when emitting CREATE/ALTER TABLE DDL - every other place in this file
// (and the rest of the codebase) keeps using the abstract name.
function sqlTypeFor(type) {
  switch (type) {
    case 'JSONB':
    case 'TEXT':
      return 'NVARCHAR(MAX)';
    case 'NUMERIC':
      return 'FLOAT';
    case 'BOOLEAN':
      return 'BIT';
    case 'UUID':
      return 'UNIQUEIDENTIFIER';
    default:
      return 'NVARCHAR(MAX)';
  }
}

function parseIdName(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d+):([\s\S]*)$/);
  if (!m) return null;
  return { id: parseInt(m[1], 10), name: m[2].trim() };
}

function classifyColumns(tableName, rows) {
  const fieldTypes = {};
  const fieldHasObject = {};
  const fieldOrder = [];
  const fkFields = FK_FIELDS[tableName] || {};

  for (const { record } of rows) {
    for (const field of Object.keys(record)) {
      if (!(field in fieldTypes)) {
        fieldTypes[field] = new Set();
        fieldHasObject[field] = false;
        fieldOrder.push(field);
      }
      const v = record[field];
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') fieldHasObject[field] = true;
      else fieldTypes[field].add(typeof v);
    }
  }

  const usedNames = new Set();
  const fieldSet = new Set(fieldOrder);
  const columns = [];

  for (const field of fieldOrder) {
    if (fkFields[field]?.splitByTruckType) {
      for (const [truckType, dest] of Object.entries(fkFields[field].splitByTruckType)) {
        usedNames.add(dest.column);
        usedNames.add(dest.nameColumn);
        columns.push({
          field: dest.field,
          column: dest.column,
          type: 'UUID',
          splitFk: { sourceField: field, truckType, target: dest.target },
        });
        columns.push({
          field: dest.nameField,
          column: dest.nameColumn,
          type: 'TEXT',
          splitFkNameFor: { sourceField: field, truckType },
        });
      }
      continue;
    }

    if (fkFields[field]) {
      const fkConfig = fkFields[field];
      let idColumn = toSnakeCase(field);
      if (usedNames.has(idColumn)) {
        let n = 2;
        while (usedNames.has(`${idColumn}_${n}`)) n++;
        idColumn = `${idColumn}_${n}`;
      }
      const nameField = fieldSet.has(`${field}Name`) ? `${field}RefName` : `${field}Name`;
      const nameColumn = `${idColumn}_name`;
      usedNames.add(idColumn);
      usedNames.add(nameColumn);
      columns.push({ field, column: idColumn, type: 'UUID', fk: fkConfig, fkNameField: nameField });
      columns.push({ field: nameField, column: nameColumn, type: 'TEXT', isFkNameFor: field });
      continue;
    }

    let type;
    if (fieldHasObject[field]) type = 'JSONB';
    else {
      const types = fieldTypes[field];
      if (types.size === 0) type = 'TEXT';
      else if (types.size === 1 && types.has('boolean')) type = 'BOOLEAN';
      else if (types.size === 1 && types.has('number')) type = 'NUMERIC';
      else type = 'TEXT';
    }
    let column = toSnakeCase(field);
    if (usedNames.has(column)) {
      let n = 2;
      while (usedNames.has(`${column}_${n}`)) n++;
      column = `${column}_${n}`;
    }
    usedNames.add(column);
    columns.push({ field, column, type });
  }

  for (const synth of SYNTHETIC_COLUMNS[tableName] || []) {
    let column = synth.column;
    if (usedNames.has(column)) {
      let n = 2;
      while (usedNames.has(`${column}_${n}`)) n++;
      column = `${column}_${n}`;
    }
    usedNames.add(column);
    columns.push({ field: synth.field, column, type: synth.type, synthetic: synth });
  }

  return columns;
}

function formatValue(v, type) {
  if (v === null || v === undefined) return 'NULL';
  if (type === 'JSONB') return "N'" + escapeText(JSON.stringify(v)) + "'";
  if (type === 'BOOLEAN') return v ? '1' : '0';
  if (type === 'NUMERIC') return typeof v === 'number' && Number.isFinite(v) ? String(v) : 'NULL';
  if (type === 'UUID') return v ? `'${v}'` : 'NULL';
  return "N'" + escapeText(String(v)) + "'";
}

// T-SQL has no DROP TABLE ... CASCADE - this finds and drops any FK
// constraint pointing AT the table first (dynamic SQL, since the constraint
// names aren't known ahead of time), then drops the table itself. Wrapped in
// IF OBJECT_ID(...) IS NOT NULL for the same idempotency DROP TABLE IF
// EXISTS gives on the Postgres side.
function dropTableCascadeSql(tableName) {
  const qTable = quoteIdent(tableName);
  // T-SQL local variables are scoped to the whole BATCH, not to a BEGIN/END
  // block - dropping several tables in one script (the normal case for a
  // full-replace import) means this function's own output appears many
  // times in the same batch, so the variable name has to be unique per
  // table or the 2nd+ DECLARE fails with "already declared" (confirmed
  // empirically). Table names are already required to be plain
  // [A-Za-z0-9_]+ (same assumption toBracketIdentifiers's bracket-quoting
  // relies on), so it's safe to fold directly into the variable name.
  const varName = `@fkSql_${tableName}`;
  return `IF OBJECT_ID(N'dbo.${tableName}', N'U') IS NOT NULL
BEGIN
  DECLARE ${varName} NVARCHAR(MAX) = N'';
  SELECT ${varName} += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
  FROM sys.foreign_keys fk
  WHERE fk.referenced_object_id = OBJECT_ID(N'dbo.${tableName}');
  IF LEN(${varName}) > 0 EXEC sp_executesql ${varName};
  DROP TABLE ${qTable};
END`;
}

const BATCH_SIZE = 500;

const KNOWN_DATA_CORRECTIONS = [
  {
    path: ['order', '197'],
    field: 'CustomerType',
    expectedOld: '-',
    newValue: 'ตั๋วรถเล็ก',
  },
];

function applyKnownDataCorrections(data) {
  for (const { path, field, expectedOld, newValue } of KNOWN_DATA_CORRECTIONS) {
    const [table, rowKey] = path;
    const record = data?.[table]?.[rowKey];
    if (!record || record[field] !== expectedOld) {
      continue;
    }
    record[field] = newValue;
    console.log(`[import] applied known correction: ${table}/${rowKey}.${field} ${JSON.stringify(expectedOld)} -> ${JSON.stringify(newValue)}`);
  }
}

function parseFirebaseTables(data) {
  if (!data || typeof data !== 'object') {
    const err = new Error('Uploaded file is not a valid JSON object');
    err.status = 400;
    throw err;
  }

  applyKnownDataCorrections(data);

  const tables = {};
  const warnings = [];
  function addTable(tableName, obj) {
    const rows = [];
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      rows.push({ rowKey: key, record: val === null || typeof val !== 'object' ? { value: val } : val });
    }
    tables[tableName] = rows;
  }

  function addMergedCustomers(customersNode) {
    const rows = [];
    for (const subKey of Object.keys(customersNode)) {
      const subVal = customersNode[subKey];
      if (!subVal || typeof subVal !== 'object') continue;
      if (!CUSTOMER_CATEGORIES.has(subKey)) {
        warnings.push(
          `พบหมวดหมู่ลูกค้า "customers/${subKey}" ที่ไม่รู้จัก (${Object.keys(subVal).length} แถว) ` +
            `ข้อมูลส่วนนี้ไม่ถูกนำเข้า ต้องเพิ่มหมวดหมู่นี้ในโค้ด (CUSTOMER_CATEGORIES) ก่อน`
        );
        continue;
      }
      for (const rowKey of Object.keys(subVal)) {
        const val = subVal[rowKey];
        const record = val === null || typeof val !== 'object' ? { value: val } : { ...val };
        for (const dropField of CUSTOMER_MERGE_DROP_FIELDS) delete record[dropField];
        record.Category = subKey;
        rows.push({ rowKey: `${subKey}_${rowKey}`, record });
      }
    }
    if (rows.length) tables.customers = rows;
  }

  for (const topKey of Object.keys(data)) {
    const topVal = data[topKey];
    if (!topVal || typeof topVal !== 'object') continue;
    const tableBase = toSnakeCase(topKey);
    if (topKey === 'customers') {
      addMergedCustomers(topVal);
    } else if (NAMESPACE_NODES.has(topKey)) {
      for (const subKey of Object.keys(topVal)) {
        const subVal = topVal[subKey];
        if (!subVal || typeof subVal !== 'object') continue;
        addTable(`${tableBase}_${toSnakeCase(subKey)}`, subVal);
      }
    } else {
      addTable(tableBase, topVal);
    }
  }

  if (!Object.keys(tables).length) {
    const err = new Error('No importable tables found in the uploaded JSON');
    err.status = 400;
    throw err;
  }

  deduplicateFkTargetIds(tables);

  return { tables, warnings };
}

function deduplicateFkTargetIds(tables) {
  for (const [table, rows] of Object.entries(tables)) {
    if (!FK_TARGET_TABLES.has(table)) continue;
    const isCustomers = table === 'customers';

    const seenByScope = {};
    const nextFreshIdByScope = {};
    for (const { record } of rows) {
      if (typeof record.id !== 'number') continue;
      const scope = isCustomers ? record.Category : '_';
      if (!(scope in nextFreshIdByScope) || record.id >= nextFreshIdByScope[scope]) {
        nextFreshIdByScope[scope] = record.id + 1;
      }
    }

    for (const { record } of rows) {
      if (typeof record.id !== 'number') continue;
      const scope = isCustomers ? record.Category : '_';
      const seen = (seenByScope[scope] ??= new Set());
      if (seen.has(record.id)) {
        const freshId = nextFreshIdByScope[scope]++;
        console.log(`[import] reassigned duplicate id: ${table}${isCustomers ? ` (${scope})` : ''} id ${record.id} -> ${freshId}`);
        record.id = freshId;
      }
      seen.add(record.id);
    }
  }
}

export function buildImportPlan(data) {
  const { tables, warnings } = parseFirebaseTables(data);
  const tableNames = Object.keys(tables).sort();

  const missingTables = Object.keys(getManifest()).filter(
    (t) => !tableNames.includes(t) && !NON_FIREBASE_TABLES.has(t)
  );
  if (missingTables.length) {
    warnings.push(
      `ไฟล์นี้ไม่มีตาราง: ${missingTables.join(', ')} - ตารางเหล่านี้จะไม่ถูกแตะต้อง (ข้อมูลเดิมยังอยู่ครบ) ` +
        `หากคาดว่าไฟล์นี้ควรมีตารางเหล่านี้ด้วย ควรตรวจสอบไฟล์ต้นฉบับก่อน`
    );
  }

  const uuidByTableRowKey = {};
  const uuidByTableId = {};
  for (const [table, rows] of Object.entries(tables)) {
    uuidByTableRowKey[table] = {};
    uuidByTableId[table] = {};
    for (const { rowKey, record } of rows) {
      const uuid = crypto.randomUUID();
      uuidByTableRowKey[table][rowKey] = uuid;
      if (typeof record.id !== 'number') continue;
      if (table === 'customers') {
        (uuidByTableId[table][record.Category] ??= {})[record.id] = uuid;
      } else {
        uuidByTableId[table][record.id] = uuid;
      }
    }
  }

  const manifest = { ...getManifest() };
  const summary = [];
  const fkNullCounts = {};
  const fkConstraints = [];
  const sqlParts = ['BEGIN TRANSACTION;'];
  let companyHasHistoryColumn = false;

  for (const tableName of tableNames) {
    const rows = tables[tableName];
    const columns = classifyColumns(tableName, rows);
    const qTable = quoteIdent(tableName);
    if (tableName === 'company' && columns.some((c) => c.column === 'history')) {
      companyHasHistoryColumn = true;
    }

    manifest[tableName] = {
      primaryKey: 'uuid',
      rowCount: rows.length,
      columns: columns.map((c) => ({ field: c.field, column: c.column, type: c.type })),
    };
    summary.push({ table: tableName, rows: rows.length });

    sqlParts.push(dropTableCascadeSql(tableName));
    const colDefs = [
      `  ${quoteIdent('uuid')} UNIQUEIDENTIFIER PRIMARY KEY`,
      `  ${quoteIdent('row_key')} NVARCHAR(MAX)`,
    ];
    for (const col of columns) colDefs.push(`  ${quoteIdent(col.column)} ${sqlTypeFor(col.type)}`);
    sqlParts.push(`CREATE TABLE ${qTable} (\n${colDefs.join(',\n')}\n);`);

    for (const col of columns) {
      if (col.fk) fkConstraints.push({ table: tableName, column: col.column, targetTable: col.fk.target });
      else if (col.splitFk) fkConstraints.push({ table: tableName, column: col.column, targetTable: col.splitFk.target });
    }

    if (rows.length > 0) {
      const colNames = [quoteIdent('uuid'), quoteIdent('row_key'), ...columns.map((c) => quoteIdent(c.column))];
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const valueLines = batch.map(({ rowKey, record }) => {
          const vals = [
            `'${uuidByTableRowKey[tableName][rowKey]}'`,
            `N'${escapeText(rowKey)}'`,
          ];
          for (const col of columns) {
            if (col.fk) {
              const parsed = parseIdName(record[col.field]);
              let targetUuid;
              let isKnownBlank = false;
              if (parsed && col.fk.discriminatorField) {
                const resolved = resolveDiscriminatorCategory(col.fk, record);
                isKnownBlank = resolved.isKnownBlank;
                targetUuid = resolved.category ? uuidByTableId[col.fk.target]?.[resolved.category]?.[parsed.id] : undefined;
              } else if (parsed) {
                targetUuid = uuidByTableId[col.fk.target]?.[parsed.id];
              }
              if (parsed && !targetUuid && parsed.id !== 0 && !isKnownBlank) {
                const key = `${tableName}.${col.field}`;
                fkNullCounts[key] = (fkNullCounts[key] || 0) + 1;
              }
              vals.push(formatValue(targetUuid || null, 'UUID'));
            } else if (col.isFkNameFor) {
              const parsed = parseIdName(record[col.isFkNameFor]);
              const name = parsed ? parsed.name : record[col.isFkNameFor] ?? null;
              vals.push(formatValue(name, 'TEXT'));
            } else if (col.splitFk) {
              const matches = record.TruckType === col.splitFk.truckType;
              const parsed = matches ? parseIdName(record[col.splitFk.sourceField]) : null;
              const targetUuid = parsed ? uuidByTableId[col.splitFk.target]?.[parsed.id] : undefined;
              if (matches && parsed && !targetUuid && parsed.id !== 0) {
                const key = `${tableName}.${col.field}`;
                fkNullCounts[key] = (fkNullCounts[key] || 0) + 1;
              }
              vals.push(formatValue(targetUuid || null, 'UUID'));
            } else if (col.splitFkNameFor) {
              const matches = record.TruckType === col.splitFkNameFor.truckType;
              const parsed = matches ? parseIdName(record[col.splitFkNameFor.sourceField]) : null;
              const name = matches ? (parsed ? parsed.name : record[col.splitFkNameFor.sourceField] ?? null) : null;
              vals.push(formatValue(name, 'TEXT'));
            } else if (col.synthetic) {
              vals.push(formatValue(col.synthetic.compute(record), col.type));
            } else {
              vals.push(formatValue(record[col.field], col.type));
            }
          }
          return '  (' + vals.join(', ') + ')';
        });
        sqlParts.push(`INSERT INTO ${qTable} (${colNames.join(', ')}) VALUES\n${valueLines.join(',\n')};`);
      }
    }
  }

  for (const fk of fkConstraints) {
    const constraintName = `${fk.table}_${fk.column}_fkey`;
    sqlParts.push(
      `ALTER TABLE ${quoteIdent(fk.table)} ADD CONSTRAINT ${quoteIdent(constraintName)} ` +
        `FOREIGN KEY (${quoteIdent(fk.column)}) REFERENCES ${quoteIdent(fk.targetTable)} ("uuid");`
    );
  }

  if (companyHasHistoryColumn) {
    sqlParts.push(dropTableCascadeSql('company_history'));
    sqlParts.push(`CREATE TABLE "company_history" (
  "uuid" UNIQUEIDENTIFIER PRIMARY KEY,
  "row_key" NVARCHAR(MAX),
  "company" UNIQUEIDENTIFIER REFERENCES "company" ("uuid"),
  "name" NVARCHAR(MAX),
  "card_id" NVARCHAR(MAX),
  "address" NVARCHAR(MAX),
  "date_start" NVARCHAR(MAX),
  "date_end" NVARCHAR(MAX)
);`);
    // OPENJSON without an explicit schema gives (key, value, type) columns -
    // entry.value is the raw JSON text of that array element, so JSON_VALUE/
    // JSON_QUERY against '$.Field' reads that element's own fields. The
    // LEFT(...)='[' check is the T-SQL stand-in for jsonb_typeof(...)='array'
    // (no built-in JSON-type function) - "history" is always either absent
    // or a JSON array in the real data.
    sqlParts.push(`INSERT INTO "company_history" ("uuid", "row_key", "company", "name", "card_id", "address", "date_start", "date_end")
SELECT NEWID(), CONVERT(NVARCHAR(MAX), NEWID()), c."uuid", JSON_VALUE(entry.value, '$.Name'), JSON_VALUE(entry.value, '$.CardID'), JSON_QUERY(entry.value, '$.Address'), JSON_VALUE(entry.value, '$.DateStart'), JSON_VALUE(entry.value, '$.DateEnd')
FROM "company" c
CROSS APPLY OPENJSON(c."history") AS entry
WHERE c."history" IS NOT NULL AND ISJSON(c."history") = 1 AND LEFT(LTRIM(c."history"), 1) = '[';`);
    manifest.company_history = {
      primaryKey: 'uuid',
      rowCount: null,
      columns: [
        { field: 'Company', column: 'company', type: 'UUID' },
        { field: 'Name', column: 'name', type: 'TEXT' },
        { field: 'CardID', column: 'card_id', type: 'TEXT' },
        { field: 'Address', column: 'address', type: 'JSONB' },
        { field: 'DateStart', column: 'date_start', type: 'TEXT' },
        { field: 'DateEnd', column: 'date_end', type: 'TEXT' },
      ],
    };
  } else {
    delete manifest.company_history;
  }

  sqlParts.push(`IF OBJECT_ID(N'dbo.customer', N'U') IS NULL
CREATE TABLE "customer" (
  "uuid" UNIQUEIDENTIFIER PRIMARY KEY,
  "row_key" NVARCHAR(MAX),
  "name" NVARCHAR(MAX),
  "address" NVARCHAR(MAX),
  "lat" NVARCHAR(MAX),
  "lng" NVARCHAR(MAX),
  "credit" NVARCHAR(MAX),
  "credit_time" NVARCHAR(MAX),
  "debt" NVARCHAR(MAX),
  "id_card" NVARCHAR(MAX),
  "phone" NVARCHAR(MAX),
  "id" FLOAT
);`);
  if (!manifest.customer) {
    manifest.customer = {
      primaryKey: 'uuid',
      rowCount: 0,
      columns: [
        { field: 'Name', column: 'name', type: 'TEXT' },
        { field: 'Address', column: 'address', type: 'TEXT' },
        { field: 'Lat', column: 'lat', type: 'TEXT' },
        { field: 'Lng', column: 'lng', type: 'TEXT' },
        { field: 'Credit', column: 'credit', type: 'TEXT' },
        { field: 'CreditTime', column: 'credit_time', type: 'TEXT' },
        { field: 'Debt', column: 'debt', type: 'TEXT' },
        { field: 'IdCard', column: 'id_card', type: 'TEXT' },
        { field: 'Phone', column: 'phone', type: 'TEXT' },
        { field: 'id', column: 'id', type: 'NUMERIC' },
      ],
    };
  }

  sqlParts.push('COMMIT TRANSACTION;');

  const fkSummary = Object.entries(fkNullCounts).map(([key, count]) => ({ field: key, unresolvedRefs: count }));

  return { sql: sqlParts.join('\n'), manifest, summary, fkSummary, warnings };
}

function quoteIdentPlain(name) {
  return name.replace(/"/g, '""');
}

export async function buildIncrementalImportPlan(data, pool) {
  const { tables, warnings } = parseFirebaseTables(data);
  const tableNames = Object.keys(tables).sort();

  const manifest = { ...getManifest() };
  const sqlParts = ['BEGIN TRANSACTION;'];
  // ALTER TABLE ... ADD <col> statements have to run and COMMIT in their own
  // batch before anything in the same script can reference that column -
  // T-SQL only resolves a column added via ALTER TABLE ADD against LATER
  // batches, not later statements in the same one (confirmed empirically:
  // "ALTER TABLE x ADD col; INSERT INTO x (col) VALUES (...);" in one batch
  // fails with "Invalid column name" even though the ALTER itself succeeds).
  // CREATE TABLE has no such restriction - a table created earlier in the
  // same batch is immediately insertable, so only this path needs splitting.
  const alterSqlParts = [];
  const summary = [];
  const fkNullCounts = {};
  const manifestUpdates = {};

  const { rows: existingTableRows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = SCHEMA_NAME()`
  );
  const existingTableNames = new Set(existingTableRows.map((r) => r.table_name));

  const existingIdMapCache = {};
  async function loadExistingIdMap(targetTable) {
    if (existingIdMapCache[targetTable]) return existingIdMapCache[targetTable];
    if (!existingTableNames.has(targetTable)) {
      existingIdMapCache[targetTable] = {};
      return existingIdMapCache[targetTable];
    }
    if (targetTable === 'customers') {
      const { rows } = await pool.query(`SELECT "category", "id", "uuid" FROM "customers" WHERE "id" IS NOT NULL`);
      const map = {};
      for (const r of rows) {
        (map[r.category] ??= {})[Number(r.id)] = r.uuid;
      }
      existingIdMapCache[targetTable] = map;
    } else {
      const { rows } = await pool.query(`SELECT "id", "uuid" FROM "${quoteIdentPlain(targetTable)}" WHERE "id" IS NOT NULL`);
      const map = {};
      for (const r of rows) map[Number(r.id)] = r.uuid;
      existingIdMapCache[targetTable] = map;
    }
    return existingIdMapCache[targetTable];
  }

  const newRowsByTable = {};
  const freshUuidByRowKey = {};
  const freshIdMapByTable = {};

  for (const tableName of tableNames) {
    const rows = tables[tableName];
    const tableExists = existingTableNames.has(tableName);

    let newRows = rows;
    if (tableExists) {
      const { rows: keyRows } = await pool.query(`SELECT "row_key" FROM "${quoteIdentPlain(tableName)}"`);
      const existingRowKeys = new Set(keyRows.map((r) => r.row_key));
      newRows = rows.filter((r) => !existingRowKeys.has(r.rowKey));
    }

    newRowsByTable[tableName] = newRows;
    summary.push({ table: tableName, newRows: newRows.length, skippedExisting: rows.length - newRows.length });

    const idMap = {};
    for (const { rowKey, record } of newRows) {
      const uuid = crypto.randomUUID();
      freshUuidByRowKey[`${tableName} ${rowKey}`] = uuid;
      if (typeof record.id !== 'number') continue;
      if (tableName === 'customers') {
        (idMap[record.Category] ??= {})[record.id] = uuid;
      } else {
        idMap[record.id] = uuid;
      }
    }
    freshIdMapByTable[tableName] = idMap;
  }

  const pendingFkBackfill = [];
  const newTableFkConstraints = [];

  async function appendInsertsAndConstraints(tableName, qTable, columns, newRows, isNewTable) {
    if (newRows.length === 0) return;

    if (isNewTable) {
      for (const col of columns) {
        if (col.fk) newTableFkConstraints.push({ qTable, column: col.column, target: col.fk.target });
        else if (col.splitFk) newTableFkConstraints.push({ qTable, column: col.column, target: col.splitFk.target });
      }
    }

    const colNames = [quoteIdent('uuid'), quoteIdent('row_key'), ...columns.map((c) => quoteIdent(c.column))];
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const valueLines = [];
      for (const { rowKey, record } of batch) {
        const rowUuid = freshUuidByRowKey[`${tableName} ${rowKey}`];
        const vals = [`'${rowUuid}'`, `N'${escapeText(rowKey)}'`];
        for (const col of columns) {
          if (col.fk) {
            const parsed = parseIdName(record[col.field]);
            if (parsed) {
              pendingFkBackfill.push({ tableName, qTable, column: col.column, rowUuid, parsed, fk: col.fk, record });
            }
            vals.push('NULL');
          } else if (col.isFkNameFor) {
            const parsed = parseIdName(record[col.isFkNameFor]);
            const name = parsed ? parsed.name : (record[col.isFkNameFor] ?? null);
            vals.push(formatValue(name, 'TEXT'));
          } else if (col.splitFk) {
            const matches = record.TruckType === col.splitFk.truckType;
            const parsed = matches ? parseIdName(record[col.splitFk.sourceField]) : null;
            if (parsed) {
              pendingFkBackfill.push({
                tableName,
                qTable,
                column: col.column,
                rowUuid,
                parsed,
                fk: { target: col.splitFk.target },
                record,
              });
            }
            vals.push('NULL');
          } else if (col.splitFkNameFor) {
            const matches = record.TruckType === col.splitFkNameFor.truckType;
            const parsed = matches ? parseIdName(record[col.splitFkNameFor.sourceField]) : null;
            const name = matches ? (parsed ? parsed.name : record[col.splitFkNameFor.sourceField] ?? null) : null;
            vals.push(formatValue(name, 'TEXT'));
          } else if (col.synthetic) {
            vals.push(formatValue(col.synthetic.compute(record), col.type));
          } else {
            vals.push(formatValue(record[col.field], col.type));
          }
        }
        valueLines.push('  (' + vals.join(', ') + ')');
      }
      sqlParts.push(`INSERT INTO ${qTable} (${colNames.join(', ')}) VALUES\n${valueLines.join(',\n')};`);
    }
  }

  for (const tableName of tableNames) {
    const newRows = newRowsByTable[tableName];
    const qTable = quoteIdent(tableName);
    const tableExists = existingTableNames.has(tableName);

    if (!tableExists) {
      const columns = classifyColumns(tableName, newRows);
      manifest[tableName] = {
        primaryKey: 'uuid',
        rowCount: newRows.length,
        columns: columns.map((c) => ({ field: c.field, column: c.column, type: c.type })),
      };
      manifestUpdates[tableName] = manifest[tableName].columns;

      const colDefs = [
        `  ${quoteIdent('uuid')} UNIQUEIDENTIFIER PRIMARY KEY`,
        `  ${quoteIdent('row_key')} NVARCHAR(MAX)`,
      ];
      for (const col of columns) colDefs.push(`  ${quoteIdent(col.column)} ${sqlTypeFor(col.type)}`);
      sqlParts.push(`CREATE TABLE ${qTable} (\n${colDefs.join(',\n')}\n);`);

      await appendInsertsAndConstraints(tableName, qTable, columns, newRows, true);
      continue;
    }

    if (newRows.length === 0) continue;

    const columns = classifyColumns(tableName, newRows);
    const existingDef = manifest[tableName];
    const { rows: liveColumnRows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = SCHEMA_NAME() AND table_name = $1`,
      [tableName]
    );
    const existingColumnNames = new Set(liveColumnRows.map((r) => r.column_name));
    const columnsToAdd = columns.filter((c) => !existingColumnNames.has(c.column));

    for (const col of columnsToAdd) {
      alterSqlParts.push(`ALTER TABLE ${qTable} ADD ${quoteIdent(col.column)} ${sqlTypeFor(col.type)};`);
    }
    if (columnsToAdd.length) {
      manifest[tableName] = {
        ...existingDef,
        columns: [
          ...(existingDef?.columns || []),
          ...columnsToAdd.map((c) => ({ field: c.field, column: c.column, type: c.type })),
        ],
      };
      manifestUpdates[tableName] = manifest[tableName].columns;
    }

    await appendInsertsAndConstraints(tableName, qTable, columns, newRows, false);
  }

  const backfillByTableColumn = new Map();
  for (const { tableName, qTable, column, rowUuid, parsed, fk, record } of pendingFkBackfill) {
    const targetFresh = freshIdMapByTable[fk.target] || {};
    const targetExisting = await loadExistingIdMap(fk.target);
    let targetUuid;
    let isKnownBlank = false;
    if (fk.discriminatorField) {
      const resolved = resolveDiscriminatorCategory(fk, record);
      isKnownBlank = resolved.isKnownBlank;
      const category = resolved.category;
      targetUuid = (category && targetFresh[category]?.[parsed.id]) || (category && targetExisting[category]?.[parsed.id]);
    } else {
      targetUuid = targetFresh[parsed.id] ?? targetExisting[parsed.id];
    }
    if (!targetUuid && parsed.id !== 0 && !isKnownBlank) {
      const key = `${tableName}.${column}`;
      fkNullCounts[key] = (fkNullCounts[key] || 0) + 1;
    }
    const mapKey = `${qTable}:${column}`;
    if (!backfillByTableColumn.has(mapKey)) backfillByTableColumn.set(mapKey, []);
    backfillByTableColumn.get(mapKey).push({ rowUuid, targetUuid: targetUuid || null });
  }

  // T-SQL's UPDATE...FROM shape: the updated table must itself appear in the
  // FROM clause (joined to the VALUES list), unlike Postgres's
  // "UPDATE t AS alias SET ... FROM other_table". CAST(... AS
  // UNIQUEIDENTIFIER) is explicit here rather than relying on implicit
  // string->uniqueidentifier conversion, since a NULL target_uuid literal in
  // the VALUES list would otherwise have no type to infer from at all.
  for (const [mapKey, entries] of backfillByTableColumn) {
    const [qTable, column] = mapKey.split(':');
    const valuesList = entries
      .map((e) => `('${e.rowUuid}', ${e.targetUuid ? `'${e.targetUuid}'` : 'NULL'})`)
      .join(',\n  ');
    sqlParts.push(
      `UPDATE t SET t.${quoteIdent(column)} = CAST(v.target_uuid AS UNIQUEIDENTIFIER) ` +
        `FROM ${qTable} AS t INNER JOIN (VALUES\n  ${valuesList}\n) AS v(row_uuid, target_uuid) ` +
        `ON t."uuid" = CAST(v.row_uuid AS UNIQUEIDENTIFIER);`
    );
  }

  for (const { qTable, column, target } of newTableFkConstraints) {
    const constraintName = `${qTable.replace(/"/g, '')}_${column}_fkey`;
    sqlParts.push(
      `ALTER TABLE ${qTable} ADD CONSTRAINT ${quoteIdent(constraintName)} ` +
        `FOREIGN KEY (${quoteIdent(column)}) REFERENCES ${quoteIdent(target)} ("uuid");`
    );
  }

  sqlParts.push('COMMIT TRANSACTION;');

  const fkSummary = Object.entries(fkNullCounts).map(([key, count]) => ({ field: key, unresolvedRefs: count }));
  const totalNewRows = summary.reduce((sum, t) => sum + t.newRows, 0);

  return {
    // Must run (and fully commit) BEFORE `sql` below - see the alterSqlParts
    // comment above for why these can't share a batch with the INSERTs that
    // reference the newly-added columns.
    alterSql: alterSqlParts.length ? alterSqlParts.join('\n') : null,
    sql: totalNewRows > 0 ? sqlParts.join('\n') : null,
    manifest,
    summary,
    fkSummary,
    manifestUpdates,
    totalNewRows,
    warnings,
  };
}
