const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function main() {
  const nome = process.argv[2] || 'GIANLUCA';
  const cognome = process.argv[3] || 'MANCINI';
  const email = (process.argv[4] || 'gianluca.mancini@gestionale.local').toLowerCase();
  const password = process.argv[5] || 'Temp123!';
  const phone = process.argv[6] || null;
  const agencyName = process.argv[7] || 'Agenzia';
  const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');

  const db = new sqlite3.Database(dbPath);

  const run = (sql, params=[]) => new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err); else resolve(this);
  }));
  const get = (sql, params=[]) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => {
    if (err) reject(err); else resolve(row);
  }));

  try {
    const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) {
      console.log('Agente già presente:', exists.id);
      db.close();
      return;
    }

    const superAdmin = await get("SELECT id, agency_name FROM users WHERE ruolo='super_admin' OR role='super_admin' ORDER BY created_at LIMIT 1");
    const parentId = superAdmin ? superAdmin.id : null;
    const agency = agencyName || (superAdmin && superAdmin.agency_name) || 'Agenzia';

    const passwordHash = await bcrypt.hash(password, 10);
    const newId = crypto.randomUUID();

    await run(`
      INSERT INTO users (
        id, email, password_hash, nome, cognome, role, ruolo,
        parent_id, agency_name, phone, is_active, attivo,
        commissioni_luce_default, commissioni_gas_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      email,
      passwordHash,
      nome,
      cognome,
      'operatore',
      'operatore',
      parentId,
      agency,
      phone,
      1,
      1,
      0,
      0
    ]);

    console.log('Creato agente:', { id: newId, nome, cognome, email });
  } catch (e) {
    console.error('Errore creazione agente:', e.message || e);
  } finally {
    db.close();
  }
}

main();