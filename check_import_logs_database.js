const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new Database(dbPath);

console.log('🔍 CONTROLLO LOG IMPORTAZIONE NEL DATABASE\n');

try {
    // Controlla tutti i log di importazione
    console.log('📋 Tutti i log di importazione:');
    const allLogs = db.prepare(`
        SELECT * FROM import_logs 
        ORDER BY import_date DESC 
        LIMIT 10
    `).all();
    
    if (allLogs.length === 0) {
        console.log('❌ Nessun log di importazione trovato nel database');
    } else {
        allLogs.forEach((log, index) => {
            console.log(`\n--- Log ${index + 1} ---`);
            console.log(`ID: ${log.id}`);
            console.log(`Filename: ${log.filename}`);
            console.log(`Total rows: ${log.total_rows}`);
            console.log(`Successful: ${log.successful_imports}`);
            console.log(`Failed: ${log.failed_imports}`);
            console.log(`Incomplete: ${log.incomplete_imports}`);
            console.log(`Date: ${log.import_date}`);
            console.log(`Duration: ${log.duration_seconds}s`);
            
            // Mostra gli errori se presenti
            if (log.error_log) {
                try {
                    const errors = JSON.parse(log.error_log);
                    console.log(`\n🚨 ERRORI (${Object.keys(errors).length}):`);
                    
                    if (errors.errors && Array.isArray(errors.errors)) {
                        errors.errors.slice(0, 5).forEach((error, i) => {
                            console.log(`  ${i + 1}. ${error.message || error}`);
                            if (error.row) console.log(`     Riga: ${error.row}`);
                            if (error.field) console.log(`     Campo: ${error.field}`);
                        });
                        if (errors.errors.length > 5) {
                            console.log(`     ... e altri ${errors.errors.length - 5} errori`);
                        }
                    } else {
                        console.log('     Formato errori non riconosciuto:', errors);
                    }
                } catch (e) {
                    console.log(`     Errore nel parsing JSON: ${e.message}`);
                    console.log(`     Raw error_log: ${log.error_log.substring(0, 200)}...`);
                }
            }
            
            // Mostra la configurazione di mapping se presente
            if (log.mapping_config) {
                try {
                    const mapping = JSON.parse(log.mapping_config);
                    console.log(`\n🗺️ MAPPING CONFIG:`);
                    console.log(`     Tipo rilevato: ${mapping.detectedType || 'N/A'}`);
                    console.log(`     Campi rilevati: ${mapping.detectedFields?.length || 0}`);
                } catch (e) {
                    console.log(`     Errore nel parsing mapping: ${e.message}`);
                }
            }
        });
    }
    
    // Controlla l'ultimo import specifico
    const lastImportId = '8acc215d-016a-4506-bbdf-c23739eec63f';
    console.log(`\n\n🎯 DETTAGLI ULTIMO IMPORT (${lastImportId}):`);
    
    const lastImport = db.prepare(`
        SELECT * FROM import_logs WHERE import_id = ?
    `).get(lastImportId);
    
    if (lastImport) {
        console.log(`✅ Import trovato nel database`);
        console.log(`📁 File: ${lastImport.filename}`);
        console.log(`📊 Righe totali: ${lastImport.total_rows}`);
        console.log(`✅ Successi: ${lastImport.successful_imports}`);
        console.log(`❌ Fallimenti: ${lastImport.failed_imports}`);
        console.log(`⏸️ Incompleti: ${lastImport.incomplete_imports}`);
        
        if (lastImport.error_log) {
            console.log(`\n🔍 ANALISI DETTAGLIATA ERRORI:`);
            try {
                const errorData = JSON.parse(lastImport.error_log);
                console.log('Struttura errori:', Object.keys(errorData));
                
                if (errorData.errors) {
                    console.log(`\nPrimi 10 errori:`);
                    errorData.errors.slice(0, 10).forEach((error, i) => {
                        console.log(`${i + 1}. ${JSON.stringify(error, null, 2)}`);
                    });
                }
            } catch (e) {
                console.log(`Errore nel parsing: ${e.message}`);
                console.log(`Raw data: ${lastImport.error_log}`);
            }
        }
    } else {
        console.log(`❌ Import ${lastImportId} non trovato nel database`);
    }

} catch (error) {
    console.error('❌ Errore:', error.message);
} finally {
    db.close();
}