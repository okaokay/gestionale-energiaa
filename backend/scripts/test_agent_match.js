/**
 * Test rapido: risoluzione agente per nome
 * Uso: node backend/scripts/test_agent_match.js "NOME COGNOME"
 */

const { pool, closePool } = require('../config/database.cjs');

function normalizeName(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/[\'\.\-,]/g, '')
    .trim()
    .toLowerCase();
}

async function run() {
  const input = process.argv[2] || 'GIANLUCA MANCINI';
  const cleaned = normalizeName(input);
  console.log('🔎 Nome input:', input);
  console.log('🔎 Nome normalizzato:', cleaned);

  try {
    // Match esatto su nome+cognome normalizzati
    const q1 = `SELECT id, nome, cognome, email FROM users 
                WHERE LOWER(REPLACE(REPLACE(REPLACE(TRIM(nome || ' ' || cognome), '''', ''), '.', ''), ',', '')) = ? 
                   OR LOWER(REPLACE(REPLACE(REPLACE(TRIM(cognome || ' ' || nome), '''', ''), '.', ''), ',', '')) = ?
                LIMIT 1`;
    const r1 = await pool.query(q1, [cleaned, cleaned]);
    if (r1.rows && r1.rows.length) {
      const u = r1.rows[0];
      console.log('✅ Match full:', `${u.nome} ${u.cognome}`, 'ID:', u.id, 'Email:', u.email);
      return;
    }

    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts.slice(1).join(' ');
      const q2 = `SELECT id, nome, cognome, email FROM users 
                  WHERE LOWER(REPLACE(TRIM(nome), '''', '')) = ? 
                    AND LOWER(REPLACE(TRIM(cognome), '''', '')) = ? 
                  LIMIT 1`;
      const r2 = await pool.query(q2, [first, last]);
      if (r2.rows && r2.rows.length) {
        const u = r2.rows[0];
        console.log('✅ Match split:', `${u.nome} ${u.cognome}`, 'ID:', u.id, 'Email:', u.email);
        return;
      }
    } else {
      const q3 = `SELECT id, nome, cognome, email FROM users 
                  WHERE LOWER(REPLACE(TRIM(nome), '''', '')) = ? 
                     OR LOWER(REPLACE(TRIM(cognome), '''', '')) = ? 
                  LIMIT 1`;
      const r3 = await pool.query(q3, [cleaned, cleaned]);
      if (r3.rows && r3.rows.length) {
        const u = r3.rows[0];
        console.log('✅ Match single:', `${u.nome} ${u.cognome}`, 'ID:', u.id, 'Email:', u.email);
        return;
      }
    }

    console.log('❌ Nessun match trovato');
  } catch (err) {
    console.error('Errore test:', err && err.message);
  } finally {
    await closePool();
  }
}

run();