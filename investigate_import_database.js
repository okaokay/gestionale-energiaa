const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function investigateImportDatabase() {
    console.log('🔍 INVESTIGAZIONE DATABASE IMPORT');
    
    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    console.log(`📁 Database path: ${dbPath}`);
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Controlla tutte le tabelle che potrebbero contenere informazioni sull'import
        console.log('\n📋 TABELLE DISPONIBILI:');
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });
        
        // Controlla la tabella import_logs
        console.log('\n📊 IMPORT_LOGS:');
        const importLogs = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 10", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (importLogs.length > 0) {
            console.log(`   Trovati ${importLogs.length} log di import:`);
            importLogs.forEach((log, index) => {
                console.log(`   ${index + 1}. ID: ${log.id}, Import ID: ${log.import_id}, Created: ${log.created_at}`);
                if (log.error_details) {
                    console.log(`      Errori: ${log.error_details}`);
                }
            });
        } else {
            console.log('   Nessun log di import trovato');
        }
        
        // Controlla se esistono tabelle di import temporanee o di staging
        const importTables = tables.filter(t => t.name.includes('import') || t.name.includes('temp') || t.name.includes('staging'));
        if (importTables.length > 0) {
            console.log('\n📦 TABELLE IMPORT/TEMP:');
            for (const table of importTables) {
                console.log(`\n   Tabella: ${table.name}`);
                const count = await new Promise((resolve, reject) => {
                    db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    });
                });
                console.log(`   Record: ${count}`);
                
                // Mostra struttura della tabella
                const schema = await new Promise((resolve, reject) => {
                    db.all(`PRAGMA table_info(${table.name})`, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                console.log(`   Colonne: ${schema.map(col => col.name).join(', ')}`);
            }
        }
        
        // Controlla i clienti più recenti per vedere se qualcosa è stato inserito
        console.log('\n👤 CLIENTI PRIVATI RECENTI:');
        const recentPrivati = await new Promise((resolve, reject) => {
            db.all("SELECT id, nome, cognome, created_at FROM clienti_privati ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        recentPrivati.forEach((cliente, index) => {
            console.log(`   ${index + 1}. ${cliente.nome} ${cliente.cognome} - ${cliente.created_at}`);
        });
        
        console.log('\n🏢 CLIENTI AZIENDE RECENTI:');
        const recentAziende = await new Promise((resolve, reject) => {
            db.all("SELECT id, ragione_sociale, created_at FROM clienti_aziende ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        recentAziende.forEach((azienda, index) => {
            console.log(`   ${index + 1}. ${azienda.ragione_sociale} - ${azienda.created_at}`);
        });
        
        // Controlla se ci sono errori nella tabella errors (se esiste)
        const hasErrorsTable = tables.some(t => t.name === 'errors' || t.name === 'import_errors');
        if (hasErrorsTable) {
            console.log('\n❌ TABELLA ERRORI:');
            const errors = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM errors ORDER BY created_at DESC LIMIT 10", (err, rows) => {
                    if (err) {
                        // Prova con import_errors
                        db.all("SELECT * FROM import_errors ORDER BY created_at DESC LIMIT 10", (err2, rows2) => {
                            if (err2) reject(err2);
                            else resolve(rows2);
                        });
                    } else {
                        resolve(rows);
                    }
                });
            });
            
            if (errors.length > 0) {
                errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error.message || error.error_message} - ${error.created_at}`);
                });
            } else {
                console.log('   Nessun errore trovato');
            }
        }
        
    } catch (error) {
        console.error('❌ Errore durante l\'investigazione:', error);
    } finally {
        db.close();
    }
}

investigateImportDatabase().catch(console.error);