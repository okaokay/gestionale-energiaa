const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 VERIFICA SCHEMA COMPLETO TABELLE CONTRATTI');
console.log('='.repeat(60));

try {
    const db = new Database(dbPath, { readonly: true });
    
    // 1. Schema tabella contratti_luce
    console.log('\n📋 SCHEMA CONTRATTI_LUCE:');
    console.log('-'.repeat(40));
    
    const schemaLuce = db.prepare("PRAGMA table_info(contratti_luce)").all();
    schemaLuce.forEach(col => {
        console.log(`   ${col.name.padEnd(25)} | ${col.type.padEnd(15)} | ${col.notnull ? 'NOT NULL' : 'NULL'} | ${col.dflt_value || ''}`);
    });
    
    // 2. Schema tabella contratti_gas
    console.log('\n📋 SCHEMA CONTRATTI_GAS:');
    console.log('-'.repeat(40));
    
    const schemaGas = db.prepare("PRAGMA table_info(contratti_gas)").all();
    schemaGas.forEach(col => {
        console.log(`   ${col.name.padEnd(25)} | ${col.type.padEnd(15)} | ${col.notnull ? 'NOT NULL' : 'NULL'} | ${col.dflt_value || ''}`);
    });
    
    // 3. Verifica campi specifici
    console.log('\n🎯 VERIFICA CAMPI SPECIFICI:');
    console.log('-'.repeat(40));
    
    const campiRichiesti = [
        'commodity', 'procedure', 'pdp', 'agente', 
        'nome_offerta', 'validita_offerta', 'tipo_offerta', 'data_stipula'
    ];
    
    const campiLuce = schemaLuce.map(col => col.name);
    const campiGas = schemaGas.map(col => col.name);
    
    console.log('\n   CONTRATTI_LUCE:');
    campiRichiesti.forEach(campo => {
        const presente = campiLuce.includes(campo);
        console.log(`   ${campo.padEnd(20)} | ${presente ? '✅ PRESENTE' : '❌ MANCANTE'}`);
    });
    
    console.log('\n   CONTRATTI_GAS:');
    campiRichiesti.forEach(campo => {
        const presente = campiGas.includes(campo);
        console.log(`   ${campo.padEnd(20)} | ${presente ? '✅ PRESENTE' : '❌ MANCANTE'}`);
    });
    
    // 4. Verifica altre tabelle correlate
    console.log('\n📊 ALTRE TABELLE CORRELATE:');
    console.log('-'.repeat(40));
    
    const tabelle = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%offert%' OR name LIKE '%procedure%' OR name LIKE '%compensi%')").all();
    
    tabelle.forEach(tabella => {
        console.log(`\n   📋 ${tabella.name.toUpperCase()}:`);
        const schema = db.prepare(`PRAGMA table_info(${tabella.name})`).all();
        schema.forEach(col => {
            console.log(`      ${col.name.padEnd(20)} | ${col.type}`);
        });
    });
    
    // 5. Conteggio record nelle tabelle contratti
    console.log('\n📊 CONTEGGIO RECORD:');
    console.log('-'.repeat(40));
    
    const countLuce = db.prepare("SELECT COUNT(*) as count FROM contratti_luce").get();
    const countGas = db.prepare("SELECT COUNT(*) as count FROM contratti_gas").get();
    
    console.log(`   contratti_luce: ${countLuce.count} record`);
    console.log(`   contratti_gas: ${countGas.count} record`);
    
    db.close();
    
} catch (error) {
    console.error('❌ Errore:', error.message);
}