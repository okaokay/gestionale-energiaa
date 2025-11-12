const { pool } = require('./config/database.cjs');
const path = require('path');

// Nota: usa lo stesso adapter di produzione (cjs) per evitare transpile TS
async function getTableColumns(tableName) {
  try {
    const res = await pool.query(`SELECT name FROM pragma_table_info('${tableName}')`);
    return (res.rows || []).map(r => String(r.name)).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m = v.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = v.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

async function run() {
  const record = {
    tipo_record: 'cliente_privato',
    nome: 'Laura',
    cognome: 'Verdi',
    codice_fiscale: 'VRDLRA90A01H501Z',
    data_nascita: '1990-01-01',
    email_principale: 'laura.verdi@outlook.it',
    telefono_mobile: '3471234567',
    via_residenza: 'Via Nazionale',
    civico_residenza: '78',
    cap_residenza: '50123',
    citta_residenza: 'Firenze',
    provincia_residenza: 'FI'
  };

  const colsAvailable = await getTableColumns('clienti_privati');
  const id = require('crypto').randomUUID();
  const allFieldMap = {
    id,
    nome: record.nome || null,
    cognome: record.cognome || null,
    codice_fiscale: (record.codice_fiscale || '').toUpperCase() || null,
    data_nascita: normalizeDate(record.data_nascita || null),
    email_principale: (record.email_principale || '').toLowerCase() || null,
    telefono_mobile: record.telefono_mobile || null,
    via_residenza: record.via_residenza || null,
    civico_residenza: record.civico_residenza || null,
    cap_residenza: record.cap_residenza || null,
    citta_residenza: record.citta_residenza || null,
    provincia_residenza: record.provincia_residenza || null,
    consenso_privacy: 1,
    consenso_marketing: 1,
    data_consenso: new Date().toISOString(),
    created_by: null,
    created_at: new Date().toISOString()
  };

  const columns = [];
  const values = [];
  for (const [col, val] of Object.entries(allFieldMap)) {
    if (col === 'id' || colsAvailable.includes(col)) {
      columns.push(col);
      values.push(val);
    }
  }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  console.log('SQL preview:', `INSERT INTO clienti_privati (${columns.join(', ')}) VALUES (${placeholders})`);
  console.log('Params preview:', values);
  try {
    await pool.query(`INSERT INTO clienti_privati (${columns.join(', ')}) VALUES (${placeholders})`, values);
    console.log('✅ Inserimento riuscito con id', id);
  } catch (e) {
    console.error('❌ Inserimento fallito:', e.message);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });