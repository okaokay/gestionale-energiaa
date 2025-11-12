const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../gestionale_energia.db');

try {
    const db = new Database(dbPath);
    
    console.log('🔍 Verifica tabelle database...');
    
    // Lista tutte le tabelle
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    console.log('\n📊 Tabelle presenti:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Verifica conteggi
    if (tables.some(t => t.name === 'clienti_privati')) {
        const countPrivati = db.prepare("SELECT COUNT(*) as count FROM clienti_privati").get();
        console.log(`\n👥 Clienti privati: ${countPrivati.count}`);
    }
    
    if (tables.some(t => t.name === 'clienti_aziende')) {
        const countAziende = db.prepare("SELECT COUNT(*) as count FROM clienti_aziende").get();
        console.log(`🏢 Clienti aziende: ${countAziende.count}`);
    }
    
    if (tables.some(t => t.name === 'contratti_luce')) {
        const countLuce = db.prepare("SELECT COUNT(*) as count FROM contratti_luce").get();
        console.log(`💡 Contratti luce: ${countLuce.count}`);
    }
    
    if (tables.some(t => t.name === 'contratti_gas')) {
        const countGas = db.prepare("SELECT COUNT(*) as count FROM contratti_gas").get();
        console.log(`🔥 Contratti gas: ${countGas.count}`);
    }
    
    if (tables.some(t => t.name === 'users')) {
        const countUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
        console.log(`👤 Utenti: ${countUsers.count}`);
    }
    
    db.close();
    console.log('\n✅ Verifica completata!');
    
} catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
}