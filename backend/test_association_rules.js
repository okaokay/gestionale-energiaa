const fs = require('fs');
const path = require('path');

// Simulazione delle regole di associazione aggiornate
const associationRules = [
    // Contratti Luce -> Clienti Privati (con campi semplici del CSV)
    {
        sourceType: 'contratto_luce',
        targetType: 'cliente_privato',
        matchFields: [
            { sourceField: 'codice_fiscale', targetField: 'codice_fiscale', matchType: 'exact', weight: 1.0 },
            { sourceField: 'email_principale', targetField: 'email_principale', matchType: 'exact', weight: 0.9 },
            { sourceField: 'telefono_mobile', targetField: 'telefono_mobile', matchType: 'exact', weight: 0.8 },
            { sourceField: 'nome', targetField: 'nome', matchType: 'fuzzy', weight: 0.6 },
            { sourceField: 'cognome', targetField: 'cognome', matchType: 'fuzzy', weight: 0.6 }
        ],
        priority: 1,
        required: true
    },
    // Contratti Gas -> Clienti Privati (con campi semplici del CSV)
    {
        sourceType: 'contratto_gas',
        targetType: 'cliente_privato',
        matchFields: [
            { sourceField: 'codice_fiscale', targetField: 'codice_fiscale', matchType: 'exact', weight: 1.0 },
            { sourceField: 'email_principale', targetField: 'email_principale', matchType: 'exact', weight: 0.9 },
            { sourceField: 'telefono_mobile', targetField: 'telefono_mobile', matchType: 'exact', weight: 0.8 },
            { sourceField: 'nome', targetField: 'nome', matchType: 'fuzzy', weight: 0.6 },
            { sourceField: 'cognome', targetField: 'cognome', matchType: 'fuzzy', weight: 0.6 }
        ],
        priority: 1,
        required: true
    }
];

async function testAssociationRules() {
    console.log('🔍 Test delle regole di associazione aggiornate...\n');

    // Leggi il file CSV
    const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.error('❌ File CSV non trovato:', csvPath);
        return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log('📋 Headers del CSV:', headers);
    console.log('📊 Numero di righe (incluso header):', lines.length);
    
    // Analizza i record
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const record = {};
        headers.forEach((header, index) => {
            record[header] = values[index] || '';
        });
        records.push(record);
    }
    
    // Separa i record per tipo
    const clienti = records.filter(r => r.tipo_record === 'cliente_privato');
    const contrattiLuce = records.filter(r => r.tipo_record === 'contratto_luce');
    const contrattiGas = records.filter(r => r.tipo_record === 'contratto_gas');
    
    console.log('\n📊 Analisi dei record:');
    console.log(`- Clienti privati: ${clienti.length}`);
    console.log(`- Contratti luce: ${contrattiLuce.length}`);
    console.log(`- Contratti gas: ${contrattiGas.length}`);
    
    // Test delle associazioni
    console.log('\n🔗 Test delle associazioni:');
    
    // Test contratti luce -> clienti
    contrattiLuce.forEach((contratto, index) => {
        console.log(`\n📋 Contratto Luce ${index + 1}:`);
        console.log(`  - Codice Fiscale: ${contratto.codice_fiscale}`);
        console.log(`  - Email: ${contratto.email_principale}`);
        console.log(`  - Nome: ${contratto.nome}`);
        console.log(`  - Cognome: ${contratto.cognome}`);
        
        // Cerca corrispondenze con i clienti
        const matches = clienti.filter(cliente => {
            return cliente.codice_fiscale === contratto.codice_fiscale ||
                   cliente.email_principale === contratto.email_principale;
        });
        
        if (matches.length > 0) {
            console.log(`  ✅ Trovate ${matches.length} corrispondenze:`);
            matches.forEach(match => {
                console.log(`    - Cliente: ${match.nome} ${match.cognome} (${match.codice_fiscale})`);
            });
        } else {
            console.log(`  ❌ Nessuna corrispondenza trovata`);
        }
    });
    
    // Test contratti gas -> clienti
    contrattiGas.forEach((contratto, index) => {
        console.log(`\n⛽ Contratto Gas ${index + 1}:`);
        console.log(`  - Codice Fiscale: ${contratto.codice_fiscale}`);
        console.log(`  - Email: ${contratto.email_principale}`);
        console.log(`  - Nome: ${contratto.nome}`);
        console.log(`  - Cognome: ${contratto.cognome}`);
        
        // Cerca corrispondenze con i clienti
        const matches = clienti.filter(cliente => {
            return cliente.codice_fiscale === contratto.codice_fiscale ||
                   cliente.email_principale === contratto.email_principale;
        });
        
        if (matches.length > 0) {
            console.log(`  ✅ Trovate ${matches.length} corrispondenze:`);
            matches.forEach(match => {
                console.log(`    - Cliente: ${match.nome} ${match.cognome} (${match.codice_fiscale})`);
            });
        } else {
            console.log(`  ❌ Nessuna corrispondenza trovata`);
        }
    });
    
    console.log('\n✅ Test delle regole di associazione completato!');
}

// Esegui il test
testAssociationRules().catch(console.error);