const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 Controllo utenti nel database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Controlla la struttura della tabella users
db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
        console.error('❌ Errore nel controllo struttura tabella users:', err.message);
        return;
    }
    
    console.log('\n📋 Struttura tabella users:');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
    });
});

// Mostra tutti gli utenti
db.all("SELECT id, email, nome, cognome, ruolo FROM users", (err, users) => {
    if (err) {
        console.error('❌ Errore nel recupero utenti:', err.message);
        return;
    }
    
    console.log('\n👥 Utenti trovati:');
    if (users.length === 0) {
        console.log('  Nessun utente trovato');
    } else {
        users.forEach(user => {
            console.log(`  - ID: ${user.id}, Email: ${user.email}, Nome: ${user.nome} ${user.cognome}, Ruolo: ${user.ruolo}`);
        });
    }
    
    db.close((err) => {
        if (err) {
            console.error('❌ Errore chiusura database:', err.message);
        } else {
            console.log('\n✅ Database chiuso correttamente');
        }
    });
});