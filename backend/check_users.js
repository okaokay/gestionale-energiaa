const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('👥 Controllando utenti nel database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Controlla la struttura della tabella users
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%user%'", (err, tables) => {
    if (err) {
        console.error('❌ Errore ricerca tabelle:', err);
        return;
    }
    
    console.log('\n📋 Tabelle utenti trovate:');
    tables.forEach(table => {
        console.log(`   - ${table.name}`);
    });
    
    // Prova a controllare la tabella users
    db.all("SELECT id, email, nome, ruolo, created_at FROM users LIMIT 10", (err, users) => {
        if (err) {
            console.error('❌ Errore lettura users:', err.message);
            
            // Prova con altre possibili tabelle
            db.all("SELECT id, email, nome, ruolo, created_at FROM utenti LIMIT 10", (err, utenti) => {
                if (err) {
                    console.error('❌ Errore lettura utenti:', err.message);
                    db.close();
                    return;
                }
                
                console.log(`\n👤 Utenti trovati nella tabella 'utenti': ${utenti.length}`);
                utenti.forEach((user, index) => {
                    console.log(`   ${index + 1}. ${user.email} - ${user.nome} (${user.ruolo})`);
                    console.log(`      ID: ${user.id}`);
                    console.log(`      Creato: ${user.created_at}`);
                    console.log('');
                });
                
                db.close();
            });
            
        } else {
            console.log(`\n👤 Utenti trovati nella tabella 'users': ${users.length}`);
            users.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.email} - ${user.nome} (${user.ruolo})`);
                console.log(`      ID: ${user.id}`);
                console.log(`      Creato: ${user.created_at}`);
                console.log('');
            });
            
            db.close();
        }
    });
});