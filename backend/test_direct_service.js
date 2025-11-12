const fs = require('fs');
const path = require('path');

// Importa il servizio direttamente
async function testDirectService() {
    console.log('🧪 TEST DIRETTO DEL SERVIZIO DI IMPORTAZIONE');
    console.log('=============================================\n');

    try {
        // Importa il servizio compilato
        const { UnifiedImportService } = require('./dist/services/unifiedImportService.js');
        const importService = new UnifiedImportService();

        // Leggi il file CSV
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const fileBuffer = fs.readFileSync(csvPath);
        console.log(`📄 File caricato: ${csvPath}`);
        console.log(`📊 Dimensione: ${fileBuffer.length} bytes\n`);

        // Test di validazione del file
        console.log('🔍 FASE 1: Validazione file...');
        const validation = await importService.validateFile(fileBuffer, 'import_10_clienti_completi_super_import.csv');
        
        console.log('📋 Risultato validazione:');
        console.log(`   ✅ Valido: ${validation.valid}`);
        console.log(`   ❌ Errori: ${validation.errors.length}`);
        console.log(`   ⚠️  Warning: ${validation.warnings.length}`);
        
        if (validation.errors.length > 0) {
            console.log('\n❌ ERRORI DI VALIDAZIONE:');
            validation.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        if (validation.warnings.length > 0) {
            console.log('\n⚠️  WARNING:');
            validation.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
        }

        if (validation.sampleData) {
            console.log('\n📊 Dati di esempio:');
            validation.sampleData.slice(0, 2).forEach((record, index) => {
                console.log(`   Record ${index + 1}:`, JSON.stringify(record, null, 2));
            });
        }

        // Se la validazione è ok, prova l'import
        if (validation.valid) {
            console.log('\n🚀 FASE 2: Import completo...');
            const importResult = await importService.importFile(
                fileBuffer, 
                'import_10_clienti_completi_super_import.csv',
                {
                    autoDetectType: true,
                    skipValidation: false,
                    dryRun: false
                }
            );

            console.log('\n📋 RISULTATO IMPORT:');
            console.log(`   🆔 Import ID: ${importResult.importId}`);
            console.log(`   ✅ Successo: ${importResult.success}`);
            console.log(`   📊 Righe totali: ${importResult.totalRows}`);
            console.log(`   📝 Righe processate: ${importResult.processedRows}`);
            console.log(`   ✅ Righe inserite: ${importResult.insertedRows}`);
            console.log(`   🔄 Righe aggiornate: ${importResult.updatedRows}`);
            console.log(`   ⏭️  Righe saltate: ${importResult.skippedRows}`);
            console.log(`   ❌ Righe con errori: ${importResult.errorRows}`);
            console.log(`   ⏱️  Durata: ${importResult.duration}ms`);

            if (importResult.errorReport) {
                console.log('\n❌ DETTAGLI ERRORI:');
                console.log(JSON.stringify(importResult.errorReport, null, 2));
            }

            if (importResult.insertedRecords) {
                console.log('\n📊 RECORD INSERITI PER TIPO:');
                Object.entries(importResult.insertedRecords).forEach(([type, records]) => {
                    console.log(`   ${type}: ${Array.isArray(records) ? records.length : 0} record`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        console.error('📋 Stack trace:', error.stack);
        process.exit(1);
    }
}

testDirectService();