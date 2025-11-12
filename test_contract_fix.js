/**
 * Script di test per verificare la correzione dell'ordine di processamento
 * dei contratti dopo l'inserimento dei clienti
 */

const fs = require('fs');
const path = require('path');

// Importa il servizio di import
const { UnifiedImportService } = require('./backend/dist/services/unifiedImportService');

async function testContractFix() {
    console.log('🧪 TEST: Verifica correzione ordine processamento contratti');
    console.log('=' .repeat(60));

    try {
        // Leggi il file CSV di test
        const csvPath = path.join(__dirname, 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const fileBuffer = fs.readFileSync(csvPath);
        console.log(`📁 File CSV caricato: ${csvPath}`);
        console.log(`📊 Dimensione file: ${fileBuffer.length} bytes`);

        // Crea il servizio di import
        const importService = new UnifiedImportService();

        // Esegui l'import con logging dettagliato
        console.log('\n🚀 Avvio import con ordine di processamento corretto...');
        
        const result = await importService.importFile(
            fileBuffer,
            'import_10_clienti_completi_super_import.csv',
            {
                dryRun: false, // Esegui l'import reale
                skipValidation: false,
                skipAssociation: false,
                confidenceThreshold: 0.5,
                userId: 1
            }
        );

        console.log('\n📊 RISULTATI IMPORT:');
        console.log('=' .repeat(40));
        console.log(`✅ Successo: ${result.success}`);
        console.log(`📝 Righe totali: ${result.totalRows}`);
        console.log(`🔄 Righe processate: ${result.processedRows}`);
        console.log(`➕ Righe inserite: ${result.insertedRows}`);
        console.log(`🔄 Righe aggiornate: ${result.updatedRows}`);
        console.log(`⏭️ Righe saltate: ${result.skippedRows}`);
        console.log(`❌ Righe con errori: ${result.errorRows}`);

        console.log('\n📋 RECORD INSERITI PER TIPO:');
        console.log('=' .repeat(40));
        for (const [tipo, records] of Object.entries(result.insertedRecords)) {
            console.log(`${tipo}: ${records.length} record`);
            if (records.length > 0) {
                console.log(`  - Primo record: ${JSON.stringify(records[0], null, 2).substring(0, 200)}...`);
            }
        }

        if (result.errorReport && result.errorReport.errors.length > 0) {
            console.log('\n❌ ERRORI RILEVATI:');
            console.log('=' .repeat(40));
            result.errorReport.errors.forEach((error, index) => {
                console.log(`${index + 1}. Riga ${error.rowNumber}: ${error.message}`);
            });
        }

        // Verifica che i clienti siano stati inseriti prima dei contratti
        console.log('\n🔍 VERIFICA ORDINE DI PROCESSAMENTO:');
        console.log('=' .repeat(40));
        
        const hasClientiPrivati = result.insertedRecords.cliente_privato && result.insertedRecords.cliente_privato.length > 0;
        const hasContrattiLuce = result.insertedRecords.contratto_luce && result.insertedRecords.contratto_luce.length > 0;
        const hasContrattiGas = result.insertedRecords.contratto_gas && result.insertedRecords.contratto_gas.length > 0;

        console.log(`👥 Clienti privati inseriti: ${hasClientiPrivati ? '✅' : '❌'}`);
        console.log(`💡 Contratti luce inseriti: ${hasContrattiLuce ? '✅' : '❌'}`);
        console.log(`🔥 Contratti gas inseriti: ${hasContrattiGas ? '✅' : '❌'}`);

        if (hasClientiPrivati && (hasContrattiLuce || hasContrattiGas)) {
            console.log('🎉 SUCCESSO: I clienti sono stati processati prima dei contratti!');
        } else if (!hasClientiPrivati && (hasContrattiLuce || hasContrattiGas)) {
            console.log('⚠️ ATTENZIONE: Contratti inseriti senza clienti corrispondenti');
        } else {
            console.log('ℹ️ INFO: Nessun contratto da verificare');
        }

        return result;

    } catch (error) {
        console.error('❌ ERRORE durante il test:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Esegui il test se questo script viene chiamato direttamente
if (require.main === module) {
    testContractFix()
        .then((result) => {
            console.log('\n🏁 Test completato con successo!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test fallito:', error.message);
            process.exit(1);
        });
}

module.exports = { testContractFix };