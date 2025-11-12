/**
 * Script per controllare i dettagli degli errori di importazione
 */

const Database = require('better-sqlite3');
const path = require('path');

try {
    console.log('🔍 Controllo dettagli errori importazione...');
    
    // Percorso del database nella directory root
    const dbPath = path.join(process.cwd(), 'gestionale_energia.db');
    console.log(`📁 Percorso database: ${dbPath}`);
    
    const db = new Database(dbPath);
    
    // Verifica l'ultimo import
    const importId = 'ba0784d4-fbee-4ee7-adb6-c6bbde2ba9b2';
    console.log(`🎯 Controllo import ID: ${importId}\n`);
    
    // Ottieni i dettagli dell'importazione
    const importLog = db.prepare(`
        SELECT * FROM import_logs WHERE import_id = ?
    `).get(importId);
    
    if (!importLog) {
        console.log('❌ Nessun record trovato per questo import ID');
        return;
    }
    
    console.log('📊 DETTAGLI IMPORTAZIONE:');
    console.log(`  - ID: ${importLog.id}`);
    console.log(`  - Import ID: ${importLog.import_id}`);
    console.log(`  - File: ${importLog.filename}`);
    console.log(`  - Tipo: ${importLog.file_type}`);
    console.log(`  - Righe totali: ${importLog.total_rows}`);
    console.log(`  - Inserimenti riusciti: ${importLog.successful_imports}`);
    console.log(`  - Errori: ${importLog.failed_imports}`);
    console.log(`  - Incompleti: ${importLog.incomplete_imports}`);
    console.log(`  - Data: ${importLog.import_date}`);
    console.log(`  - Durata: ${importLog.duration_seconds} secondi`);
    
    // Analizza il log degli errori
    if (importLog.error_log) {
        console.log('\n🔍 ANALISI ERRORI:');
        try {
            const errorLog = JSON.parse(importLog.error_log);
            
            if (errorLog.errors && errorLog.errors.length > 0) {
                console.log(`\n❌ ERRORI (${errorLog.errors.length}):`);
                errorLog.errors.forEach((error, index) => {
                    console.log(`\n  ${index + 1}. Riga ${error.row}:`);
                    console.log(`     Tipo: ${error.type}`);
                    console.log(`     Messaggio: ${error.message}`);
                    if (error.details) {
                        console.log(`     Dettagli: ${JSON.stringify(error.details, null, 6)}`);
                    }
                    if (error.data) {
                        console.log(`     Dati: ${JSON.stringify(error.data, null, 6)}`);
                    }
                });
            }
            
            if (errorLog.warnings && errorLog.warnings.length > 0) {
                console.log(`\n⚠️  AVVISI (${errorLog.warnings.length}):`);
                errorLog.warnings.forEach((warning, index) => {
                    console.log(`\n  ${index + 1}. Riga ${warning.row}:`);
                    console.log(`     Messaggio: ${warning.message}`);
                    if (warning.details) {
                        console.log(`     Dettagli: ${JSON.stringify(warning.details, null, 6)}`);
                    }
                });
            }
            
        } catch (parseError) {
            console.log('❌ Errore nel parsing del log degli errori:', parseError.message);
            console.log('📄 Log grezzo:', importLog.error_log);
        }
    } else {
        console.log('\n⚠️  Nessun log degli errori disponibile');
    }
    
    // Analizza la configurazione di mapping
    if (importLog.mapping_config) {
        console.log('\n🗺️  CONFIGURAZIONE MAPPING:');
        try {
            const mappingConfig = JSON.parse(importLog.mapping_config);
            console.log(JSON.stringify(mappingConfig, null, 2));
        } catch (parseError) {
            console.log('❌ Errore nel parsing della configurazione mapping:', parseError.message);
        }
    }
    
    db.close();
    
} catch (error) {
    console.error('❌ Errore durante il controllo:', error.message);
}