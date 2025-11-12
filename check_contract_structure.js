const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
const db = new Database(dbPath);

try {
    console.log('🔍 STRUTTURA TABELLA CONTRATTI_LUCE:');
    const luceColumns = db.prepare(`PRAGMA table_info(contratti_luce)`).all();
    luceColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
    });
    
    console.log('\n🔍 STRUTTURA TABELLA CONTRATTI_GAS:');
    const gasColumns = db.prepare(`PRAGMA table_info(contratti_gas)`).all();
    gasColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
    });
    
} catch (error) {
    console.error('❌ Errore:', error.message);
} finally {
    db.close();
}