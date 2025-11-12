/**
 * Test per verificare l'import completo del file CSV con clienti e contratti
 * Debug per capire perché i contratti non vengono importati
 */

const fs = require('fs');
const path = require('path');

async function testFullImportDebug() {
    console.log('🧪 TEST: Debug Import Completo CSV');
    console.log('=' .repeat(50));

    try {
        // Leggi il file CSV
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        console.log(`📁 File CSV caricato: ${csvPath}`);
        console.log(`📊 Dimensione file: ${csvContent.length} caratteri`);

        // Analizza il contenuto del CSV
        const lines = csvContent.split('\n').filter(line => line.trim());
        console.log(`📋 Righe totali: ${lines.length}`);

        if (lines.length === 0) {
            throw new Error('File CSV vuoto');
        }

        // Estrai header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('📋 Headers CSV:', headers);
        console.log('');

        // Analizza i tipi di record
        const recordTypes = {};
        const recordDetails = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const record = {};
            
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });

            const tipoRecord = record.tipo_record || 'unknown';
            recordTypes[tipoRecord] = (recordTypes[tipoRecord] || 0) + 1;
            
            recordDetails.push({
                riga: i + 1,
                tipo: tipoRecord,
                identificatori: {
                    nome: record.nome,
                    cognome: record.cognome,
                    codice_fiscale: record.codice_fiscale,
                    pod: record.pod,
                    pdr: record.pdr,
                    numero_contratto: record.numero_contratto
                }
            });
        }

        console.log('📊 ANALISI TIPI DI RECORD:');
        console.log('=' .repeat(30));
        Object.entries(recordTypes).forEach(([tipo, count]) => {
            console.log(`  ${tipo}: ${count} record`);
        });
        console.log('');

        console.log('📋 DETTAGLIO PRIMI 10 RECORD:');
        console.log('=' .repeat(40));
        recordDetails.slice(0, 10).forEach(record => {
            console.log(`  Riga ${record.riga}: ${record.tipo}`);
            if (record.tipo === 'cliente_privato') {
                console.log(`    Cliente: ${record.identificatori.nome} ${record.identificatori.cognome} (${record.identificatori.codice_fiscale})`);
            } else if (record.tipo === 'contratto_luce') {
                console.log(`    Contratto Luce: POD=${record.identificatori.pod}, Cliente=${record.identificatori.nome} ${record.identificatori.cognome}`);
            } else if (record.tipo === 'contratto_gas') {
                console.log(`    Contratto Gas: PDR=${record.identificatori.pdr}, Cliente=${record.identificatori.nome} ${record.identificatori.cognome}`);
            }
        });
        console.log('');

        // Test del servizio di import unificato
        console.log('🔍 TEST UNIFIED IMPORT SERVICE:');
        console.log('=' .repeat(35));

        try {
            // Importa il servizio
            const { UnifiedImportService } = require('./services/unifiedImportService');
            const importService = new UnifiedImportService();

            console.log('📄 Inizializzazione servizio import...');
            
            // Test dell'import completo
            console.log('🚀 Avvio import completo...');
            const fileBuffer = Buffer.from(csvContent, 'utf8');
            
            const importResult = await importService.importFile(
                fileBuffer,
                'import_10_clienti_completi_super_import.csv',
                {
                    dryRun: true, // Test senza salvare nel database
                    confidenceThreshold: 0.5,
                    batchSize: 100
                }
            );

            console.log(`✅ Import completato: ${importResult.success}`);
            console.log(`📊 Righe totali: ${importResult.totalRows}`);
            console.log(`📊 Righe processate: ${importResult.processedRows}`);
            console.log(`📊 Righe inserite: ${importResult.insertedRows}`);
            console.log(`📊 Righe aggiornate: ${importResult.updatedRows}`);
            console.log(`📊 Righe saltate: ${importResult.skippedRows}`);
            console.log(`📊 Righe con errori: ${importResult.errorRows}`);
            
            if (importResult.parseResult) {
                console.log('\n📋 Risultato parsing:');
                console.log(`  Record parsati: ${importResult.parseResult.records.length}`);
                console.log(`  Riepilogo detection:`, importResult.parseResult.detectionSummary);
            }

            if (importResult.insertedRecords) {
                console.log('\n📋 Record inseriti per tipo:');
                Object.entries(importResult.insertedRecords).forEach(([tipo, records]) => {
                    console.log(`  ${tipo}: ${records.length} record`);
                });
            }

            if (importResult.errorReport && importResult.errorReport.errors.length > 0) {
                console.log('\n❌ Errori riscontrati:');
                importResult.errorReport.errors.slice(0, 5).forEach(error => {
                    console.log(`  - ${error.message} (Riga: ${error.rowNumber})`);
                });
            }

        } catch (importError) {
            console.error('❌ Errore nel servizio import:', importError.message);
            console.error(importError.stack);
        }

        console.log('\n🎯 CONCLUSIONI:');
        console.log('=' .repeat(20));
        console.log(`✅ Il file CSV contiene ${recordTypes.cliente_privato || 0} clienti privati`);
        console.log(`✅ Il file CSV contiene ${recordTypes.contratto_luce || 0} contratti luce`);
        console.log(`✅ Il file CSV contiene ${recordTypes.contratto_gas || 0} contratti gas`);
        console.log('');
        
        if ((recordTypes.contratto_luce || 0) > 0 || (recordTypes.contratto_gas || 0) > 0) {
            console.log('🔍 Il file contiene contratti. Verifica i risultati del test import.');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        console.error(error.stack);
    }
}

// Esegui il test
testFullImportDebug().catch(console.error);