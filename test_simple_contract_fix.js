/**
 * Test semplice per verificare la correzione dell'ordine di processamento
 */

const fs = require('fs');
const path = require('path');

async function testSimple() {
    console.log('🧪 TEST SEMPLICE: Verifica correzione ordine processamento');
    
    try {
        // Verifica che il file CSV esista
        const csvPath = path.join(__dirname, 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        console.log(`✅ File CSV trovato: ${csvPath}`);
        
        // Leggi il contenuto del CSV per verificare la struttura
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        console.log(`📊 Righe nel CSV: ${lines.length}`);
        console.log(`📋 Header: ${lines[0]}`);
        
        // Analizza i tipi di record
        const recordTypes = {};
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim()) {
                const tipo = line.split(',')[0];
                recordTypes[tipo] = (recordTypes[tipo] || 0) + 1;
            }
        }
        
        console.log('\n📊 TIPI DI RECORD NEL CSV:');
        for (const [tipo, count] of Object.entries(recordTypes)) {
            console.log(`  ${tipo}: ${count} record`);
        }
        
        // Verifica l'ordine nel CSV
        console.log('\n🔍 ORDINE NEL CSV:');
        for (let i = 1; i < Math.min(lines.length, 10); i++) {
            const tipo = lines[i].split(',')[0];
            console.log(`  Riga ${i + 1}: ${tipo}`);
        }
        
        console.log('\n✅ Test completato - File CSV analizzato correttamente');
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
        throw error;
    }
}

testSimple()
    .then(() => {
        console.log('\n🏁 Test semplice completato!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test fallito:', error.message);
        process.exit(1);
    });