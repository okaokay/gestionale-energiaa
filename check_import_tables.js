const Database = require('better-sqlite3');
const path = require('path');

async function checkImportTables() {
    try {
        console.log('🔍 CONTROLLO TABELLE IMPORT NEL DATABASE\n');
        
        const dbPath = path.join(__dirname, 'gestionale_energia.db');
        const db = new Database(dbPath);
        
        console.log('✅ Database connesso:', dbPath);
        
        // Lista tutte le tabelle
        console.log('\n📋 TABELLE NEL DATABASE:');
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        // Cerca tabelle di import
        const importTables = tables.filter(t => t.name.includes('import') || t.name.includes('unified'));
        
        if (importTables.length > 0) {
            console.log('\n📊 TABELLE DI IMPORT TROVATE:');
            importTables.forEach(table => {
                console.log(`\n   Tabella: ${table.name}`);
                try {
                    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
                    console.log(`   Record: ${count.count}`);
                    
                    // Mostra struttura
                    const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
                    console.log('   Colonne:');
                    schema.forEach(col => {
                        console.log(`     - ${col.name} (${col.type})`);
                    });
                    
                    // Mostra ultimi record se ci sono
                    if (count.count > 0) {
                        console.log('   Ultimi record:');
                        const records = db.prepare(`SELECT * FROM ${table.name} ORDER BY rowid DESC LIMIT 3`).all();
                        records.forEach((record, index) => {
                            console.log(`     Record ${index + 1}:`, JSON.stringify(record, null, 6));
                        });
                    }
                } catch (error) {
                    console.log(`   Errore lettura: ${error.message}`);
                }
            });
        } else {
            console.log('\n⚠️ Nessuna tabella di import trovata');
        }
        
        // Cerca nella tabella logs se esiste
        const hasLogs = tables.find(t => t.name === 'logs' || t.name === 'import_logs');
        if (hasLogs) {
            console.log(`\n📝 LOGS NELLA TABELLA ${hasLogs.name}:`);
            try {
                const logs = db.prepare(`SELECT * FROM ${hasLogs.name} WHERE message LIKE '%import%' OR message LIKE '%error%' ORDER BY created_at DESC LIMIT 10`).all();
                logs.forEach((log, index) => {
                    console.log(`   Log ${index + 1}:`, JSON.stringify(log, null, 4));
                });
            } catch (error) {
                console.log(`   Errore lettura logs: ${error.message}`);
            }
        }
        
        db.close();
        console.log('\n✅ Controllo completato');
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
    }
}

checkImportTables();