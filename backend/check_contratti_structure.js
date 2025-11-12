const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 VERIFICA STRUTTURA TABELLE CONTRATTI');
console.log('======================================\n');

try {
    const db = new Database(dbPath);
    
    // Verifica struttura contratti_luce
    console.log('💡 Struttura tabella contratti_luce:');
    try {
        const luceColumns = db.prepare("PRAGMA table_info(contratti_luce)").all();
        luceColumns.forEach(col => {
            console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Verifica se esiste data_attivazione
        const hasDataAttivazione = luceColumns.some(col => col.name === 'data_attivazione');
        console.log(`   ⚠️  Colonna 'data_attivazione' presente: ${hasDataAttivazione ? 'SÌ' : 'NO'}`);
        
        // Cerca colonne simili
        const dateColumns = luceColumns.filter(col => col.name.includes('data'));
        console.log('   📅 Colonne con "data":');
        dateColumns.forEach(col => {
            console.log(`      - ${col.name}`);
        });
        
    } catch (error) {
        console.log('   ❌ Tabella contratti_luce non esiste');
    }
    
    // Verifica struttura contratti_gas
    console.log('\n🔥 Struttura tabella contratti_gas:');
    try {
        const gasColumns = db.prepare("PRAGMA table_info(contratti_gas)").all();
        gasColumns.forEach(col => {
            console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Verifica se esiste data_attivazione
        const hasDataAttivazione = gasColumns.some(col => col.name === 'data_attivazione');
        console.log(`   ⚠️  Colonna 'data_attivazione' presente: ${hasDataAttivazione ? 'SÌ' : 'NO'}`);
        
        // Cerca colonne simili
        const dateColumns = gasColumns.filter(col => col.name.includes('data'));
        console.log('   📅 Colonne con "data":');
        dateColumns.forEach(col => {
            console.log(`      - ${col.name}`);
        });
        
    } catch (error) {
        console.log('   ❌ Tabella contratti_gas non esiste');
    }
    
    // Conta record
    console.log('\n📊 Conteggio record:');
    try {
        const countLuce = db.prepare("SELECT COUNT(*) as count FROM contratti_luce").get();
        console.log(`   💡 Contratti luce: ${countLuce.count}`);
    } catch (error) {
        console.log('   💡 Contratti luce: N/A');
    }
    
    try {
        const countGas = db.prepare("SELECT COUNT(*) as count FROM contratti_gas").get();
        console.log(`   🔥 Contratti gas: ${countGas.count}`);
    } catch (error) {
        console.log('   🔥 Contratti gas: N/A');
    }
    
    db.close();
    console.log('\n✅ Verifica completata');
    
} catch (error) {
    console.error('❌ Errore:', error.message);
}