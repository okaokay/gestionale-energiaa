/**
 * Test diretto del servizio di importazione CSV senza autenticazione HTTP
 */

const fs = require('fs');
const path = require('path');

// Importa direttamente il servizio
const { UnifiedImportService } = require('./backend/services/unifiedImportService');

const CSV_FILE = path.join(__dirname, 'template_import_completo.csv');

async function testCsvImportDirect() {
    console.log('🧪 Test diretto importazione CSV con separazione pod_pdr');
    console.log('=' .repeat(60));

    try {
        // Verifica che il file CSV esista
        if (!fs.existsSync(CSV_FILE)) {
            throw new Error(`File CSV non trovato: ${CSV_FILE}`);
        }

        console.log('📁 File CSV trovato:', CSV_FILE);

        // Leggi il file CSV
        const fileBuffer = fs.readFileSync(CSV_FILE);
        const fileName = 'template_import_completo.csv';

        console.log('📤 Processamento file...');

        // Crea istanza del servizio
        const importService = new UnifiedImportService();

        // Simula un file upload object
        const mockFile = {
            buffer: fileBuffer,
            originalname: fileName,
            mimetype: 'text/csv'
        };

        // Opzioni di import
        const options = {
            validateOnly: false,
            skipDuplicates: true,
            updateExisting: false
        };

        // Esegui l'importazione
        const result = await importService.processFile(mockFile, options);

        console.log('✅ Processamento completato');
        console.log('📊 Risultato importazione:');
        console.log(JSON.stringify(result, null, 2));

        // Verifica che ci siano stati successi
        if (result.summary) {
            const { summary } = result.summary;
            console.log('\n📈 Riepilogo:');
            console.log(`- Totale record processati: ${summary.totalProcessed || 0}`);
            console.log(`- Successi: ${summary.successful || 0}`);
            console.log(`- Errori: ${summary.failed || 0}`);
            
            if (summary.successful > 0) {
                console.log('🎉 Importazione completata con successo!');
            } else {
                console.log('⚠️ Nessun record importato con successo');
            }
        }

        // Mostra dettagli sui record processati
        if (result.results && result.results.length > 0) {
            console.log('\n📋 Dettagli record:');
            result.results.forEach((record, index) => {
                console.log(`\nRecord ${index + 1}:`);
                console.log(`- Tipo: ${record.type || 'N/A'}`);
                console.log(`- Status: ${record.success ? '✅ Successo' : '❌ Errore'}`);
                if (record.data) {
                    if (record.data.nome || record.data.cognome) {
                        console.log(`- Nome: ${record.data.nome} ${record.data.cognome}`);
                    }
                    if (record.data.ragione_sociale) {
                        console.log(`- Azienda: ${record.data.ragione_sociale}`);
                    }
                    if (record.data.pod) {
                        console.log(`- POD: ${record.data.pod}`);
                    }
                    if (record.data.pdr) {
                        console.log(`- PDR: ${record.data.pdr}`);
                    }
                    if (record.data.pod_pdr) {
                        console.log(`- POD_PDR originale: ${record.data.pod_pdr}`);
                    }
                }
                if (record.error) {
                    console.log(`- Errore: ${record.error}`);
                }
            });
        }

        // Verifica specifica per la separazione pod_pdr
        console.log('\n🔍 Verifica separazione POD/PDR:');
        let podPdrSeparated = false;
        if (result.results) {
            result.results.forEach((record, index) => {
                if (record.data && (record.data.pod || record.data.pdr)) {
                    console.log(`Record ${index + 1}: POD/PDR separati correttamente`);
                    if (record.data.pod) console.log(`  - POD: ${record.data.pod}`);
                    if (record.data.pdr) console.log(`  - PDR: ${record.data.pdr}`);
                    podPdrSeparated = true;
                }
            });
        }
        
        if (podPdrSeparated) {
            console.log('✅ La separazione POD/PDR funziona correttamente!');
        } else {
            console.log('⚠️ Non è stata rilevata la separazione POD/PDR');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Esegui il test
testCsvImportDirect();