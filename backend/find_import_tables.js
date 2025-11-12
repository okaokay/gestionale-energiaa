const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function findImportTables() {
    console.log('🔍 RICERCA TABELLE IMPORT');
    console.log('=========================\n');

    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);

    // Lista tutte le tabelle
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('❌ Errore:', err.message);
            return;
        }

        console.log('📋 TUTTE LE TABELLE:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        // Cerca tabelle che potrebbero contenere dati di import
        const importTables = tables.filter(t => 
            t.name.toLowerCase().includes('import') || 
            t.name.toLowerCase().includes('log') ||
            t.name.toLowerCase().includes('error') ||
            t.name.toLowerCase().includes('unified')
        );

        console.log('\n🔍 TABELLE POTENZIALI PER IMPORT:');
        if (importTables.length > 0) {
            importTables.forEach(table => {
                console.log(`   - ${table.name}`);
            });
        } else {
            console.log('   Nessuna tabella di import trovata');
        }

        // Controlliamo se esiste una tabella unified_import_logs
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='unified_import_logs'", [], (err, result) => {
            if (result) {
                console.log('\n✅ Trovata tabella unified_import_logs');
                
                // Conta i record
                db.get('SELECT COUNT(*) as count FROM unified_import_logs', [], (err, countResult) => {
                    if (err) {
                        console.error('❌ Errore conteggio:', err.message);
                    } else {
                        console.log(`📊 Record in unified_import_logs: ${countResult.count}`);
                        
                        if (countResult.count > 0) {
                            // Mostra gli ultimi import
                            db.all(`
                                SELECT 
                                    import_id,
                                    file_name,
                                    total_rows,
                                    processed_rows,
                                    inserted_rows,
                                    error_rows,
                                    created_at
                                FROM unified_import_logs 
                                ORDER BY created_at DESC 
                                LIMIT 5
                            `, [], (err, imports) => {
                                if (err) {
                                    console.error('❌ Errore import:', err.message);
                                } else {
                                    console.log('\n📋 ULTIMI 5 IMPORT:');
                                    imports.forEach((imp, index) => {
                                        console.log(`\n--- Import ${index + 1} ---`);
                                        console.log(`ID: ${imp.import_id}`);
                                        console.log(`File: ${imp.file_name}`);
                                        console.log(`Righe totali: ${imp.total_rows}`);
                                        console.log(`Righe processate: ${imp.processed_rows}`);
                                        console.log(`Righe inserite: ${imp.inserted_rows}`);
                                        console.log(`Righe con errori: ${imp.error_rows}`);
                                        console.log(`Data: ${new Date(imp.created_at).toLocaleString()}`);
                                    });
                                }
                                
                                // Ora cerchiamo la tabella degli errori
                                checkErrorTables(db);
                            });
                        } else {
                            checkErrorTables(db);
                        }
                    }
                });
            } else {
                console.log('\n❌ Tabella unified_import_logs non trovata');
                checkErrorTables(db);
            }
        });
    });
}

function checkErrorTables(db) {
    // Controlla se esiste una tabella per gli errori
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%error%'", [], (err, result) => {
        if (result) {
            console.log(`\n✅ Trovata tabella errori: ${result.name}`);
            
            // Mostra la struttura
            db.all(`PRAGMA table_info(${result.name})`, [], (err, columns) => {
                if (err) {
                    console.error('❌ Errore struttura:', err.message);
                } else {
                    console.log(`\n📊 STRUTTURA ${result.name}:`);
                    columns.forEach(col => {
                        console.log(`   ${col.name}: ${col.type}`);
                    });
                }
                db.close();
            });
        } else {
            console.log('\n❌ Nessuna tabella errori trovata');
            db.close();
        }
    });
}

findImportTables();