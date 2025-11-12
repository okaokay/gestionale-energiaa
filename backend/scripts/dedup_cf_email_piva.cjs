// Deduplica clienti e aziende su SQLite e riallinea contratti
// - clienti_privati: codice_fiscale, email_principale
// - clienti_aziende: partita_iva

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function main() {
  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), 'gestionale_energia.db');

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database non trovato: ${dbPath}`);
    process.exit(1);
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  function dedupPrivatiBy(column) {
    console.log(`\n🔍 Dedup clienti_privati per ${column}...`);
    const dups = db.prepare(`
      SELECT ${column} AS k, COUNT(*) AS c
      FROM clienti_privati
      WHERE ${column} IS NOT NULL AND TRIM(${column}) != ''
      GROUP BY ${column}
      HAVING COUNT(*) > 1
    `).all();
    if (dups.length === 0) {
      console.log('✅ Nessun duplicato trovato');
      return 0;
    }
    const tx = db.transaction((items) => {
      for (const d of items) {
        const rows = db.prepare(`
          SELECT rowid, id, ${column}, created_at, updated_at
          FROM clienti_privati
          WHERE ${column} = ?
          ORDER BY (updated_at IS NOT NULL) DESC, (created_at IS NOT NULL) DESC, rowid DESC
        `).all(d.k);
        const keeper = rows.find(r => r.id) || rows[0];
        const others = rows.filter(r => r !== keeper);
        if (!keeper) continue;
        // Riallinea contratti solo se abbiamo un id valido del keeper e degli altri
        if (keeper.id) {
          const validOtherIds = others.map(r => r.id).filter(Boolean);
          if (validOtherIds.length) {
            const placeholders = validOtherIds.map(() => '?').join(',');
            db.prepare(`UPDATE contratti_luce SET cliente_privato_id = ? WHERE cliente_privato_id IN (${placeholders})`).run(keeper.id, ...validOtherIds);
            db.prepare(`UPDATE contratti_gas SET cliente_privato_id = ? WHERE cliente_privato_id IN (${placeholders})`).run(keeper.id, ...validOtherIds);
          }
        }
        // Elimina duplicati usando rowid (gestisce id NULL)
        for (const o of others) {
          db.prepare('DELETE FROM clienti_privati WHERE rowid = ?').run(o.rowid);
          console.log(` - Eliminato duplicato privato rowid=${o.rowid} id=${o.id || 'NULL'} key=${d.k}`);
        }
      }
    });
    tx(dups);
    console.log(`✅ Dedup conclusa: ${dups.length} chiavi consolidate`);
    return dups.length;
  }

  function dedupAziendeByPiva() {
    console.log(`\n🔍 Dedup clienti_aziende per partita_iva...`);
    const dups = db.prepare(`
      SELECT partita_iva AS k, COUNT(*) AS c
      FROM clienti_aziende
      WHERE partita_iva IS NOT NULL AND TRIM(partita_iva) != ''
      GROUP BY partita_iva
      HAVING COUNT(*) > 1
    `).all();
    if (dups.length === 0) {
      console.log('✅ Nessun duplicato trovato');
      return 0;
    }
    const tx = db.transaction((items) => {
      for (const d of items) {
        const rows = db.prepare(`
          SELECT rowid, id, partita_iva, created_at, updated_at
          FROM clienti_aziende
          WHERE partita_iva = ?
          ORDER BY (updated_at IS NOT NULL) DESC, (created_at IS NOT NULL) DESC, rowid DESC
        `).all(d.k);
        const keeper = rows.find(r => r.id) || rows[0];
        const others = rows.filter(r => r !== keeper);
        if (!keeper) continue;
        // Riallinea contratti
        if (keeper.id) {
          const validOtherIds = others.map(r => r.id).filter(Boolean);
          if (validOtherIds.length) {
            const placeholders = validOtherIds.map(() => '?').join(',');
            db.prepare(`UPDATE contratti_luce SET cliente_azienda_id = ? WHERE cliente_azienda_id IN (${placeholders})`).run(keeper.id, ...validOtherIds);
            db.prepare(`UPDATE contratti_gas SET cliente_azienda_id = ? WHERE cliente_azienda_id IN (${placeholders})`).run(keeper.id, ...validOtherIds);
          }
        }
        // Elimina duplicati
        for (const o of others) {
          db.prepare('DELETE FROM clienti_aziende WHERE rowid = ?').run(o.rowid);
          console.log(` - Eliminato duplicato azienda rowid=${o.rowid} id=${o.id || 'NULL'} piva=${d.k}`);
        }
      }
    });
    tx(dups);
    console.log(`✅ Dedup conclusa: ${dups.length} P.IVA consolidate`);
    return dups.length;
  }

  try {
    const a = dedupPrivatiBy('codice_fiscale');
    const b = dedupPrivatiBy('email_principale');
    const c = dedupAziendeByPiva();
    console.log(`\n🎉 Dedup totale completata. CF=${a}, Email=${b}, PIVA=${c}`);
  } catch (err) {
    console.error('❌ Errore dedup:', err.message);
    process.exit(1);
  } finally {
    try { db.close(); } catch {}
  }
}

main();