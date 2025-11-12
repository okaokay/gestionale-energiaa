const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 ANALISI DETTAGLIATA ERRORI IMPORTAZIONE');
console.log('===========================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite\n');
});

// Funzione per analizzare gli errori in dettaglio
function analyzeImportErrors() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id,
                filename,
                total_rows,
                successful_imports,
                failed_imports,
                incomplete_imports,
                error_log,
                import_date,
                mapping_config,
                import_id
            FROM import_logs 
            ORDER BY import_date DESC 
            LIMIT 1
        `;

        db.get(query, [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (!row) {
                console.log('❌ Nessun log di importazione trovato');
                resolve();
                return;
            }

            console.log('📊 ULTIMO IMPORT:');
            console.log(`   File: ${row.filename}`);
            console.log(`   Timestamp: ${row.import_date}`);
            console.log(`   Import ID: ${row.import_id}`);
            console.log(`   Righe totali: ${row.total_rows}`);
            console.log(`   Import riusciti: ${row.successful_imports}`);
            console.log(`   Import falliti: ${row.failed_imports}`);
            console.log(`   Import incompleti: ${row.incomplete_imports}\n`);

            // Mostra la configurazione di mapping
            if (row.mapping_config) {
                try {
                    const mappingConfig = JSON.parse(row.mapping_config);
                    console.log('🔧 CONFIGURAZIONE MAPPING:');
                    console.log(`   Tipo rilevato: ${mappingConfig.type}`);
                    console.log(`   Confidenza: ${mappingConfig.confidence}%`);
                    console.log(`   Campi rilevati: ${mappingConfig.detectedFields ? mappingConfig.detectedFields.length : 0}`);
                    console.log(`   Campi mancanti: ${mappingConfig.missingRequiredFields ? mappingConfig.missingRequiredFields.length : 0}\n`);
                } catch (err) {
                    console.log('❌ Errore parsing mapping config:', err.message);
                }
            }

            // Analizza gli errori
            if (row.error_log) {
                try {
                    console.log('🔴 ANALISI ERRORI:');
                    console.log('==================');
                    
                    // Prova a parsare come JSON
                    let errorData;
                    try {
                        errorData = JSON.parse(row.error_log);
                    } catch (parseErr) {
                        console.log('❌ Errore parsing JSON errori:', parseErr.message);
                        console.log('Raw error_log:', row.error_log);
                        resolve();
                        return;
                    }

                    // Gli errori potrebbero essere in errorData.errors o direttamente in errorData
                    let errors = errorData.errors || errorData;

                    if (Array.isArray(errors)) {
                        console.log(`📊 Totale errori: ${errors.length}\n`);
                        
                        // Mostra i primi 5 errori in dettaglio
                        errors.slice(0, 5).forEach((error, index) => {
                            console.log(`🔴 Errore ${index + 1}:`);
                            console.log(`   ID: ${error.id || 'N/A'}`);
                            console.log(`   Riga: ${error.rowNumber || 'N/A'}`);
                            console.log(`   Tipo Record: ${error.recordType || 'N/A'}`);
                            console.log(`   Tipo Errore: ${error.errorType || 'N/A'}`);
                            console.log(`   Severità: ${error.severity || 'N/A'}`);
                            console.log(`   Codice: ${error.code || 'N/A'}`);
                            
                            // Gestisci i messaggi di errore
                            if (error.message) {
                                console.log('   Messaggi:');
                                if (Array.isArray(error.message)) {
                                    error.message.forEach((msg, msgIndex) => {
                                        if (typeof msg === 'object') {
                                            console.log(`     ${msgIndex + 1}. ${JSON.stringify(msg, null, 8)}`);
                                        } else {
                                            console.log(`     ${msgIndex + 1}. ${msg}`);
                                        }
                                    });
                                } else if (typeof error.message === 'object') {
                                    console.log(`     ${JSON.stringify(error.message, null, 8)}`);
                                } else {
                                    console.log(`     ${error.message}`);
                                }
                            }
                            
                            console.log(`   Timestamp: ${error.timestamp || 'N/A'}\n`);
                        });

                        if (errors.length > 5) {
                            console.log(`... e altri ${errors.length - 5} errori\n`);
                        }

                        // Analizza i tipi di errore più comuni
                        const errorTypes = {};
                        const errorCodes = {};
                        const recordTypes = {};

                        errors.forEach(error => {
                            if (error.errorType) {
                                errorTypes[error.errorType] = (errorTypes[error.errorType] || 0) + 1;
                            }
                            if (error.code) {
                                errorCodes[error.code] = (errorCodes[error.code] || 0) + 1;
                            }
                            if (error.recordType) {
                                recordTypes[error.recordType] = (recordTypes[error.recordType] || 0) + 1;
                            }
                        });

                        console.log('📈 STATISTICHE ERRORI:');
                        console.log('======================');
                        console.log('Tipi di errore:');
                        Object.entries(errorTypes).forEach(([type, count]) => {
                            console.log(`   ${type}: ${count}`);
                        });

                        console.log('\nCodici di errore:');
                        Object.entries(errorCodes).forEach(([code, count]) => {
                            console.log(`   ${code}: ${count}`);
                        });

                        console.log('\nTipi di record con errori:');
                        Object.entries(recordTypes).forEach(([type, count]) => {
                            console.log(`   ${type}: ${count}`);
                        });

                    } else {
                        console.log('❌ Gli errori non sono in formato array');
                        console.log('Errori raw:', errors);
                    }

                } catch (error) {
                    console.error('❌ Errore nell\'analisi degli errori:', error.message);
                }
            } else {
                console.log('✅ Nessun errore registrato');
            }

            resolve();
        });
    });
}

// Esegui l'analisi
analyzeImportErrors()
    .then(() => {
        console.log('\n✅ Analisi completata');
        db.close();
    })
    .catch(err => {
        console.error('❌ Errore durante l\'analisi:', err.message);
        db.close();
    });