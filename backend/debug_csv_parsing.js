const fs = require('fs');
const { parse } = require('csv-parse/sync');

console.log('🔍 DEBUG CSV PARSING');
console.log('===================');

// Test 1: Leggi il file CSV raw
console.log('\n1. CONTENUTO RAW DEL FILE:');
const csvPath = './test_contratti.csv';
const rawContent = fs.readFileSync(csvPath, 'utf8');
console.log('Prime 500 caratteri:');
console.log(rawContent.substring(0, 500));

// Test 2: Analizza le righe manualmente
console.log('\n2. ANALISI RIGHE MANUALI:');
const lines = rawContent.split('\n');
console.log(`Numero di righe: ${lines.length}`);
console.log('Header:', lines[0]);
console.log('Prima riga dati:', lines[1]);
console.log('Seconda riga dati:', lines[2]);

// Test 3: Parse con csv-parse
console.log('\n3. PARSE CON CSV-PARSE:');
try {
    const records = parse(rawContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
        skip_records_with_error: false
    });
    
    console.log(`Record parsati: ${records.length}`);
    console.log('Primo record:', JSON.stringify(records[0], null, 2));
    
    // Verifica i campi del primo record
    console.log('\n4. ANALISI CAMPI PRIMO RECORD:');
    const firstRecord = records[0];
    Object.keys(firstRecord).forEach((key, index) => {
        console.log(`${index + 1}. "${key}" = "${firstRecord[key]}"`);
    });
    
    // Test specifico per contratti
    console.log('\n5. RICERCA RECORD CONTRATTI:');
    records.forEach((record, index) => {
        if (record.tipo_record === 'contratto_luce' || record.tipo_record === 'contratto_gas') {
            console.log(`\nRecord ${index + 1} - Tipo: ${record.tipo_record}`);
            console.log(`  numero_contratto: "${record.numero_contratto}"`);
            console.log(`  pod: "${record.pod}"`);
            console.log(`  pdr: "${record.pdr}"`);
            console.log(`  fornitore: "${record.fornitore}"`);
            console.log(`  nome: "${record.nome}"`);
            console.log(`  cognome: "${record.cognome}"`);
            console.log(`  codice_fiscale: "${record.codice_fiscale}"`);
        }
    });
    
} catch (error) {
    console.error('Errore nel parsing:', error.message);
}

console.log('\n✅ Debug completato!');