const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function openDb() {
  const dbPath = path.join(process.cwd(), 'gestionale_energia.db');
  const db = new sqlite3.Database(dbPath);
  return db;
}

async function run() {
  const db = openDb();

  function all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
  }

  try {
    console.log('🔍 Ultimi contratti luce (stato):');
    const luce = await all(`SELECT id, numero_contratto, pod, fornitore, stato FROM contratti_luce ORDER BY rowid DESC LIMIT 5`);
    luce.forEach(r => {
      console.log(` - LUCE ${r.numero_contratto || ''} POD=${r.pod || ''} fornitore=${r.fornitore || ''} stato=${r.stato || ''}`);
    });

    const luceTest = await all(`SELECT id, numero_contratto, pod, fornitore, stato FROM contratti_luce WHERE numero_contratto LIKE 'TEST-COMPILAZIONE%' ORDER BY rowid DESC LIMIT 5`);
    if (luceTest.length) {
      console.log('\n🔎 Contratti luce TESTLUCEX trovati:');
      luceTest.forEach(r => {
        console.log(`   * ${r.numero_contratto} POD=${r.pod || ''} stato=${r.stato || ''}`);
      });
    }

    console.log('\n🔍 Ultimi contratti gas (stato):');
    const gas = await all(`SELECT id, numero_contratto, pdr, fornitore, stato FROM contratti_gas ORDER BY rowid DESC LIMIT 5`);
    gas.forEach(r => {
      console.log(` - GAS ${r.numero_contratto || ''} PDR=${r.pdr || ''} fornitore=${r.fornitore || ''} stato=${r.stato || ''}`);
    });

    console.log('\n✅ Verifica completata');
  } catch (e) {
    console.error('❌ Errore verifica contratti:', e.message);
  } finally {
    db.close();
  }
}

run();