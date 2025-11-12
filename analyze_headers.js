const fs = require('fs');

const content = fs.readFileSync('template_import_completo.csv', 'utf8');
const headers = content.split('\n')[0].split(',');

console.log('HEADERS (con indici):');
headers.forEach((h, i) => {
    console.log(`${i.toString().padStart(2)}: ${h}`);
});

console.log('\nCampi relativi ai contratti:');
headers.forEach((h, i) => {
    if (h.includes('contratto') || h.includes('pod') || h.includes('pdr') || h.includes('fornitore') || h.includes('commodity') || h.includes('numero_')) {
        console.log(`${i.toString().padStart(2)}: ${h}`);
    }
});

// Analizza la prima riga di dati
const firstDataLine = content.split('\n')[1];
if (firstDataLine) {
    const values = firstDataLine.split(',');
    console.log('\nPrima riga di dati:');
    headers.forEach((h, i) => {
        if (h.includes('contratto') || h.includes('pod') || h.includes('pdr') || h.includes('fornitore') || h.includes('commodity') || h.includes('numero_')) {
            console.log(`${h}: "${values[i] || ''}"`);
        }
    });
}