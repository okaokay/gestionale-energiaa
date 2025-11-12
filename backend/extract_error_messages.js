const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 ESTRAZIONE MESSAGGI DI ERRORE DETTAGLIATI');
console.log('============================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite\n');
});

// Funzione per estrarre i messaggi di errore
function extractErrorMessages() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT error_log
            FROM import_logs 
            ORDER BY import_date DESC 
            LIMIT 1
        `;

        db.get(query, [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (!row || !row.error_log) {
                console.log('❌ Nessun error log trovato');
                resolve();
                return;
            }

            try {
                const errorData = JSON.parse(row.error_log);
                const errors = errorData.errors || errorData;

                if (Array.isArray(errors)) {
                    console.log(`📊 Totale errori: ${errors.length}\n`);
                    
                    // Mostra i primi 3 errori con messaggi dettagliati
                    errors.slice(0, 3).forEach((error, index) => {
                        console.log(`🔴 ERRORE ${index + 1} - DETTAGLIO COMPLETO:`);
                        console.log('=====================================');
                        console.log(`   ID: ${error.id}`);
                        console.log(`   Riga: ${error.rowNumber}`);
                        console.log(`   Tipo Record: ${error.recordType}`);
                        console.log(`   Codice: ${error.code}`);
                        
                        console.log('\n📝 MESSAGGI DI ERRORE:');
                        if (error.message && Array.isArray(error.message)) {
                            error.message.forEach((msg, msgIndex) => {
                                console.log(`\n   Messaggio ${msgIndex + 1}:`);
                                console.log('   ' + '='.repeat(20));
                                
                                if (typeof msg === 'object') {
                                    // Stampa l'oggetto in modo leggibile
                                    console.log(JSON.stringify(msg, null, 6));
                                } else {
                                    console.log(`   ${msg}`);
                                }
                            });
                        } else if (error.message) {
                            console.log('\n   Messaggio unico:');
                            console.log('   ' + '='.repeat(20));
                            if (typeof error.message === 'object') {
                                console.log(JSON.stringify(error.message, null, 6));
                            } else {
                                console.log(`   ${error.message}`);
                            }
                        }
                        
                        console.log('\n' + '='.repeat(50) + '\n');
                    });

                    // Analizza un errore specifico per contratto_luce
                    const contractLightError = errors.find(e => e.recordType === 'contratto_luce');
                    if (contractLightError) {
                        console.log('🔍 ANALISI SPECIFICA ERRORE CONTRATTO LUCE:');
                        console.log('===========================================');
                        console.log(JSON.stringify(contractLightError, null, 4));
                        console.log('\n');
                    }

                    // Analizza un errore specifico per contratto_gas
                    const contractGasError = errors.find(e => e.recordType === 'contratto_gas');
                    if (contractGasError) {
                        console.log('🔍 ANALISI SPECIFICA ERRORE CONTRATTO GAS:');
                        console.log('==========================================');
                        console.log(JSON.stringify(contractGasError, null, 4));
                        console.log('\n');
                    }

                } else {
                    console.log('❌ Gli errori non sono in formato array');
                    console.log('Struttura errorData:', JSON.stringify(errorData, null, 4));
                }

            } catch (parseErr) {
                console.error('❌ Errore parsing JSON:', parseErr.message);
                console.log('Raw error_log (primi 500 caratteri):', row.error_log.substring(0, 500));
            }

            resolve();
        });
    });
}

// Esegui l'estrazione
extractErrorMessages()
    .then(() => {
        console.log('\n✅ Estrazione completata');
        db.close();
    })
    .catch(err => {
        console.error('❌ Errore durante l\'estrazione:', err.message);
        db.close();
    });