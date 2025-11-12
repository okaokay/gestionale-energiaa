const fs = require('fs');
const path = require('path');

// Test dettagliato del processo di importazione
async function testImportProcess() {
    console.log('🔍 TEST PROCESSO DI IMPORTAZIONE DETTAGLIATO');
    console.log('=============================================');
    
    const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.error('❌ File CSV non trovato:', csvPath);
        return;
    }
    
    // Simula il processo di parsing del CSV
    console.log('📄 FASE 1: PARSING DEL FILE CSV');
    console.log('--------------------------------');
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
    
    console.log(`Header CSV: ${header.join(', ')}`);
    console.log(`Righe totali: ${lines.length - 1} (escluso header)`);
    
    // Simula il parsing dei record
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = line.split(',').map(val => val.trim().replace(/"/g, ''));
        const record = { _rowNumber: i };
        
        header.forEach((col, index) => {
            record[col] = values[index] || '';
        });
        
        records.push(record);
    }
    
    console.log(`Record parsati: ${records.length}`);
    console.log('');
    
    // Simula il rilevamento dei tipi
    console.log('🔍 FASE 2: RILEVAMENTO TIPI DI RECORD');
    console.log('-------------------------------------');
    
    const recordsByType = {};
    
    for (const record of records) {
        let recordType = 'unknown';
        
        // Simula la logica di rilevamento del tipo
        if (record.tipo_record) {
            recordType = record.tipo_record;
        } else {
            // Logica di fallback
            if (record.codice_fiscale && !record.pod && !record.pdr) {
                recordType = 'cliente_privato';
            } else if (record.pod && record.codice_fiscale) {
                recordType = 'contratto_luce';
            } else if (record.pdr && record.codice_fiscale) {
                recordType = 'contratto_gas';
            }
        }
        
        if (!recordsByType[recordType]) {
            recordsByType[recordType] = [];
        }
        recordsByType[recordType].push(record);
    }
    
    // Mostra il raggruppamento per tipo
    Object.entries(recordsByType).forEach(([type, records]) => {
        console.log(`${type}: ${records.length} record`);
    });
    console.log('');
    
    // Simula la validazione
    console.log('✅ FASE 3: VALIDAZIONE DEI RECORD');
    console.log('----------------------------------');
    
    const validatedRecords = {};
    let totalValidated = 0;
    
    for (const [type, typeRecords] of Object.entries(recordsByType)) {
        validatedRecords[type] = [];
        
        for (const record of typeRecords) {
            // Simula validazione semplice
            let isValid = false;
            
            switch (type) {
                case 'cliente_privato':
                    isValid = record.codice_fiscale && record.codice_fiscale.length > 0;
                    break;
                case 'contratto_luce':
                    isValid = record.pod && record.codice_fiscale;
                    break;
                case 'contratto_gas':
                    isValid = record.pdr && record.codice_fiscale;
                    break;
                default:
                    isValid = false;
            }
            
            if (isValid) {
                validatedRecords[type].push(record);
                totalValidated++;
            }
        }
        
        console.log(`${type}: ${validatedRecords[type].length}/${typeRecords.length} record validati`);
    }
    
    console.log(`Totale record validati: ${totalValidated}`);
    console.log('');
    
    // Simula l'ordine di processamento
    console.log('🔄 FASE 4: ORDINE DI PROCESSAMENTO');
    console.log('----------------------------------');
    
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
    
    for (const recordType of processingOrder) {
        if (validatedRecords[recordType] && validatedRecords[recordType].length > 0) {
            console.log(`${recordType}: ${validatedRecords[recordType].length} record da processare`);
            
            // Mostra i primi 2 record per debug
            if (validatedRecords[recordType].length > 0) {
                console.log(`  Esempio record 1:`, {
                    codice_fiscale: validatedRecords[recordType][0].codice_fiscale,
                    pod: validatedRecords[recordType][0].pod || 'N/A',
                    pdr: validatedRecords[recordType][0].pdr || 'N/A',
                    nome: validatedRecords[recordType][0].nome || 'N/A',
                    cognome: validatedRecords[recordType][0].cognome || 'N/A'
                });
            }
        }
    }
    
    console.log('');
    
    // Analisi delle associazioni
    console.log('🔗 FASE 5: ANALISI ASSOCIAZIONI');
    console.log('--------------------------------');
    
    const clienti = validatedRecords['cliente_privato'] || [];
    const contrattiLuce = validatedRecords['contratto_luce'] || [];
    const contrattiGas = validatedRecords['contratto_gas'] || [];
    
    console.log(`Clienti privati: ${clienti.length}`);
    console.log(`Contratti luce: ${contrattiLuce.length}`);
    console.log(`Contratti gas: ${contrattiGas.length}`);
    
    // Verifica associazioni per codice fiscale
    const codiciFiscaliClienti = new Set(clienti.map(c => c.codice_fiscale));
    const codiciFiscaliContrattiLuce = new Set(contrattiLuce.map(c => c.codice_fiscale));
    const codiciFiscaliContrattiGas = new Set(contrattiGas.map(c => c.codice_fiscale));
    
    console.log('');
    console.log('Codici fiscali unici:');
    console.log(`- Clienti: ${codiciFiscaliClienti.size}`);
    console.log(`- Contratti luce: ${codiciFiscaliContrattiLuce.size}`);
    console.log(`- Contratti gas: ${codiciFiscaliContrattiGas.size}`);
    
    // Verifica corrispondenze
    const contrattiLuceSenzaCliente = contrattiLuce.filter(c => !codiciFiscaliClienti.has(c.codice_fiscale));
    const contrattiGasSenzaCliente = contrattiGas.filter(c => !codiciFiscaliClienti.has(c.codice_fiscale));
    
    console.log('');
    console.log('Problemi di associazione:');
    console.log(`- Contratti luce senza cliente: ${contrattiLuceSenzaCliente.length}`);
    console.log(`- Contratti gas senza cliente: ${contrattiGasSenzaCliente.length}`);
    
    if (contrattiLuceSenzaCliente.length > 0) {
        console.log('  Contratti luce orfani:', contrattiLuceSenzaCliente.map(c => c.codice_fiscale));
    }
    
    if (contrattiGasSenzaCliente.length > 0) {
        console.log('  Contratti gas orfani:', contrattiGasSenzaCliente.map(c => c.codice_fiscale));
    }
    
    console.log('');
    console.log('✅ Test completato!');
    console.log('');
    console.log('📊 RIEPILOGO:');
    console.log(`- Record totali: ${records.length}`);
    console.log(`- Record validati: ${totalValidated}`);
    console.log(`- Clienti da inserire: ${clienti.length}`);
    console.log(`- Contratti luce da inserire: ${contrattiLuce.length}`);
    console.log(`- Contratti gas da inserire: ${contrattiGas.length}`);
}

// Esegui il test
testImportProcess().catch(console.error);