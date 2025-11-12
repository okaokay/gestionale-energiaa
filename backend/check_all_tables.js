const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

function checkAllTables() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Errore connessione database:', err.message);
            return;
        }
        console.log('✅ Connesso al database SQLite');
    });

    console.log('📋 CONTROLLO TUTTE LE TABELLE:');
    console.log('================================\n');

    // Lista tutte le tabelle
    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
        if (err) {
            console.log('❌ Errore nel recupero tabelle:', err.message);
        } else {
            console.log('📊 TABELLE NEL DATABASE:');
            tables.forEach((table, index) => {
                console.log(`${index + 1}. ${table.name}`);
            });

            // Cerca tabelle relative all'import
            const importTables = tables.filter(t => 
                t.name.includes('import') || 
                t.name.includes('result') || 
                t.name.includes('log') ||
                t.name.includes('unified')
            );

            if (importTables.length > 0) {
                console.log('\n🔍 TABELLE RELATIVE ALL\'IMPORT:');
                let processedTables = 0;
                
                importTables.forEach((table) => {
                    console.log(`\n📋 Tabella: ${table.name}`);
                    
                    // Conta i record
                    db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                        if (err) {
                            console.log(`   ❌ Errore: ${err.message}`);
                        } else {
                            console.log(`   📊 Record: ${row.count}`);
                            
                            // Se ci sono record, mostra i primi 3
                            if (row.count > 0) {
                                db.all(`SELECT * FROM ${table.name} ORDER BY rowid DESC LIMIT 3`, (err, records) => {
                                    if (err) {
                                        console.log(`   ❌ Errore lettura: ${err.message}`);
                                    } else {
                                        console.log(`   📄 Ultimi record:`);
                                        records.forEach((record, index) => {
                                            console.log(`   ${index + 1}. ${JSON.stringify(record, null, 4)}`);
                                        });
                                    }
                                    
                                    processedTables++;
                                    if (processedTables === importTables.length) {
                                        db.close();
                                    }
                                });
                            } else {
                                processedTables++;
                                if (processedTables === importTables.length) {
                                    db.close();
                                }
                            }
                        }
                    });
                });
            } else {
                console.log('\n⚠️ Nessuna tabella relativa all\'import trovata');
                db.close();
            }
        }
    });
}

checkAllTables();