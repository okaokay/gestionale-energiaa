const fs = require('fs');
const path = require('path');

// Simuliamo l'ambiente Node.js per il backend
process.env.NODE_ENV = 'development';

// Importiamo il servizio direttamente
const { UnifiedImportService } = require('./backend/src/services/unifiedImportService');

async function testDirectImport() {
    console.log('🧪 TEST DIRETTO UNIFIED IMPORT SERVICE');
    console.log('=====================================\n');

    try {
        // Creiamo un'istanza del servizio
        const importService = new UnifiedImportService();
        
        // Leggiamo il file CSV
        const csvPath = path.join(__dirname, 'import_10_clienti_completi_super_import.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        
        console.log('📄 File CSV caricato:', csvPath);
        console.log('📊 Dimensione file:', csvContent.length, 'caratteri');
        console.log('📋 Prime 3 righe:');
        console.log(csvContent.split('\n').slice(0, 3).join('\n'));
        console.log('\n');

        // Testiamo il parsing
        console.log('🔍 FASE 1: PARSING DEL FILE');
        console.log('---------------------------');
        
        const parseResult = await importService.parseFile(csvContent, 'csv');
        console.log('✅ Parsing completato');
        console.log('📊 Record totali parsati:', parseResult.records.length);
        console.log('📋 Tipi di record trovati:');
        
        const recordTypes = {};
        parseResult.records.forEach(record => {
            const type = record.tipo_record || 'unknown';
            recordTypes[type] = (recordTypes[type] || 0) + 1;
        });
        
        Object.entries(recordTypes).forEach(([type, count]) => {
            console.log(`   - ${type}: ${count} record`);
        });
        
        console.log('\n🔍 FASE 2: ANALISI RECORD CONTRATTI');
        console.log('-----------------------------------');
        
        const contrattiLuce = parseResult.records.filter(r => r.tipo_record === 'contratto_luce');
        const contrattiGas = parseResult.records.filter(r => r.tipo_record === 'contratto_gas');
        
        console.log('⚡ Contratti Luce trovati:', contrattiLuce.length);
        contrattiLuce.forEach((contratto, index) => {
            console.log(`   ${index + 1}. POD: ${contratto.pod}, Cliente: ${contratto.codice_fiscale}, Numero: ${contratto.numero_contratto}`);
        });
        
        console.log('\n🔥 Contratti Gas trovati:', contrattiGas.length);
        contrattiGas.forEach((contratto, index) => {
            console.log(`   ${index + 1}. PDR: ${contratto.pdr}, Cliente: ${contratto.codice_fiscale}, Numero: ${contratto.numero_contratto}`);
        });

        console.log('\n🔍 FASE 3: VALIDAZIONE RECORD');
        console.log('-----------------------------');
        
        const validationResult = await importService.validateRecords(parseResult.records);
        console.log('✅ Validazione completata');
        console.log('📊 Record validi:', validationResult.validRecords.length);
        console.log('❌ Record con errori:', validationResult.errors.length);
        
        if (validationResult.errors.length > 0) {
            console.log('\n❌ ERRORI DI VALIDAZIONE:');
            validationResult.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. Riga ${error.rowIndex}: ${error.message}`);
                if (error.record && error.record.tipo_record) {
                    console.log(`      Tipo: ${error.record.tipo_record}, Dati: ${JSON.stringify(error.record).substring(0, 100)}...`);
                }
            });
        }

        console.log('\n🔍 FASE 4: ASSOCIAZIONE RECORD');
        console.log('------------------------------');
        
        const associationResult = await importService.associateRecords(validationResult.validRecords);
        console.log('✅ Associazione completata');
        console.log('📊 Gruppi di record associati:', Object.keys(associationResult.associatedRecords).length);
        
        Object.entries(associationResult.associatedRecords).forEach(([key, group]) => {
            console.log(`   Gruppo ${key}:`);
            Object.entries(group).forEach(([type, records]) => {
                console.log(`     - ${type}: ${records.length} record`);
            });
        });

        console.log('\n🔍 FASE 5: SIMULAZIONE INSERIMENTO (DRY RUN)');
        console.log('--------------------------------------------');
        
        // Simuliamo l'inserimento con dry run
        const insertResult = await importService.insertRecords(
            associationResult.associatedRecords,
            { userId: 1, agentId: null },
            true // dry run
        );
        
        console.log('✅ Simulazione inserimento completata');
        console.log('📊 Risultati simulazione:');
        console.log('   - Successi:', insertResult.summary.successful);
        console.log('   - Errori:', insertResult.summary.failed);
        console.log('   - Totale:', insertResult.summary.total);
        
        if (insertResult.errors.length > 0) {
            console.log('\n❌ ERRORI DURANTE LA SIMULAZIONE:');
            insertResult.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message}`);
                if (error.record) {
                    console.log(`      Record: ${JSON.stringify(error.record).substring(0, 100)}...`);
                }
            });
        }

        console.log('\n🎯 CONCLUSIONI');
        console.log('==============');
        console.log('Il test diretto del servizio di importazione è stato completato.');
        console.log('Verifica i risultati sopra per identificare eventuali problemi nella pipeline di importazione.');

    } catch (error) {
        console.error('❌ ERRORE DURANTE IL TEST:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Eseguiamo il test
testDirectImport().catch(console.error);