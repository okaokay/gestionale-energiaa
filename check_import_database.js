const Database = require('better-sqlite3');
const path = require('path');

function checkImportDatabase() {
    try {
        console.log('🔍 Controllo database per dettagli importazione...\n');
        
        // Connetti al database
        const dbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
        console.log(`📁 Percorso database: ${dbPath}`);
        
        const db = new Database(dbPath);
        
        // Verifica l'ultimo import
        const importId = 'ba0784d4-fbee-4ee7-adb6-c6bbde2ba9b2';
        
        console.log(`🎯 Controllo import ID: ${importId}\n`);
        
        const importLog = db.prepare(`
            SELECT * FROM import_logs WHERE import_id = ?
        `).get(importId);
        
        if (importLog) {
            console.log('✅ Import trovato nel database:');
            console.log(`📁 File: ${importLog.filename}`);
            console.log(`📊 Righe totali: ${importLog.total_rows}`);
            console.log(`✅ Successi: ${importLog.successful_imports}`);
            console.log(`❌ Fallimenti: ${importLog.failed_imports}`);
            console.log(`⏸️ Incompleti: ${importLog.incomplete_imports}`);
            console.log(`⏱️ Durata: ${importLog.duration_seconds}s`);
            console.log(`📅 Data: ${importLog.import_date}\n`);
            
            if (importLog.error_log) {
                console.log('🔍 ANALISI DETTAGLIATA ERRORI:');
                console.log('=' .repeat(50));
                try {
                    const errorData = JSON.parse(importLog.error_log);
                    console.log('Struttura error_log:', Object.keys(errorData));
                    
                    if (errorData.errors && errorData.errors.length > 0) {
                        console.log(`\n❌ ERRORI TROVATI (${errorData.errors.length}):`);
                        errorData.errors.forEach((error, i) => {
                            console.log(`\n${i + 1}. ERRORE RIGA ${error.rowNumber || 'N/A'}:`);
                            console.log(`   Tipo: ${error.type || 'N/A'}`);
                            console.log(`   Severità: ${error.severity || 'N/A'}`);
                            console.log(`   Codice: ${error.code || 'N/A'}`);
                            console.log(`   Messaggio: ${error.message || 'N/A'}`);
                            if (error.context) {
                                console.log(`   Contesto: ${JSON.stringify(error.context, null, 2)}`);
                            }
                        });
                    } else {
                        console.log('\n⚠️  Nessun errore dettagliato trovato nell\'error_log');
                    }
                    
                    if (errorData.summary) {
                        console.log('\n📊 RIEPILOGO ERRORI:');
                        console.log(JSON.stringify(errorData.summary, null, 2));
                    }
                    
                } catch (parseError) {
                    console.log(`❌ Errore nel parsing error_log: ${parseError.message}`);
                    console.log('Raw error_log:', importLog.error_log.substring(0, 500) + '...');
                }
            } else {
                console.log('⚠️  Nessun error_log trovato');
            }
            
            if (importLog.mapping_config) {
                console.log('\n🗺️ CONFIGURAZIONE MAPPING:');
                console.log('=' .repeat(50));
                try {
                    const mappingData = JSON.parse(importLog.mapping_config);
                    console.log('Tipo rilevato:', mappingData.type);
                    console.log('Confidenza:', mappingData.confidence);
                    console.log('Campi rilevati:', mappingData.detectedFields);
                    if (mappingData.fieldMapping) {
                        console.log('Mapping campi:', JSON.stringify(mappingData.fieldMapping, null, 2));
                    }
                } catch (parseError) {
                    console.log(`❌ Errore nel parsing mapping_config: ${parseError.message}`);
                }
            }
            
        } else {
            console.log('❌ Import non trovato nel database');
            
            // Mostra gli ultimi 5 import per debug
            console.log('\n📋 Ultimi 5 import nel database:');
            const recentImports = db.prepare(`
                SELECT import_id, filename, total_rows, successful_imports, failed_imports, import_date 
                FROM import_logs 
                ORDER BY import_date DESC 
                LIMIT 5
            `).all();
            
            recentImports.forEach((imp, i) => {
                console.log(`${i + 1}. ${imp.import_id} - ${imp.filename} (${imp.import_date})`);
                console.log(`   Totali: ${imp.total_rows}, Successi: ${imp.successful_imports}, Errori: ${imp.failed_imports}`);
            });
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Errore durante il controllo database:', error.message);
    }
}

checkImportDatabase();