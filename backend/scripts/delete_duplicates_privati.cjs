/**
 * Rimuove duplicati in `clienti_privati` per CF mantenendo un solo record.
 * CF target (da screenshot):
 * - Federica Marrone: MRRFDR86L30H501Q
 * - Valentina Viola:  VLVLNT87H20L736S
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const CF_LIST = [
  'MRRFDR86L30H501Q', // Federica Marrone
  'VLVLNT87H20L736S', // Valentina Viola
];

function getByCF(cf) {
  return db.prepare(`
    SELECT rowid as _rowid_, id, nome, cognome, codice_fiscale, created_at
    FROM clienti_privati
    WHERE codice_fiscale = ?
    ORDER BY datetime(created_at) DESC NULLS LAST, _rowid_ DESC
  `).all(cf);
}

function deleteById(id) {
  return db.prepare('DELETE FROM clienti_privati WHERE id = ?').run(id);
}

function deleteByRowId(rowid) {
  return db.prepare('DELETE FROM clienti_privati WHERE rowid = ?').run(rowid);
}

function main() {
  console.log('✅ DB:', dbPath);

  let totalDeleted = 0;

  const txn = db.transaction(() => {
    for (const cf of CF_LIST) {
      const rows = getByCF(cf);
      if (rows.length <= 1) {
        console.log(`CF ${cf}: ${rows.length} record (OK, nessun duplicato)`);
        continue;
      }

      console.log(`CF ${cf}: trovati ${rows.length} record, mantengo il più recente e cancello gli altri`);
      const keep = rows[0];
      const toDelete = rows.slice(1);

      console.log(`➡️  Mantengo id=${keep.id || 'NULL'} rowid=${keep._rowid_} created_at=${keep.created_at}`);
      for (const r of toDelete) {
        let res;
        if (r.id) {
          res = deleteById(r.id);
          console.log(`🗑️  Deleted by id=${r.id} (changes=${res.changes})`);
        } else {
          res = deleteByRowId(r._rowid_);
          console.log(`🗑️  Deleted by rowid=${r._rowid_} (changes=${res.changes})`);
        }
        totalDeleted += res.changes || 0;
      }
    }
  });

  try {
    txn();
    console.log(`✅ Completato. Record eliminati: ${totalDeleted}`);
  } catch (err) {
    console.error('❌ Errore rimozione duplicati:', err.message);
    process.exitCode = 1;
  }
}

main();