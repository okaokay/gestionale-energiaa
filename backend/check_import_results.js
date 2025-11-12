const Database = require('better-sqlite3');

try {
    const db = new Database('./gestionale_energia.db');
    
    console.log('=== VERIFICA RISULTATI IMPORTAZIONE ===\n');
    
    // Clienti privati
    console.log('=== CLIENTI PRIVATI ===');
    const clientiCount = db.prepare('SELECT COUNT(*) as count FROM clienti_privati').get().count;
    console.log(`Totale clienti privati: ${clientiCount}`);
    
    if (clientiCount > 0) {
        const clienti = db.prepare('SELECT id, nome, cognome, email, created_at FROM clienti_privati ORDER BY created_at DESC LIMIT 10').all();
        clienti.forEach(c => {
            console.log(`- ${c.id} | ${c.nome} ${c.cognome} | ${c.email} | ${c.created_at}`);
        });
    }
    
    console.log('\n=== CONTRATTI ===');
    const contrattiCount = db.prepare('SELECT COUNT(*) as count FROM contratti').get().count;
    console.log(`Totale contratti: ${contrattiCount}`);
    
    if (contrattiCount > 0) {
        const contratti = db.prepare('SELECT id, tipo_contratto, cliente_id, pod_pdr, created_at FROM contratti ORDER BY created_at DESC LIMIT 10').all();
        contratti.forEach(c => {
            console.log(`- ${c.id} | ${c.tipo_contratto} | Cliente: ${c.cliente_id} | POD/PDR: ${c.pod_pdr} | ${c.created_at}`);
        });
    }
    
    // Verifica associazioni
    console.log('\n=== ASSOCIAZIONI CLIENTI-CONTRATTI ===');
    const associazioni = db.prepare(`
        SELECT 
            cp.nome, cp.cognome, cp.email,
            c.tipo_contratto, c.pod_pdr
        FROM clienti_privati cp
        JOIN contratti c ON cp.id = c.cliente_id
        ORDER BY cp.created_at DESC
        LIMIT 10
    `).all();
    
    console.log(`Associazioni trovate: ${associazioni.length}`);
    associazioni.forEach(a => {
        console.log(`- ${a.nome} ${a.cognome} (${a.email}) -> ${a.tipo_contratto} (${a.pod_pdr})`);
    });
    
    // Import logs
    console.log('\n=== IMPORT LOGS ===');
    try {
        const importLogs = db.prepare('SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 5').all();
        console.log(`Log entries: ${importLogs.length}`);
        importLogs.forEach(log => {
            console.log(`- ${log.import_id} | ${log.stage} | ${log.status} | ${log.message || 'No message'}`);
        });
    } catch (e) {
        console.log('Tabella import_logs non trovata o errore:', e.message);
    }
    
    db.close();
    console.log('\n=== VERIFICA COMPLETATA ===');
    
} catch (error) {
    console.error('Errore durante la verifica:', error.message);
    process.exit(1);
}