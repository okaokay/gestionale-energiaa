const Database = require('better-sqlite3');

try {
    const db = new Database('./gestionale_energia.db');
    
    console.log('🗄️ TABELLE ESISTENTI NEL DATABASE');
    console.log('=====================================');
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    if (tables.length === 0) {
        console.log('❌ Nessuna tabella trovata');
    } else {
        tables.forEach(table => {
            console.log(`📋 ${table.name}`);
            
            // Mostra anche il numero di record per ogni tabella
            try {
                const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
                console.log(`   📊 Record: ${count.count}`);
            } catch (e) {
                console.log(`   ❌ Errore nel contare i record: ${e.message}`);
            }
        });
    }
    
    db.close();
    console.log('\n✅ Verifica completata');
    
} catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
}