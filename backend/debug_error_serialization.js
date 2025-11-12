const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function debugErrorSerialization() {
    console.log('🔍 DEBUG SERIALIZZAZIONE ERRORI');
    console.log('===============================\n');

    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Ottieni l'ultimo import
            db.get(`
                SELECT id, filename, error_log, import_date 
                FROM import_logs 
                ORDER BY import_date DESC 
                LIMIT 1
            `, (err, row) => {
                if (err) {
                    console.error('❌ Errore query:', err);
                    reject(err);
                    return;
                }

                if (!row) {
                    console.log('❌ Nessun import trovato');
                    resolve();
                    return;
                }

                console.log(`📁 Import: ${row.filename}`);
                console.log(`📅 Data: ${row.import_date}\n`);

                try {
                    const errorLog = JSON.parse(row.error_log);
                    console.log('📊 Struttura error_log:');
                    console.log('Chiavi principali:', Object.keys(errorLog));
                    
                    if (errorLog.errors && Array.isArray(errorLog.errors)) {
                        console.log(`\n🔍 Analisi primi 3 errori (su ${errorLog.errors.length} totali):`);
                        
                        errorLog.errors.slice(0, 3).forEach((error, index) => {
                            console.log(`\n--- Errore ${index + 1} ---`);
                            console.log('Struttura:', Object.keys(error));
                            console.log('ID:', error.id);
                            console.log('Riga:', error.row);
                            console.log('Tipo record:', error.recordType);
                            console.log('Tipo errore:', error.type);
                            console.log('Codice:', error.code);
                            console.log('Messaggio RAW:', JSON.stringify(error.message));
                            console.log('Messaggio tipo:', typeof error.message);
                            
                            // Prova a parsare il messaggio se è una stringa JSON
                            if (typeof error.message === 'string') {
                                try {
                                    const parsedMessage = JSON.parse(error.message);
                                    console.log('Messaggio parsato:', parsedMessage);
                                } catch (e) {
                                    console.log('Messaggio non è JSON valido');
                                }
                            }
                            
                            // Analizza metadata se presente
                            if (error.metadata) {
                                console.log('Metadata:', JSON.stringify(error.metadata, null, 2));
                            }
                        });
                        
                        // Analizza i tipi di errore
                        const errorTypes = {};
                        const errorCodes = {};
                        const recordTypes = {};
                        
                        errorLog.errors.forEach(error => {
                            errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
                            errorCodes[error.code] = (errorCodes[error.code] || 0) + 1;
                            recordTypes[error.recordType] = (recordTypes[error.recordType] || 0) + 1;
                        });
                        
                        console.log('\n📈 STATISTICHE ERRORI:');
                        console.log('Tipi di errore:', errorTypes);
                        console.log('Codici errore:', errorCodes);
                        console.log('Tipi di record con errori:', recordTypes);
                    }
                    
                } catch (parseError) {
                    console.error('❌ Errore parsing error_log:', parseError);
                    console.log('Raw error_log:', row.error_log.substring(0, 500) + '...');
                }

                db.close();
                resolve();
            });
        });
    });
}

debugErrorSerialization().catch(console.error);