const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
const db = new Database(dbPath);

try {
    // Verifica struttura audit_log
    console.log('🔍 STRUTTURA AUDIT LOG:');
    const auditColumns = db.prepare(`PRAGMA table_info(audit_log)`).all();
    auditColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
    });
    
    // Verifica audit_log
    console.log('\n🔍 AUDIT LOG:');
    const auditCount = db.prepare(`SELECT COUNT(*) as count FROM audit_log`).get();
    console.log(`Record totali: ${auditCount.count}`);
    
    if (auditCount.count > 0) {
        const recentAudit = db.prepare(`
            SELECT * FROM audit_log 
            ORDER BY rowid DESC 
            LIMIT 5
        `).all();
        
        console.log('Ultimi log:');
        recentAudit.forEach((log, i) => {
            console.log(`  ${i+1}.`, JSON.stringify(log, null, 2));
        });
    }
    
    // Verifica contratti per vedere se sono stati inseriti
    console.log('\n🔍 VERIFICA CONTRATTI:');
    const luceCounts = db.prepare(`SELECT COUNT(*) as count FROM contratti_luce`).get();
    const gasCounts = db.prepare(`SELECT COUNT(*) as count FROM contratti_gas`).get();
    
    console.log(`Contratti Luce: ${luceCounts.count}`);
    console.log(`Contratti Gas: ${gasCounts.count}`);
    
    // Verifica ultimi contratti inseriti
    if (luceCounts.count > 0) {
        console.log('\n🔍 ULTIMI CONTRATTI LUCE:');
        const recentLuce = db.prepare(`
            SELECT numero_contratto, pod, fornitore, data_attivazione 
            FROM contratti_luce 
            ORDER BY rowid DESC 
            LIMIT 3
        `).all();
        
        recentLuce.forEach((contratto, i) => {
            console.log(`  ${i+1}. ${contratto.numero_contratto} - POD: ${contratto.pod} - ${contratto.fornitore}`);
        });
    }
    
    if (gasCounts.count > 0) {
        console.log('\n🔍 ULTIMI CONTRATTI GAS:');
        const recentGas = db.prepare(`
            SELECT numero_contratto, pdr, fornitore, data_attivazione 
            FROM contratti_gas 
            ORDER BY rowid DESC 
            LIMIT 3
        `).all();
        
        recentGas.forEach((contratto, i) => {
            console.log(`  ${i+1}. ${contratto.numero_contratto} - PDR: ${contratto.pdr} - ${contratto.fornitore}`);
        });
    }
    
    // Verifica clienti recenti
    console.log('\n🔍 ULTIMI CLIENTI PRIVATI:');
    const recentPrivati = db.prepare(`
        SELECT nome, cognome, codice_fiscale, email_principale 
        FROM clienti_privati 
        ORDER BY rowid DESC 
        LIMIT 3
    `).all();
    
    recentPrivati.forEach((cliente, i) => {
        console.log(`  ${i+1}. ${cliente.nome} ${cliente.cognome} - CF: ${cliente.codice_fiscale}`);
    });
    
    console.log('\n🔍 ULTIMI CLIENTI AZIENDE:');
    const recentAziende = db.prepare(`
        SELECT ragione_sociale, partita_iva, email_principale 
        FROM clienti_aziende 
        ORDER BY rowid DESC 
        LIMIT 3
    `).all();
    
    recentAziende.forEach((azienda, i) => {
        console.log(`  ${i+1}. ${azienda.ragione_sociale} - P.IVA: ${azienda.partita_iva}`);
    });
    
} catch (error) {
    console.error('❌ Errore:', error.message);
} finally {
    db.close();
}