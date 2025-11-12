const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
console.log('📁 Percorso database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Lista tutte le tabelle
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('❌ Errore nel recuperare le tabelle:', err.message);
        return;
    }
    
    console.log('\n📋 Tabelle nel database:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Cerca tabelle che potrebbero contenere utenti
    const userTables = tables.filter(t => 
        t.name.toLowerCase().includes('user') || 
        t.name.toLowerCase().includes('utent') ||
        t.name.toLowerCase().includes('admin')
    );
    
    if (userTables.length > 0) {
        console.log('\n👥 Tabelle utenti trovate:');
        userTables.forEach(table => {
            console.log(`\n🔍 Contenuto tabella ${table.name}:`);
            db.all(`SELECT * FROM ${table.name} LIMIT 5`, [], (err, rows) => {
                if (err) {
                    console.error(`❌ Errore nel leggere ${table.name}:`, err.message);
                } else {
                    console.log(rows);
                }
            });
        });
    } else {
        console.log('\n❌ Nessuna tabella utenti trovata');
        
        // Proviamo a cercare in tutte le tabelle per email/password
        tables.forEach(table => {
            db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
                if (err) return;
                
                const hasEmail = columns.some(col => col.name.toLowerCase().includes('email'));
                const hasPassword = columns.some(col => col.name.toLowerCase().includes('password'));
                
                if (hasEmail || hasPassword) {
                    console.log(`\n🔍 Tabella ${table.name} potrebbe contenere utenti:`);
                    console.log('Colonne:', columns.map(c => c.name).join(', '));
                    
                    db.all(`SELECT * FROM ${table.name} LIMIT 3`, [], (err, rows) => {
                        if (err) {
                            console.error(`❌ Errore nel leggere ${table.name}:`, err.message);
                        } else {
                            console.log('Dati:', rows);
                        }
                    });
                }
            });
        });
    }
    
    // Chiudi la connessione dopo un po'
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('\n✅ Connessione database chiusa');
            }
        });
    }, 2000);
});