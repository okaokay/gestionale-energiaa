const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function checkDBStructure() {
    console.log('🔍 CONTROLLO STRUTTURA DATABASE');
    console.log('===============================\n');

    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);

    // Lista tutte le tabelle
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('❌ Errore:', err.message);
            return;
        }

        console.log('📋 TABELLE NEL DATABASE:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        // Cerca tabelle che potrebbero contenere errori di import
        const errorTables = tables.filter(t => 
            t.name.toLowerCase().includes('error') || 
            t.name.toLowerCase().includes('import') ||
            t.name.toLowerCase().includes('log')
        );

        if (errorTables.length > 0) {
            console.log('\n🔍 TABELLE POTENZIALI PER ERRORI:');
            errorTables.forEach(table => {
                console.log(`   - ${table.name}`);
            });

            // Controlliamo la struttura della prima tabella di errori
            if (errorTables.length > 0) {
                const tableName = errorTables[0].name;
                console.log(`\n📊 STRUTTURA TABELLA ${tableName}:`);
                
                db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
                    if (err) {
                        console.error('❌ Errore struttura:', err.message);
                    } else {
                        columns.forEach(col => {
                            console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                        });

                        // Conta i record nella tabella
                        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, result) => {
                            if (err) {
                                console.error('❌ Errore conteggio:', err.message);
                            } else {
                                console.log(`\n📊 Record in ${tableName}: ${result.count}`);
                                
                                if (result.count > 0) {
                                    // Mostra alcuni record di esempio
                                    db.all(`SELECT * FROM ${tableName} LIMIT 3`, [], (err, rows) => {
                                        if (err) {
                                            console.error('❌ Errore esempi:', err.message);
                                        } else {
                                            console.log(`\n📋 ESEMPI DA ${tableName}:`);
                                            rows.forEach((row, index) => {
                                                console.log(`\n--- Record ${index + 1} ---`);
                                                Object.keys(row).forEach(key => {
                                                    console.log(`${key}: ${row[key]}`);
                                                });
                                            });
                                        }
                                        db.close();
                                    });
                                } else {
                                    db.close();
                                }
                            }
                        });
                    }
                });
            }
        } else {
            console.log('\n❌ Nessuna tabella di errori trovata');
            db.close();
        }
    });
}

checkDBStructure();