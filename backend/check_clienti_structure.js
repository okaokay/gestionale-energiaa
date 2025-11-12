const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 Controllando struttura tabelle clienti...');

// Controlla struttura tabella clienti_privati
db.all("PRAGMA table_info(clienti_privati)", (err, columns) => {
    if (err) {
        console.error('❌ Errore:', err);
        return;
    }
    
    console.log('\n📋 Struttura tabella clienti_privati:');
    columns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''} ${col.notnull ? '(NOT NULL)' : ''}`);
    });
    
    // Controlla alcuni record
    db.all("SELECT id, nome, cognome FROM clienti_privati LIMIT 5", (err, rows) => {
        if (err) {
            console.error('❌ Errore nel leggere clienti_privati:', err);
        } else {
            console.log('\n🔍 Primi 5 clienti privati:');
            rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ID: ${row.id}, Nome: ${row.nome}, Cognome: ${row.cognome}`);
            });
            
            // Conta clienti con ID null
            db.get("SELECT COUNT(*) as count FROM clienti_privati WHERE id IS NULL", (err, result) => {
                if (err) {
                    console.error('❌ Errore nel contare ID null:', err);
                } else {
                    console.log(`\n⚠️  Clienti privati con ID null: ${result.count}`);
                }
            });
        }
    });
});

// Controlla struttura tabella clienti_aziende
db.all("PRAGMA table_info(clienti_aziende)", (err, columns) => {
    if (err) {
        console.error('❌ Errore:', err);
        return;
    }
    
    console.log('\n📋 Struttura tabella clienti_aziende:');
    columns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''} ${col.notnull ? '(NOT NULL)' : ''}`);
    });
    
    // Controlla alcuni record
    db.all("SELECT id, ragione_sociale FROM clienti_aziende LIMIT 5", (err, rows) => {
        if (err) {
            console.error('❌ Errore nel leggere clienti_aziende:', err);
        } else {
            console.log('\n🔍 Primi 5 clienti aziende:');
            rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ID: ${row.id}, Ragione sociale: ${row.ragione_sociale}`);
            });
            
            // Conta clienti con ID null
            db.get("SELECT COUNT(*) as count FROM clienti_aziende WHERE id IS NULL", (err, result) => {
                if (err) {
                    console.error('❌ Errore nel contare ID null:', err);
                } else {
                    console.log(`\n⚠️  Clienti aziende con ID null: ${result.count}`);
                }
                
                // Chiudi connessione
                db.close();
            });
        }
    });
});