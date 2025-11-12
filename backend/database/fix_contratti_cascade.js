const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

function recreateWithCascade(tableName, fkPrivato, fkAzienda) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) return reject(err);
      if (!columns || columns.length === 0) return reject(new Error(`Nessuna colonna trovata per ${tableName}`));

      const columnDefs = columns.map(col => {
        const type = col.type || 'TEXT';
        const notNull = col.notnull === 1 ? ' NOT NULL' : '';
        const pk = col.pk === 1 ? ' PRIMARY KEY' : '';
        // Mantieni default quando possibile
        const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
        return `${col.name} ${type}${notNull}${defaultVal}${pk}`;
      });

      const tmpName = `${tableName}_new`;
      const createSQL = `CREATE TABLE ${tmpName} (
        ${columnDefs.join(',\n        ')},
        FOREIGN KEY (${fkPrivato}) REFERENCES clienti_privati(id) ON DELETE CASCADE,
        FOREIGN KEY (${fkAzienda}) REFERENCES clienti_aziende(id) ON DELETE CASCADE
      )`;

      db.serialize(() => {
        db.run('BEGIN');
        db.run(createSQL, (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const columnNames = columns.map(c => c.name).join(', ');
          const copySQL = `INSERT INTO ${tmpName} (${columnNames}) SELECT ${columnNames} FROM ${tableName}`;

          db.run(copySQL, (err) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            db.run(`DROP TABLE ${tableName}`, (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }

              db.run(`ALTER TABLE ${tmpName} RENAME TO ${tableName}`, (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                db.run('COMMIT');
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

function dropViewsReferencing(tables, cb) {
  const placeholders = tables.map(() => '?').join(',');
  db.all("SELECT name, sql FROM sqlite_master WHERE type='view'", [], (err, views) => {
    if (err) return cb(err);
    const toDrop = views.filter(v => tables.some(t => (v.sql || '').includes(t)));
    if (toDrop.length === 0) return cb();
    db.serialize(() => {
      db.run('BEGIN');
      toDrop.forEach(v => {
        db.run(`DROP VIEW IF EXISTS ${v.name}`);
      });
      db.run('COMMIT', cb);
    });
  });
}

async function run() {
  console.log('🔧 Migrazione: abilito ON DELETE CASCADE per contratti_luce e contratti_gas');
  try {
    // Elimina temporaneamente le view che referenziano le tabelle contratti
    await new Promise((resolve, reject) => dropViewsReferencing(['contratti_luce','contratti_gas'], (e) => e ? reject(e) : resolve(null)));

    await recreateWithCascade('contratti_luce', 'cliente_privato_id', 'cliente_azienda_id');
    console.log('✅ contratti_luce migrata con ON DELETE CASCADE');
    await recreateWithCascade('contratti_gas', 'cliente_privato_id', 'cliente_azienda_id');
    console.log('✅ contratti_gas migrata con ON DELETE CASCADE');
    console.log('🎉 Migrazione completata');
  } catch (err) {
    console.error('❌ Errore migrazione:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

run();