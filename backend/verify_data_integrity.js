/**
 * Script di verifica dell'integrità dei dati importati
 * Verifica che le relazioni tra clienti e contratti siano corrette
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new Database(dbPath);

console.log('🔍 Verifica integrità dati importati...\n');

try {
    // Verifica clienti privati
    const clientiPrivati = db.prepare('SELECT COUNT(*) as count FROM clienti_privati').get();
    console.log(`👤 Clienti privati: ${clientiPrivati.count}`);

    // Verifica clienti aziende
    const clientiAziende = db.prepare('SELECT COUNT(*) as count FROM clienti_aziende').get();
    console.log(`🏢 Clienti aziende: ${clientiAziende.count}`);

    // Verifica contratti luce
    const contrattiLuce = db.prepare('SELECT COUNT(*) as count FROM contratti_luce').get();
    console.log(`💡 Contratti luce: ${contrattiLuce.count}`);

    // Verifica contratti gas
    const contrattiGas = db.prepare('SELECT COUNT(*) as count FROM contratti_gas').get();
    console.log(`🔥 Contratti gas: ${contrattiGas.count}`);

    console.log('\n📊 Verifica relazioni:');

    // Verifica contratti luce con clienti privati
    const contrattiLucePrivati = db.prepare(`
        SELECT COUNT(*) as count 
        FROM contratti_luce cl 
        INNER JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
    `).get();
    console.log(`💡👤 Contratti luce con clienti privati: ${contrattiLucePrivati.count}`);

    // Verifica contratti luce con clienti aziende
    const contrattiLuceAziende = db.prepare(`
        SELECT COUNT(*) as count 
        FROM contratti_luce cl 
        INNER JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
    `).get();
    console.log(`💡🏢 Contratti luce con clienti aziende: ${contrattiLuceAziende.count}`);

    // Verifica contratti gas con clienti privati
    const contrattiGasPrivati = db.prepare(`
        SELECT COUNT(*) as count 
        FROM contratti_gas cg 
        INNER JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
    `).get();
    console.log(`🔥👤 Contratti gas con clienti privati: ${contrattiGasPrivati.count}`);

    // Verifica contratti gas con clienti aziende
    const contrattiGasAziende = db.prepare(`
        SELECT COUNT(*) as count 
        FROM contratti_gas cg 
        INNER JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
    `).get();
    console.log(`🔥🏢 Contratti gas con clienti aziende: ${contrattiGasAziende.count}`);

    // Verifica contratti orfani (senza cliente)
    const contrattiLuceOrfani = db.prepare(`
        SELECT COUNT(*) as count 
        FROM contratti_luce 
        WHERE cliente_privato_id IS NULL AND cliente_azienda_id IS NULL
    `).get();
    console.log(`⚠️ Contratti luce orfani: ${contrattiLuceOrfani.count}`);

    const contrattiGasOrfani = db.prepare(`
        SELECT COUNT(*) as count 
        FROM contratti_gas 
        WHERE cliente_privato_id IS NULL AND cliente_azienda_id IS NULL
    `).get();
    console.log(`⚠️ Contratti gas orfani: ${contrattiGasOrfani.count}`);

    console.log('\n📋 Esempi di dati:');

    // Mostra alcuni esempi di clienti privati
    const esempioClientePrivato = db.prepare(`
        SELECT id, nome, cognome, codice_fiscale 
        FROM clienti_privati 
        LIMIT 1
    `).get();
    if (esempioClientePrivato) {
        console.log(`👤 Esempio cliente privato: ${esempioClientePrivato.nome} ${esempioClientePrivato.cognome} (${esempioClientePrivato.codice_fiscale})`);
    }

    // Mostra alcuni esempi di contratti luce
    const esempioContrattoLuce = db.prepare(`
        SELECT id, numero_contratto, fornitore, cliente_privato_id, cliente_azienda_id 
        FROM contratti_luce 
        LIMIT 1
    `).get();
    if (esempioContrattoLuce) {
        console.log(`💡 Esempio contratto luce: ${esempioContrattoLuce.numero_contratto} (${esempioContrattoLuce.fornitore})`);
        console.log(`   Cliente privato ID: ${esempioContrattoLuce.cliente_privato_id}`);
        console.log(`   Cliente azienda ID: ${esempioContrattoLuce.cliente_azienda_id}`);
    }

    console.log('\n✅ Verifica completata!');

} catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
} finally {
    db.close();
}