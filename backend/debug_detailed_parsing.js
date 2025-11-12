const fs = require('fs');
const { parse } = require('csv-parse/sync');

console.log('🔍 DEBUG DETTAGLIATO PARSING CSV');
console.log('================================');

const csvFile = './test_contratti_corretto.csv';

// Leggi il file raw
const rawContent = fs.readFileSync(csvFile, 'utf8');
console.log('\n📄 CONTENUTO RAW:');
console.log('Lunghezza:', rawContent.length);
console.log('Righe (split \\n):', rawContent.split('\n').length);
console.log('Righe (split \\r\\n):', rawContent.split('\r\n').length);

console.log('\n📋 PRIME 3 RIGHE RAW:');
rawContent.split('\n').slice(0, 3).forEach((line, i) => {
    console.log(`${i + 1}: "${line}"`);
});

console.log('\n🔧 PARSING CON CSV-PARSE:');
try {
    const records = parse(rawContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
        skip_records_with_error: false
    });
    
    console.log(`✅ Record parsati: ${records.length}`);
    
    records.forEach((record, i) => {
        console.log(`\n📋 Record ${i + 1}:`);
        console.log(`   Tipo: ${record.tipo_record}`);
        console.log(`   Nome: ${record.nome || 'N/A'}`);
        console.log(`   Cognome: ${record.cognome || 'N/A'}`);
        console.log(`   Ragione Sociale: ${record.ragione_sociale || 'N/A'}`);
        console.log(`   Numero Contratto: ${record.numero_contratto || 'N/A'}`);
        console.log(`   POD: ${record.pod || 'N/A'}`);
        console.log(`   PDR: ${record.pdr || 'N/A'}`);
        console.log(`   Fornitore: ${record.fornitore || 'N/A'}`);
    });
    
    console.log('\n📊 RIEPILOGO PER TIPO:');
    const tipi = {};
    records.forEach(record => {
        const tipo = record.tipo_record;
        tipi[tipo] = (tipi[tipo] || 0) + 1;
    });
    
    Object.entries(tipi).forEach(([tipo, count]) => {
        console.log(`   ${tipo}: ${count}`);
    });
    
} catch (error) {
    console.error('❌ Errore nel parsing:', error.message);
}

console.log('\n✅ Debug completato!');