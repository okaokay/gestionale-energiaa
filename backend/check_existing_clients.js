const Database = require('better-sqlite3');

console.log('🔍 CONTROLLO CLIENTI ESISTENTI');
console.log('==============================');

const db = new Database('./gestionale_energia.db');

// Controlla clienti privati
const clientiPrivati = db.prepare('SELECT * FROM clienti_privati').all();
console.log('\n👤 CLIENTI PRIVATI:', clientiPrivati.length);
clientiPrivati.forEach(cliente => {
    console.log(`  - ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale})`);
});

// Controlla clienti aziende
const clientiAziende = db.prepare('SELECT * FROM clienti_aziende').all();
console.log('\n🏢 CLIENTI AZIENDE:', clientiAziende.length);
clientiAziende.forEach(cliente => {
    console.log(`  - ${cliente.ragione_sociale} (${cliente.partita_iva})`);
});

// Controlla contratti
const contrattiLuce = db.prepare('SELECT * FROM contratti_luce').all();
const contrattiGas = db.prepare('SELECT * FROM contratti_gas').all();
console.log('\n⚡ CONTRATTI LUCE:', contrattiLuce.length);
console.log('🔥 CONTRATTI GAS:', contrattiGas.length);

// Controlla se i clienti del CSV esistono già
console.log('\n🔍 VERIFICA CLIENTI DEL CSV:');
const marioRossi = db.prepare('SELECT * FROM clienti_privati WHERE codice_fiscale = ?').get('RSSMRA80A01H501Z');
const acmeSrl = db.prepare('SELECT * FROM clienti_aziende WHERE partita_iva = ?').get('12345678901');

console.log('Mario Rossi esiste:', marioRossi ? 'SÌ' : 'NO');
console.log('Acme S.r.l. esiste:', acmeSrl ? 'SÌ' : 'NO');

db.close();
console.log('\n✅ Controllo completato!');