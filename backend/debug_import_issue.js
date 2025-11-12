const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso del database
const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 Debug Import Issue - Analisi completa del database');
console.log('='.repeat(60));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Funzione per eseguire query con promesse
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function debugImport() {
    try {
        console.log('\n📊 1. STRUTTURA TABELLE');
        console.log('-'.repeat(40));
        
        // Lista tutte le tabelle
        const tables = await runQuery("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        console.log('Tabelle trovate:', tables.map(t => t.name).join(', '));
        
        console.log('\n📈 2. CONTEGGIO RECORD PER TABELLA');
        console.log('-'.repeat(40));
        
        for (const table of tables) {
            try {
                const count = await runQuery(`SELECT COUNT(*) as count FROM ${table.name}`);
                console.log(`${table.name}: ${count[0].count} record`);
            } catch (err) {
                console.log(`${table.name}: Errore nel conteggio - ${err.message}`);
            }
        }
        
        console.log('\n📝 3. ANALISI IMPORT_LOGS');
        console.log('-'.repeat(40));
        
        // Controlla la struttura della tabella import_logs
        const importLogsSchema = await runQuery("PRAGMA table_info(import_logs)");
        console.log('Colonne import_logs:');
        importLogsSchema.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Mostra gli ultimi import
        const importLogs = await runQuery("SELECT * FROM import_logs ORDER BY id DESC LIMIT 5");
        console.log('\nUltimi 5 import:');
        importLogs.forEach(log => {
            console.log(`ID: ${log.id}, Import ID: ${log.import_id}, File: ${log.filename}`);
            console.log(`  Totale righe: ${log.total_rows}, Successi: ${log.successful_imports}, Fallimenti: ${log.failed_imports}`);
            console.log(`  Errori: ${log.error_log || 'Nessuno'}`);
            console.log(`  Data: ${log.import_date}`);
            console.log('---');
        });
        
        console.log('\n🔍 4. VERIFICA DATI CLIENTI');
        console.log('-'.repeat(40));
        
        // Controlla se esistono le tabelle clienti
        const clientiPrivati = await runQuery("SELECT COUNT(*) as count FROM clienti_privati").catch(() => ({ count: 'Tabella non esistente' }));
        const clientiAziende = await runQuery("SELECT COUNT(*) as count FROM clienti_aziende").catch(() => ({ count: 'Tabella non esistente' }));
        const contrattiLuce = await runQuery("SELECT COUNT(*) as count FROM contratti_luce").catch(() => ({ count: 'Tabella non esistente' }));
        const contrattiGas = await runQuery("SELECT COUNT(*) as count FROM contratti_gas").catch(() => ({ count: 'Tabella non esistente' }));
        
        console.log(`Clienti privati: ${clientiPrivati[0]?.count || clientiPrivati.count}`);
        console.log(`Clienti aziende: ${clientiAziende[0]?.count || clientiAziende.count}`);
        console.log(`Contratti luce: ${contrattiLuce[0]?.count || contrattiLuce.count}`);
        console.log(`Contratti gas: ${contrattiGas[0]?.count || contrattiGas.count}`);
        
        console.log('\n🎯 5. ANALISI ULTIMO IMPORT');
        console.log('-'.repeat(40));
        
        if (importLogs.length > 0) {
            const lastImport = importLogs[0];
            console.log(`Ultimo import ID: ${lastImport.import_id}`);
            console.log(`File: ${lastImport.filename}`);
            console.log(`Durata: ${lastImport.duration_seconds} secondi`);
            
            if (lastImport.error_log) {
                console.log('\n❌ ERRORI TROVATI:');
                try {
                    const errors = JSON.parse(lastImport.error_log);
                    console.log(JSON.stringify(errors, null, 2));
                } catch (e) {
                    console.log(lastImport.error_log);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Errore durante l\'analisi:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('\n✅ Database chiuso correttamente');
            }
        });
    }
}

debugImport();