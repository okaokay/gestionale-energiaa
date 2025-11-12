const Database = require('better-sqlite3');

console.log('🔍 CONTROLLO SCHEMA DATABASE');
console.log('============================');

const db = new Database('./gestionale_energia.db');

console.log('\n🔍 STRUTTURA TABELLA import_logs:');
console.log('================================');

try {
    const tableInfo = db.prepare('PRAGMA table_info(import_logs)').all();
    if (tableInfo.length > 0) {
        console.log('Colonne trovate:');
        tableInfo.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
    } else {
        console.log('Tabella import_logs non ha colonne o non esiste');
    }
} catch (error) {
    console.log('Errore nel controllare import_logs:', error.message);
}

console.log('\n🔍 TUTTE LE TABELLE:');
console.log('====================');
try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
} catch (error) {
    console.log('Errore nel listare le tabelle:', error.message);
}

console.log('\n🔍 STRUTTURA TABELLE PRINCIPALI:');
console.log('===============================');

const mainTables = ['clienti_privati', 'clienti_aziende', 'contratti_luce', 'contratti_gas'];

mainTables.forEach(tableName => {
    try {
        console.log(`\n📋 Tabella: ${tableName}`);
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
        if (tableInfo.length > 0) {
            tableInfo.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });
        } else {
            console.log(`  ❌ Tabella ${tableName} non esiste o non ha colonne`);
        }
    } catch (error) {
        console.log(`  ❌ Errore nel controllare ${tableName}: ${error.message}`);
    }
});

db.close();
console.log('\n✅ Controllo completato!');