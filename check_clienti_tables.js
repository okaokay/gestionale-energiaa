const Database = require('better-sqlite3');
const path = require('path');

async function checkClientiTables() {
    try {
        console.log('🔍 CONTROLLO TABELLE CLIENTI\n');
        
        const dbPath = path.join(__dirname, 'gestionale_energia.db');
        const db = new Database(dbPath);
        
        console.log('✅ Database connesso:', dbPath);
        
        // Controlla tabelle clienti
        const clientiTables = ['clienti_privati', 'clienti_aziende', 'clienti'];
        
        for (const tableName of clientiTables) {
            console.log(`\n📊 TABELLA: ${tableName}`);
            try {
                // Verifica se la tabella esiste
                const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
                
                if (!tableExists) {
                    console.log(`   ❌ Tabella NON ESISTE`);
                    continue;
                }
                
                console.log(`   ✅ Tabella ESISTE`);
                
                // Conta record
                const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
                console.log(`   📈 Record: ${count.count}`);
                
                // Mostra struttura
                const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
                console.log('   🏗️ Struttura:');
                schema.forEach(col => {
                    const nullable = col.notnull ? 'NOT NULL' : 'NULL';
                    const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                    console.log(`     - ${col.name}: ${col.type} ${nullable}${defaultVal}`);
                });
                
                // Mostra alcuni record se ci sono
                if (count.count > 0) {
                    console.log('   📋 Primi 3 record:');
                    const records = db.prepare(`SELECT * FROM ${tableName} LIMIT 3`).all();
                    records.forEach((record, index) => {
                        console.log(`     Record ${index + 1}:`);
                        Object.entries(record).forEach(([key, value]) => {
                            console.log(`       ${key}: ${value}`);
                        });
                        console.log('');
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Errore: ${error.message}`);
            }
        }
        
        // Controlla anche le tabelle contratti
        console.log('\n🔌 TABELLE CONTRATTI:');
        const contrattiTables = ['contratti_luce', 'contratti_gas', 'contratti'];
        
        for (const tableName of contrattiTables) {
            try {
                const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
                if (tableExists) {
                    const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
                    console.log(`   ${tableName}: ${count.count} record`);
                } else {
                    console.log(`   ${tableName}: NON ESISTE`);
                }
            } catch (error) {
                console.log(`   ${tableName}: ERRORE - ${error.message}`);
            }
        }
        
        db.close();
        console.log('\n✅ Controllo completato');
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
    }
}

checkClientiTables();