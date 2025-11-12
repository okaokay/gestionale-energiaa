const Database = require('better-sqlite3');
const path = require('path');

console.log('🗄️ CONTROLLO DATABASE DOPO IMPORTAZIONE');
console.log('=========================================');

const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');
console.log('📁 Database path:', dbPath);

try {
    const db = new Database(dbPath);
    
    // Conta i record in ogni tabella
    console.log('\n📊 CONTEGGIO RECORD:');
    const tables = ['clienti_privati', 'clienti_aziende', 'contratti_luce', 'contratti_gas', 'import_logs'];
    
    for (const table of tables) {
        try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            console.log(`${table}: ${count.count} record`);
        } catch (error) {
            console.log(`${table}: ERRORE - ${error.message}`);
        }
    }
    
    // Mostra gli ultimi clienti privati
    console.log('\n👤 ULTIMI CLIENTI PRIVATI:');
    try {
        const clienti = db.prepare('SELECT * FROM clienti_privati ORDER BY id DESC LIMIT 3').all();
        clienti.forEach(cliente => {
            console.log(`- ID: ${cliente.id}, Nome: ${cliente.nome} ${cliente.cognome}, Email: ${cliente.email_principale}`);
        });
    } catch (error) {
        console.log('Errore:', error.message);
    }
    
    // Mostra gli ultimi clienti aziende
    console.log('\n🏢 ULTIMI CLIENTI AZIENDE:');
    try {
        const aziende = db.prepare('SELECT * FROM clienti_aziende ORDER BY id DESC LIMIT 3').all();
        aziende.forEach(azienda => {
            console.log(`- ID: ${azienda.id}, Ragione Sociale: ${azienda.ragione_sociale}, Email: ${azienda.email_principale}`);
        });
    } catch (error) {
        console.log('Errore:', error.message);
    }
    
    // Mostra gli ultimi contratti luce
    console.log('\n💡 ULTIMI CONTRATTI LUCE:');
    try {
        const contratti = db.prepare('SELECT * FROM contratti_luce ORDER BY id DESC LIMIT 3').all();
        contratti.forEach(contratto => {
            console.log(`- ID: ${contratto.id}, Numero: ${contratto.numero_contratto}, POD: ${contratto.pod}, Cliente Privato: ${contratto.cliente_privato_id}, Cliente Azienda: ${contratto.cliente_azienda_id}`);
        });
    } catch (error) {
        console.log('Errore:', error.message);
    }
    
    // Mostra gli ultimi contratti gas
    console.log('\n🔥 ULTIMI CONTRATTI GAS:');
    try {
        const contratti = db.prepare('SELECT * FROM contratti_gas ORDER BY id DESC LIMIT 3').all();
        contratti.forEach(contratto => {
            console.log(`- ID: ${contratto.id}, Numero: ${contratto.numero_contratto}, PDR: ${contratto.pdr}, Cliente Privato: ${contratto.cliente_privato_id}, Cliente Azienda: ${contratto.cliente_azienda_id}`);
        });
    } catch (error) {
        console.log('Errore:', error.message);
    }
    
    // Mostra gli ultimi log di importazione
    console.log('\n📋 ULTIMI LOG IMPORTAZIONE:');
    try {
        const logs = db.prepare('SELECT * FROM import_logs ORDER BY import_date DESC LIMIT 5').all();
        logs.forEach(log => {
            console.log(`- ImportID: ${log.import_id}, Status: ${log.status}, Righe: ${log.total_rows}, Data: ${log.import_date}`);
        });
    } catch (error) {
        console.log('Errore:', error.message);
    }
    
    db.close();
    console.log('\n✅ Controllo completato');
    
} catch (error) {
    console.error('❌ Errore database:', error.message);
}