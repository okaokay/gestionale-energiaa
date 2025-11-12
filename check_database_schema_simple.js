const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('=== ANALISI SCHEMA DATABASE ===');
console.log('Database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore apertura database:', err.message);
        return;
    }
    
    // Lista tutte le tabelle
    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
        if (err) {
            console.error('Errore lettura tabelle:', err.message);
            return;
        }
        
        console.log('\n=== TABELLE PRESENTI ===');
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table.name}`);
        });
        
        console.log('\n=== DETTAGLIO TABELLE ===');
        
        let processedTables = 0;
        
        tables.forEach((table) => {
            const tableName = table.name;
            
            // Schema della tabella
            db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                if (err) {
                    console.error(`Errore schema ${tableName}:`, err.message);
                } else {
                    console.log(`\n--- TABELLA: ${tableName} ---`);
                    console.log('Colonne:');
                    columns.forEach(col => {
                        console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                    });
                    
                    // Conta record
                    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                        if (!err) {
                            console.log(`Record: ${row.count}`);
                        }
                        
                        processedTables++;
                        if (processedTables === tables.length) {
                            db.close();
                        }
                    });
                }
            });
        });
    });
});