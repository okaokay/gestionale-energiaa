const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('=== ANALISI TABELLE CONTRATTI ===');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore apertura database:', err.message);
        return;
    }
    
    // Tabelle specifiche da analizzare
    const contractTables = ['contratti_luce', 'contratti_gas', 'contracts', 'clienti_privati'];
    
    let processedTables = 0;
    
    contractTables.forEach((tableName) => {
        console.log(`\n=== TABELLA: ${tableName.toUpperCase()} ===`);
        
        // Schema della tabella
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`Errore schema ${tableName}:`, err.message);
            } else {
                console.log('COLONNE:');
                columns.forEach(col => {
                    const pk = col.pk ? ' [PRIMARY KEY]' : '';
                    const notNull = col.notnull ? ' [NOT NULL]' : '';
                    const defaultVal = col.dflt_value ? ` [DEFAULT: ${col.dflt_value}]` : '';
                    console.log(`  - ${col.name} (${col.type})${pk}${notNull}${defaultVal}`);
                });
                
                // Conta record
                db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                    if (!err) {
                        console.log(`RECORD PRESENTI: ${row.count}`);
                        
                        // Se ci sono record, mostra alcuni esempi
                        if (row.count > 0) {
                            db.all(`SELECT * FROM ${tableName} LIMIT 3`, (err, rows) => {
                                if (!err && rows.length > 0) {
                                    console.log('ESEMPI DI RECORD:');
                                    rows.forEach((row, index) => {
                                        console.log(`  Record ${index + 1}:`);
                                        Object.keys(row).forEach(key => {
                                            if (row[key] !== null && row[key] !== '') {
                                                console.log(`    ${key}: ${row[key]}`);
                                            }
                                        });
                                        console.log('');
                                    });
                                }
                            });
                        }
                    }
                    
                    processedTables++;
                    if (processedTables === contractTables.length) {
                        
                        // Verifica foreign keys
                        console.log('\n=== VERIFICA FOREIGN KEYS ===');
                        contractTables.forEach(table => {
                            db.all(`PRAGMA foreign_key_list(${table})`, (err, fks) => {
                                if (!err && fks.length > 0) {
                                    console.log(`\nForeign Keys in ${table}:`);
                                    fks.forEach(fk => {
                                        console.log(`  ${fk.from} → ${fk.table}.${fk.to}`);
                                    });
                                }
                            });
                        });
                        
                        setTimeout(() => {
                            db.close();
                        }, 1000);
                    }
                });
            }
        });
    });
});