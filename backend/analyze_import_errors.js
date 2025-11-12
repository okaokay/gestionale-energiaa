const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 ANALISI ERRORI IMPORT');
console.log('========================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Recupera l'ultimo import
db.get("SELECT * FROM import_logs ORDER BY import_date DESC LIMIT 1", (err, lastImport) => {
    if (err) {
        console.error('❌ Errore nel recupero ultimo import:', err.message);
        return;
    }
    
    if (!lastImport) {
        console.log('❌ Nessun import trovato');
        db.close();
        return;
    }
    
    console.log('📊 ULTIMO IMPORT:');
    console.log('------------------');
    console.log('🆔 Import ID:', lastImport.import_id);
    console.log('👤 User ID:', lastImport.user_id);
    console.log('📄 Filename:', lastImport.filename);
    console.log('📋 File Type:', lastImport.file_type);
    console.log('📊 Total Rows:', lastImport.total_rows);
    console.log('✅ Successful:', lastImport.successful_imports);
    console.log('❌ Failed:', lastImport.failed_imports);
    console.log('⏭️ Incomplete:', lastImport.incomplete_imports);
    console.log('📅 Import Date:', lastImport.import_date);
    console.log('⏱️ Duration:', lastImport.duration_seconds, 'seconds');
    
    if (lastImport.mapping_config) {
        console.log('\n🗺️ MAPPING CONFIG:');
        console.log('-------------------');
        try {
            const mappingConfig = JSON.parse(lastImport.mapping_config);
            console.log(JSON.stringify(mappingConfig, null, 2));
        } catch (e) {
            console.log('❌ Errore nel parsing mapping config:', e.message);
            console.log('Raw mapping config:', lastImport.mapping_config);
        }
    }
    
    if (lastImport.error_log) {
        console.log('\n❌ ERROR LOG:');
        console.log('--------------');
        try {
            const errorLog = JSON.parse(lastImport.error_log);
            
            // Gestisci il caso specifico dove gli errori sono in errorLog.errors
            if (errorLog.errors && Array.isArray(errorLog.errors)) {
                console.log(`📊 Totale errori: ${errorLog.errors.length}`);
                console.log(`📊 Righe processate: ${errorLog.processedRows || 'N/A'}`);
                console.log(`✅ Righe riuscite: ${errorLog.successfulRows || 'N/A'}`);
                console.log(`❌ Righe con errori: ${errorLog.errorRows || 'N/A'}`);
                
                console.log('\n🔴 DETTAGLI ERRORI:');
                errorLog.errors.slice(0, 10).forEach((error, index) => {
                    console.log(`\n🔴 Errore ${index + 1}:`);
                    if (typeof error === 'object') {
                        Object.entries(error).forEach(([key, value]) => {
                            if (key === 'message' && Array.isArray(value)) {
                                console.log(`   ${key}:`);
                                value.forEach((msg, msgIndex) => {
                                    if (typeof msg === 'object') {
                                        console.log(`     ${msgIndex + 1}. ${JSON.stringify(msg, null, 6)}`);
                                    } else {
                                        console.log(`     ${msgIndex + 1}. ${msg}`);
                                    }
                                });
                            } else if (typeof value === 'object') {
                                console.log(`   ${key}: ${JSON.stringify(value, null, 4)}`);
                            } else {
                                console.log(`   ${key}: ${value}`);
                            }
                        });
                    } else {
                        console.log(`   ${error}`);
                    }
                });
                
                if (errorLog.errors.length > 10) {
                    console.log(`\n... e altri ${errorLog.errors.length - 10} errori`);
                }
            } else if (Array.isArray(errorLog)) {
                errorLog.forEach((error, index) => {
                    console.log(`\n🔴 Errore ${index + 1}:`);
                    if (typeof error === 'object') {
                        Object.entries(error).forEach(([key, value]) => {
                            if (typeof value === 'object') {
                                console.log(`   ${key}: ${JSON.stringify(value, null, 4)}`);
                            } else {
                                console.log(`   ${key}: ${value}`);
                            }
                        });
                    } else {
                        console.log(`   ${error}`);
                    }
                });
            } else if (typeof errorLog === 'object') {
                Object.entries(errorLog).forEach(([key, value]) => {
                    if (typeof value === 'object') {
                        console.log(`   ${key}: ${JSON.stringify(value, null, 4)}`);
                    } else {
                        console.log(`   ${key}: ${value}`);
                    }
                });
            } else {
                console.log(errorLog);
            }
        } catch (e) {
            console.log('❌ Errore nel parsing error log:', e.message);
            console.log('Raw error log:', lastImport.error_log);
        }
    }
    
    // Controlla se ci sono record nelle tabelle principali
    console.log('\n📊 CONTEGGIO RECORD NELLE TABELLE:');
    console.log('-----------------------------------');
    
    const queries = [
        { name: 'clienti_privati', query: 'SELECT COUNT(*) as count FROM clienti_privati' },
        { name: 'clienti_aziende', query: 'SELECT COUNT(*) as count FROM clienti_aziende' },
        { name: 'contratti_luce', query: 'SELECT COUNT(*) as count FROM contratti_luce' },
        { name: 'contratti_gas', query: 'SELECT COUNT(*) as count FROM contratti_gas' }
    ];
    
    let completedQueries = 0;
    
    queries.forEach(({ name, query }) => {
        db.get(query, (err, result) => {
            if (err) {
                console.log(`❌ ${name}: Errore - ${err.message}`);
            } else {
                console.log(`📊 ${name}: ${result.count} record`);
            }
            
            completedQueries++;
            if (completedQueries === queries.length) {
                // Controlla gli ultimi record inseriti
                console.log('\n🔍 ULTIMI RECORD INSERITI:');
                console.log('---------------------------');
                
                db.all("SELECT * FROM clienti_privati ORDER BY created_at DESC LIMIT 3", (err, clients) => {
                    if (err) {
                        console.log('❌ Errore nel recupero clienti privati:', err.message);
                    } else {
                        console.log(`\n👥 Ultimi ${clients.length} clienti privati:`);
                        clients.forEach((client, index) => {
                            console.log(`   ${index + 1}. ${client.nome} ${client.cognome} (${client.codice_fiscale})`);
                        });
                    }
                    
                    db.close((err) => {
                        if (err) {
                            console.error('❌ Errore chiusura database:', err.message);
                        } else {
                            console.log('\n✅ Analisi completata');
                        }
                    });
                });
            }
        });
    });
});