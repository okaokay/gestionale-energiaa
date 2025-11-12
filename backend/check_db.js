const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 Verifica struttura database...\n');

// Verifica tabelle esistenti
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
    if (err) {
        console.error('❌ Errore nel recupero tabelle:', err);
        return;
    }
    
    console.log('📋 Tabelle esistenti:');
    rows.forEach(row => console.log(`   - ${row.name}`));
    
    // Se esiste la tabella agenti, mostra gli utenti
    if (rows.some(row => row.name === 'agenti')) {
        console.log('\n👥 Agenti nel database:');
        db.all('SELECT id, email, nome, cognome, ruolo FROM agenti', (err, agenti) => {
            if (err) {
                console.error('❌ Errore nel recupero agenti:', err);
            } else {
                agenti.forEach(agente => {
                    console.log(`   - ID: ${agente.id}, Email: ${agente.email}, Nome: ${agente.nome} ${agente.cognome}, Ruolo: ${agente.ruolo}`);
                });
            }
            db.close();
        });
    } else {
        console.log('\n⚠️ Tabella agenti non trovata. Il database potrebbe non essere inizializzato.');
        db.close();
    }
});