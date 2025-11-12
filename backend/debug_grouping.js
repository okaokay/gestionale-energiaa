const fs = require('fs');
const { parse } = require('csv-parse/sync');

console.log('🔍 DEBUG RAGGRUPPAMENTO RECORD');
console.log('==============================');

const csvFile = './test_contratti_corretto.csv';

// Leggi e parsa il file
const rawContent = fs.readFileSync(csvFile, 'utf8');
const records = parse(rawContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    skip_records_with_error: false
});

console.log(`\n📊 RECORD PARSATI: ${records.length}`);

// Simula il raggruppamento come nel servizio
const recordsByType = {};
records.forEach((record, index) => {
    console.log(`\n📋 Record ${index + 1}:`);
    console.log(`   Raw tipo_record: "${record.tipo_record}"`);
    
    // Simula la logica di detectedType
    const recordType = record.tipo_record || 'unknown';
    console.log(`   Detected type: "${recordType}"`);
    
    if (!recordsByType[recordType]) {
        recordsByType[recordType] = [];
    }
    recordsByType[recordType].push(record);
    
    console.log(`   Aggiunto a gruppo: ${recordType} (totale: ${recordsByType[recordType].length})`);
});

console.log('\n📊 RAGGRUPPAMENTO FINALE:');
console.log('========================');
Object.entries(recordsByType).forEach(([type, records]) => {
    console.log(`${type}: ${records.length} record`);
    records.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.nome || record.ragione_sociale || 'N/A'} - ${record.numero_contratto || 'N/A'}`);
    });
});

console.log('\n🔍 ORDINE DI PROCESSAMENTO:');
console.log('===========================');
const processingOrder = [
    'cliente_privato',
    'cliente_azienda', 
    'contratto_luce',
    'contratto_gas',
    'compenso',
    'offerta',
    'task',
    'documento',
    'ai_match',
    'email_template',
    'email_campaign',
    'consenso_gdpr'
];

processingOrder.forEach(recordType => {
    if (recordsByType[recordType]) {
        console.log(`✅ ${recordType}: ${recordsByType[recordType].length} record da processare`);
    } else {
        console.log(`⚪ ${recordType}: nessun record`);
    }
});

console.log('\n✅ Debug completato!');