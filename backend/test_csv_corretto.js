const fs = require('fs');
const { parse } = require('csv-parse/sync');

console.log('🔍 TEST CSV CORRETTO');
console.log('===================');

const csvContent = fs.readFileSync('./test_contratti_corretto.csv', 'utf8');
const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    skip_records_with_error: false
});

console.log('Record parsati:', records.length);
console.log('');

records.forEach((record, index) => {
    console.log(`Record ${index + 1} - Tipo: ${record.tipo_record}`);
    if (record.tipo_record === 'cliente_privato') {
        console.log(`  nome: '${record.nome}'`);
        console.log(`  cognome: '${record.cognome}'`);
        console.log(`  codice_fiscale: '${record.codice_fiscale}'`);
        console.log(`  email: '${record.email_principale}'`);
    } else if (record.tipo_record === 'cliente_azienda') {
        console.log(`  ragione_sociale: '${record.ragione_sociale}'`);
        console.log(`  partita_iva: '${record.partita_iva}'`);
        console.log(`  email: '${record.email_principale}'`);
    } else if (record.tipo_record.includes('contratto')) {
        console.log(`  numero_contratto: '${record.numero_contratto}'`);
        console.log(`  pod: '${record.pod}'`);
        console.log(`  pdr: '${record.pdr}'`);
        console.log(`  fornitore: '${record.fornitore}'`);
        console.log(`  nome: '${record.nome}'`);
        console.log(`  cognome: '${record.cognome}'`);
        console.log(`  codice_fiscale: '${record.codice_fiscale}'`);
        console.log(`  ragione_sociale: '${record.ragione_sociale}'`);
        console.log(`  stato: '${record.stato_contratto}'`);
    }
    console.log('');
});

console.log('✅ Test completato!');