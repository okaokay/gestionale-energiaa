const { pool } = require('./backend/config/database.cjs');

async function checkTables() {
  try {
    console.log('=== TABELLE ESISTENTI NEL DATABASE ===');
    const tables = await pool.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    tables.rows.forEach(table => console.log(`- ${table.name}`));
    
    // Verifica se esistono le tabelle principali
    const tableNames = tables.rows.map(t => t.name);
    
    if (tableNames.includes('clienti_privati')) {
      console.log('\n=== STRUTTURA TABELLA clienti_privati ===');
      const privati = await pool.query('PRAGMA table_info(clienti_privati)');
      privati.rows.forEach(col => {
        const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
        const pk = col.pk ? 'PRIMARY KEY' : '';
        console.log(`${col.name}: ${col.type} ${nullable} ${pk}`);
      });
    }
    
    // Cerca tabelle azienda con nomi diversi
    const aziendaTables = tableNames.filter(name => name.toLowerCase().includes('aziend'));
    if (aziendaTables.length > 0) {
      console.log('\n=== TABELLE AZIENDA TROVATE ===');
      for (const tableName of aziendaTables) {
        console.log(`\n--- STRUTTURA TABELLA ${tableName} ---`);
        const azienda = await pool.query(`PRAGMA table_info(${tableName})`);
        azienda.rows.forEach(col => {
          const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
          const pk = col.pk ? 'PRIMARY KEY' : '';
          console.log(`${col.name}: ${col.type} ${nullable} ${pk}`);
        });
        
        // Mostra i dati esistenti
        const data = await pool.query(`SELECT * FROM ${tableName} LIMIT 5`);
        if (data.rows.length > 0) {
          console.log(`\n--- DATI IN ${tableName} ---`);
          data.rows.forEach(row => console.log(row));
        }
      }
    }
    
    // Verifica tabelle contratti
    console.log('\n=== TABELLE CONTRATTI ===');
    
    // Contratti luce
    if (tableNames.includes('contratti_luce')) {
      console.log('\n📋 Struttura tabella contratti_luce:');
      const luce = await pool.query('PRAGMA table_info(contratti_luce)');
      luce.rows.forEach(col => {
        const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
        const pk = col.pk ? 'PRIMARY KEY' : '';
        console.log(`  ${col.name} (${col.type}) ${nullable} ${pk}`);
      });
      
      // Conta contratti luce
      const contrattiLuceCount = await pool.query("SELECT COUNT(*) as count FROM contratti_luce");
      console.log(`📊 Contratti luce esistenti: ${contrattiLuceCount.rows[0].count}`);
    } else {
      console.log('❌ Tabella contratti_luce NON ESISTE');
    }
    
    // Contratti gas
    if (tableNames.includes('contratti_gas')) {
      console.log('\n📋 Struttura tabella contratti_gas:');
      const gas = await pool.query('PRAGMA table_info(contratti_gas)');
      gas.rows.forEach(col => {
        const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
        const pk = col.pk ? 'PRIMARY KEY' : '';
        console.log(`  ${col.name} (${col.type}) ${nullable} ${pk}`);
      });
      
      // Conta contratti gas
      const contrattiGasCount = await pool.query("SELECT COUNT(*) as count FROM contratti_gas");
      console.log(`📊 Contratti gas esistenti: ${contrattiGasCount.rows[0].count}`);
    } else {
      console.log('❌ Tabella contratti_gas NON ESISTE');
    }
    
    if (tableNames.includes('clienti_privati')) {
      console.log('\n=== CLIENTI PRIVATI ESISTENTI ===');
      const clienti = await pool.query('SELECT COUNT(*) as count FROM clienti_privati');
      console.log(`Totale clienti privati: ${clienti.rows[0].count}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Errore:', error);
    process.exit(1);
  }
}

checkTables();