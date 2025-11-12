const fs = require('fs');

const content = fs.readFileSync('template_import_completo.csv', 'utf8');
const lines = content.split('\n');

console.log('HEADER:');
console.log(lines[0]);

console.log('\nRIGHE DATI:');
lines.slice(1).forEach((line, i) => {
    if (line.trim()) {
        console.log(`Riga ${i+1}: ${line}`);
    }
});

console.log('\nANALISI CAMPI CONTRATTO:');
const headers = lines[0].split(',');
console.log('Headers trovati:', headers.length);

// Cerca campi relativi ai contratti
const contractFields = ['tipo_contratto', 'numero_contratto', 'pod_pdr', 'pod', 'pdr', 'fornitore', 'commodity'];
contractFields.forEach(field => {
    const index = headers.indexOf(field);
    if (index !== -1) {
        console.log(`✅ Campo ${field} trovato alla posizione ${index}`);
    } else {
        console.log(`❌ Campo ${field} NON trovato`);
    }
});

console.log('\nANALISI VALORI CONTRATTO:');
lines.slice(1).forEach((line, i) => {
    if (line.trim()) {
        const values = line.split(',');
        const record = {};
        headers.forEach((header, index) => {
            record[header] = values[index] || '';
        });
        
        console.log(`\nRiga ${i+1}:`);
        console.log(`  tipo: ${record.tipo}`);
        console.log(`  tipo_contratto: ${record.tipo_contratto}`);
        console.log(`  numero_contratto: ${record.numero_contratto}`);
        console.log(`  pod_pdr: ${record.pod_pdr}`);
        console.log(`  fornitore: ${record.fornitore}`);
        console.log(`  commodity: ${record.commodity}`);
    }
});