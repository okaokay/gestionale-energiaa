const sqlite3 = require('sqlite3').verbose();

console.log('🔍 VERIFICA STRUTTURA EFFETTIVA DATABASE');
console.log('========================================');

const db = new sqlite3.Database('./gestionale_energia.db');

// Lista tutte le tabelle
console.log('\n📋 TABELLE NEL DATABASE:');
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
        console.error('❌ Errore nel recuperare tabelle:', err);
        return;
    }
    
    console.log(`Trovate ${tables.length} tabelle:`);
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Controlla se esistono le tabelle clienti
    const hasClientiPrivati = tables.some(t => t.name === 'clienti_privati');
    const hasClientiAziende = tables.some(t => t.name === 'clienti_aziende');
    
    console.log(`\n📊 STATO TABELLE CLIENTI:`);
    console.log(`  clienti_privati: ${hasClientiPrivati ? '✅ Esiste' : '❌ Non esiste'}`);
    console.log(`  clienti_aziende: ${hasClientiAziende ? '✅ Esiste' : '❌ Non esiste'}`);
    
    if (hasClientiPrivati) {
        console.log('\n🏠 STRUTTURA clienti_privati:');
        db.all("PRAGMA table_info(clienti_privati)", (err, cols) => {
            if (err) {
                console.error('❌ Errore:', err);
                return;
            }
            cols.forEach(col => {
                console.log(`  ${col.name} (${col.type}) ${col.pk ? '- PK' : ''} ${col.notnull ? '- NOT NULL' : ''}`);
            });
            
            // Conta i record
            db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                if (err) {
                    console.error('❌ Errore conteggio:', err);
                    return;
                }
                console.log(`  📊 Record: ${row.count}`);
                
                if (row.count > 0) {
                    // Mostra alcuni record
                    db.all("SELECT * FROM clienti_privati LIMIT 3", (err, rows) => {
                        if (err) {
                            console.error('❌ Errore nel recuperare record:', err);
                            return;
                        }
                        console.log('\n  📋 Primi 3 record:');
                        rows.forEach((row, index) => {
                            console.log(`    ${index + 1}. ID: ${row.id}, Nome: ${row.nome || 'N/A'}, Cognome: ${row.cognome || 'N/A'}`);
                        });
                    });
                }
            });
        });
    }
    
    if (hasClientiAziende) {
        console.log('\n🏢 STRUTTURA clienti_aziende:');
        db.all("PRAGMA table_info(clienti_aziende)", (err, cols) => {
            if (err) {
                console.error('❌ Errore:', err);
                return;
            }
            cols.forEach(col => {
                console.log(`  ${col.name} (${col.type}) ${col.pk ? '- PK' : ''} ${col.notnull ? '- NOT NULL' : ''}`);
            });
            
            // Conta i record
            db.get("SELECT COUNT(*) as count FROM clienti_aziende", (err, row) => {
                if (err) {
                    console.error('❌ Errore conteggio:', err);
                    return;
                }
                console.log(`  📊 Record: ${row.count}`);
                
                if (row.count > 0) {
                    // Mostra alcuni record
                    db.all("SELECT * FROM clienti_aziende LIMIT 3", (err, rows) => {
                        if (err) {
                            console.error('❌ Errore nel recuperare record:', err);
                            return;
                        }
                        console.log('\n  📋 Primi 3 record:');
                        rows.forEach((row, index) => {
                            console.log(`    ${index + 1}. ID: ${row.id}, Ragione Sociale: ${row.ragione_sociale || 'N/A'}`);
                        });
                    });
                }
            });
        });
    }
    
    // Cerca tabelle che potrebbero contenere clienti
    console.log('\n🔍 RICERCA TABELLE CLIENTI ALTERNATIVE:');
    const possibleClientTables = tables.filter(t => 
        t.name.toLowerCase().includes('client') || 
        t.name.toLowerCase().includes('customer') ||
        t.name.toLowerCase().includes('utent') ||
        t.name.toLowerCase().includes('person')
    );
    
    if (possibleClientTables.length > 0) {
        console.log('Tabelle potenziali clienti trovate:');
        possibleClientTables.forEach(table => {
            console.log(`  - ${table.name}`);
            
            // Mostra struttura
            db.all(`PRAGMA table_info(${table.name})`, (err, cols) => {
                if (err) {
                    console.error(`❌ Errore struttura ${table.name}:`, err);
                    return;
                }
                console.log(`    Colonne: ${cols.map(c => c.name).join(', ')}`);
                
                // Conta record
                db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                    if (err) {
                        console.error(`❌ Errore conteggio ${table.name}:`, err);
                        return;
                    }
                    console.log(`    Record: ${row.count}`);
                });
            });
        });
    } else {
        console.log('Nessuna tabella clienti alternativa trovata');
    }
    
    setTimeout(() => {
        db.close();
        console.log('\n✅ Verifica completata');
    }, 3000);
});