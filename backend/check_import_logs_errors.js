const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function checkImportLogsErrors() {
    console.log('🔍 CONTROLLO ERRORI IN IMPORT_LOGS');
    console.log('==================================\n');

    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);

    // Mostra gli ultimi record
    db.all(`
        SELECT * FROM import_logs 
        ORDER BY import_date DESC 
        LIMIT 5
    `, [], (err, logs) => {
        if (err) {
            console.error('❌ Errore query logs:', err.message);
            return;
        }

        console.log('📋 ULTIMI 5 IMPORT:');
        logs.forEach((log, index) => {
            console.log(`\n--- Import ${index + 1} ---`);
            console.log(`ID: ${log.id}`);
            console.log(`Import ID: ${log.import_id}`);
            console.log(`File: ${log.filename}`);
            console.log(`Tipo: ${log.file_type}`);
            console.log(`Righe totali: ${log.total_rows}`);
            console.log(`Successi: ${log.successful_imports}`);
            console.log(`Fallimenti: ${log.failed_imports}`);
            console.log(`Incompleti: ${log.incomplete_imports}`);
            console.log(`Data: ${new Date(log.import_date).toLocaleString()}`);
            console.log(`Durata: ${log.duration_seconds}s`);
            
            if (log.error_log) {
                console.log(`Error Log: ${log.error_log}`);
                
                // Verifica se il messaggio è ancora [object Object]
                if (log.error_log.includes('[object Object]')) {
                    console.log('❌ PROBLEMA: Error log contiene [object Object]!');
                } else {
                    console.log('✅ Error log leggibile');
                }
            } else {
                console.log('Error Log: (vuoto)');
            }
        });

        // Cerca specificamente record con errori
        console.log('\n🔍 RICERCA RECORD CON ERRORI...');
        db.all(`
            SELECT * FROM import_logs 
            WHERE error_log IS NOT NULL 
               AND error_log != ''
               AND error_log != 'null'
            ORDER BY import_date DESC
        `, [], (err, errorLogs) => {
            if (err) {
                console.error('❌ Errore query errori:', err.message);
            } else {
                if (errorLogs.length > 0) {
                    console.log(`📊 Trovati ${errorLogs.length} import con errori:`);
                    
                    errorLogs.forEach((log, index) => {
                        console.log(`\n--- Import con errori ${index + 1} ---`);
                        console.log(`File: ${log.filename}`);
                        console.log(`Data: ${new Date(log.import_date).toLocaleString()}`);
                        console.log(`Fallimenti: ${log.failed_imports}`);
                        console.log(`Error Log: ${log.error_log}`);
                        
                        // Analizza il contenuto dell'error log
                        if (log.error_log.includes('[object Object]')) {
                            console.log('❌ PROBLEMA: Error log serializzato male!');
                        } else {
                            console.log('✅ Error log leggibile');
                            
                            // Prova a parsare come JSON se possibile
                            try {
                                const parsed = JSON.parse(log.error_log);
                                console.log('📋 Error log parsato:', JSON.stringify(parsed, null, 2));
                            } catch (e) {
                                console.log('📋 Error log (testo):', log.error_log.substring(0, 200) + '...');
                            }
                        }
                    });
                } else {
                    console.log('✅ Nessun import con errori trovato');
                }
            }
            
            // Cerca import recenti con contratti
            console.log('\n🔍 RICERCA IMPORT CON CONTRATTI...');
            db.all(`
                SELECT * FROM import_logs 
                WHERE filename LIKE '%contratt%' 
                   OR filename LIKE '%super%'
                   OR filename LIKE '%completi%'
                ORDER BY import_date DESC
                LIMIT 3
            `, [], (err, contractImports) => {
                if (err) {
                    console.error('❌ Errore query contratti:', err.message);
                } else {
                    if (contractImports.length > 0) {
                        console.log(`📊 Trovati ${contractImports.length} import con contratti:`);
                        
                        contractImports.forEach((log, index) => {
                            console.log(`\n--- Import contratti ${index + 1} ---`);
                            console.log(`File: ${log.filename}`);
                            console.log(`Data: ${new Date(log.import_date).toLocaleString()}`);
                            console.log(`Totale: ${log.total_rows}, Successi: ${log.successful_imports}, Fallimenti: ${log.failed_imports}`);
                            
                            if (log.error_log) {
                                console.log('Error Log presente:', log.error_log.substring(0, 100) + '...');
                                
                                if (log.error_log.includes('[object Object]')) {
                                    console.log('❌ PROBLEMA: Error log contratti serializzato male!');
                                } else {
                                    console.log('✅ Error log contratti leggibile');
                                }
                            }
                        });
                    } else {
                        console.log('❌ Nessun import con contratti trovato');
                    }
                }
                db.close();
            });
        });
    });
}

checkImportLogsErrors();