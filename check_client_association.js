const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
const db = new Database(dbPath);

try {
    console.log('🔍 VERIFICA ASSOCIAZIONE CLIENTI DAL CSV:');
    
    // Clienti dal nostro CSV
    const csvClients = [
        { tipo: 'privato', nome: 'Mario', cognome: 'Rossi', cf: 'RSSMRA80A01H501U' },
        { tipo: 'privato', nome: 'Lucia', cognome: 'Bianchi', cf: 'BNCLUCI85M15F205Z' },
        { tipo: 'azienda', ragione_sociale: 'Azienda SRL', piva: '12345678901' }
    ];
    
    console.log('\n📋 RICERCA CLIENTI PRIVATI:');
    csvClients.filter(c => c.tipo === 'privato').forEach((cliente, i) => {
        console.log(`\n${i+1}. Cercando: ${cliente.nome} ${cliente.cognome} (CF: ${cliente.cf})`);
        
        // Cerca per codice fiscale
        const foundByCF = db.prepare(`
            SELECT id, nome, cognome, codice_fiscale, email_principale 
            FROM clienti_privati 
            WHERE codice_fiscale = ?
        `).get(cliente.cf);
        
        if (foundByCF) {
            console.log(`   ✅ Trovato per CF: ${foundByCF.nome} ${foundByCF.cognome} (ID: ${foundByCF.id})`);
        } else {
            console.log(`   ❌ NON trovato per CF`);
        }
        
        // Cerca per nome e cognome
        const foundByName = db.prepare(`
            SELECT id, nome, cognome, codice_fiscale, email_principale 
            FROM clienti_privati 
            WHERE nome = ? AND cognome = ?
        `).get(cliente.nome, cliente.cognome);
        
        if (foundByName) {
            console.log(`   ✅ Trovato per Nome: ${foundByName.nome} ${foundByName.cognome} (CF: ${foundByName.codice_fiscale})`);
        } else {
            console.log(`   ❌ NON trovato per Nome`);
        }
    });
    
    console.log('\n📋 RICERCA CLIENTI AZIENDE:');
    csvClients.filter(c => c.tipo === 'azienda').forEach((azienda, i) => {
        console.log(`\n${i+1}. Cercando: ${azienda.ragione_sociale} (P.IVA: ${azienda.piva})`);
        
        // Cerca per partita IVA
        const foundByPIVA = db.prepare(`
            SELECT id, ragione_sociale, partita_iva, email_principale 
            FROM clienti_aziende 
            WHERE partita_iva = ?
        `).get(azienda.piva);
        
        if (foundByPIVA) {
            console.log(`   ✅ Trovato per P.IVA: ${foundByPIVA.ragione_sociale} (ID: ${foundByPIVA.id})`);
        } else {
            console.log(`   ❌ NON trovato per P.IVA`);
        }
        
        // Cerca per ragione sociale
        const foundByName = db.prepare(`
            SELECT id, ragione_sociale, partita_iva, email_principale 
            FROM clienti_aziende 
            WHERE ragione_sociale = ?
        `).get(azienda.ragione_sociale);
        
        if (foundByName) {
            console.log(`   ✅ Trovato per Ragione Sociale: ${foundByName.ragione_sociale} (P.IVA: ${foundByName.partita_iva})`);
        } else {
            console.log(`   ❌ NON trovato per Ragione Sociale`);
        }
    });
    
    // Verifica se esistono contratti con i numeri del CSV
    console.log('\n🔍 VERIFICA CONTRATTI DAL CSV:');
    
    const csvContracts = [
        { tipo: 'luce', numero: 'LUCE123456', pod: 'IT001E12345678' },
        { tipo: 'gas', numero: 'GAS789012', pdr: 'IT002G98765432' }
    ];
    
    csvContracts.forEach((contratto, i) => {
        console.log(`\n${i+1}. Cercando contratto ${contratto.tipo}: ${contratto.numero}`);
        
        if (contratto.tipo === 'luce') {
            const found = db.prepare(`
                SELECT numero_contratto, pod, fornitore, cliente_id 
                FROM contratti_luce 
                WHERE numero_contratto = ? OR pod = ?
            `).get(contratto.numero, contratto.pod);
            
            if (found) {
                console.log(`   ✅ Trovato: ${found.numero_contratto} - POD: ${found.pod} (Cliente: ${found.cliente_id})`);
            } else {
                console.log(`   ❌ NON trovato`);
            }
        } else {
            const found = db.prepare(`
                SELECT numero_contratto, pdr, fornitore, cliente_id 
                FROM contratti_gas 
                WHERE numero_contratto = ? OR pdr = ?
            `).get(contratto.numero, contratto.pdr);
            
            if (found) {
                console.log(`   ✅ Trovato: ${found.numero_contratto} - PDR: ${found.pdr} (Cliente: ${found.cliente_id})`);
            } else {
                console.log(`   ❌ NON trovato`);
            }
        }
    });
    
} catch (error) {
    console.error('❌ Errore:', error.message);
} finally {
    db.close();
}