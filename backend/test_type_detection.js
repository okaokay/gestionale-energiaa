const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Simula il rilevamento del tipo come nel recordTypeDetector
function hasExplicitType(record) {
    const typeField = record.tipo_record || record.type || record.record_type || record.tipo || record.Tipo;
    if (typeField && typeof typeField === 'string') {
        const normalizedType = typeField.toLowerCase().trim();
        
        // Mappature specifiche per i valori comuni
        const typeMappings = {
            'privato': 'cliente_privato',
            'azienda': 'cliente_azienda',
            'cliente_privato': 'cliente_privato',
            'cliente_azienda': 'cliente_azienda',
            'luce': 'contratto_luce',
            'gas': 'contratto_gas',
            'contratto_luce': 'contratto_luce',
            'contratto_gas': 'contratto_gas'
        };
        
        // Controlla mappature dirette
        if (typeMappings[normalizedType]) {
            return typeMappings[normalizedType];
        }
        
        return normalizedType;
    }
    return null;
}

async function testTypeDetection() {
    console.log('🔍 Test rilevamento tipo record dal CSV...\n');
    
    // Trova il file CSV più recente nella cartella uploads/csv-import
    const uploadsDir = path.join(__dirname, 'uploads', 'csv-import');
    
    if (!fs.existsSync(uploadsDir)) {
        console.log('❌ Cartella uploads non trovata');
        return;
    }
    
    const files = fs.readdirSync(uploadsDir)
        .filter(file => file.endsWith('.csv'))
        .map(file => ({
            name: file,
            path: path.join(uploadsDir, file),
            stats: fs.statSync(path.join(uploadsDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    
    if (files.length === 0) {
        console.log('❌ Nessun file CSV trovato nella cartella uploads');
        return;
    }
    
    const latestFile = files[0];
    console.log(`📁 File CSV più recente: ${latestFile.name}`);
    console.log(`📅 Data modifica: ${latestFile.stats.mtime.toLocaleString()}\n`);
    
    const records = [];
    const typeStats = {};
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(latestFile.path)
            .pipe(csv())
            .on('data', (data) => {
                records.push(data);
                
                // Test rilevamento tipo
                const explicitType = hasExplicitType(data);
                
                console.log(`Riga ${records.length}:`);
                console.log(`  tipo_record: "${data.tipo_record || 'NON PRESENTE'}"`);
                console.log(`  Tipo rilevato: ${explicitType || 'NESSUNO'}`);
                console.log(`  Altri campi: ${Object.keys(data).slice(0, 5).join(', ')}...`);
                console.log('');
                
                // Statistiche
                const type = explicitType || 'unknown';
                typeStats[type] = (typeStats[type] || 0) + 1;
            })
            .on('end', () => {
                console.log(`\n📊 STATISTICHE RILEVAMENTO TIPO:`);
                console.log(`Totale record: ${records.length}`);
                console.log('Distribuzione tipi:');
                Object.entries(typeStats).forEach(([type, count]) => {
                    console.log(`  ${type}: ${count} record`);
                });
                
                // Mostra primi 3 record completi
                console.log(`\n📋 PRIMI 3 RECORD COMPLETI:`);
                records.slice(0, 3).forEach((record, index) => {
                    console.log(`\nRecord ${index + 1}:`);
                    Object.entries(record).forEach(([key, value]) => {
                        console.log(`  ${key}: "${value}"`);
                    });
                });
                
                resolve();
            })
            .on('error', reject);
    });
}

testTypeDetection().catch(console.error);