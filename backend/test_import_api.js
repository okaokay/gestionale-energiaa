/**
 * Test per verificare l'import tramite API HTTP
 * Simula il comportamento dell'interfaccia web
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testImportAPI() {
    console.log('🧪 TEST: Import tramite API HTTP');
    console.log('=' .repeat(50));

    try {
        const serverUrl = 'http://localhost:3001';
        
        // Verifica che il server sia attivo
        console.log('🔍 Verifica connessione server...');
        try {
            await axios.get(`${serverUrl}/api/dashboard/stats`);
            console.log('✅ Server raggiungibile');
        } catch (error) {
            throw new Error('❌ Server non raggiungibile. Assicurati che il backend sia avviato.');
        }

        // Leggi il file CSV
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        console.log(`📁 File CSV caricato: ${csvPath}`);
        console.log(`📊 Dimensione file: ${csvContent.length} caratteri`);

        // Analizza il contenuto del CSV per conferma
        const lines = csvContent.split('\n').filter(line => line.trim());
        const recordTypes = {};

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const record = {};
            
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });

            const tipoRecord = record.tipo_record || 'unknown';
            recordTypes[tipoRecord] = (recordTypes[tipoRecord] || 0) + 1;
        }

        console.log('📊 Contenuto file CSV:');
        Object.entries(recordTypes).forEach(([tipo, count]) => {
            console.log(`  ${tipo}: ${count} record`);
        });
        console.log('');

        // Prepara il form data per l'upload
        console.log('📤 Preparazione upload file...');
        const formData = new FormData();
        formData.append('file', csvContent, {
            filename: 'import_10_clienti_completi_super_import.csv',
            contentType: 'text/csv'
        });

        // Opzioni di import
        formData.append('options', JSON.stringify({
            dryRun: false, // Import reale
            confidenceThreshold: 0.5,
            batchSize: 100,
            skipValidation: false,
            skipAssociation: false
        }));

        console.log('🚀 Avvio import tramite API...');
        
        // Effettua la chiamata API
        const response = await axios.post(`${serverUrl}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000 // 60 secondi timeout
        });

        console.log(`✅ Risposta API ricevuta: ${response.status}`);
        
        const result = response.data;
        
        console.log('\n📊 RISULTATI IMPORT:');
        console.log('=' .repeat(25));
        console.log(`✅ Successo: ${result.success}`);
        console.log(`📊 Righe totali: ${result.totalRows || 'N/A'}`);
        console.log(`📊 Righe processate: ${result.processedRows || 'N/A'}`);
        console.log(`📊 Righe inserite: ${result.insertedRows || 'N/A'}`);
        console.log(`📊 Righe aggiornate: ${result.updatedRows || 'N/A'}`);
        console.log(`📊 Righe saltate: ${result.skippedRows || 'N/A'}`);
        console.log(`📊 Righe con errori: ${result.errorRows || 'N/A'}`);

        if (result.insertedRecords) {
            console.log('\n📋 Record inseriti per tipo:');
            Object.entries(result.insertedRecords).forEach(([tipo, records]) => {
                console.log(`  ${tipo}: ${Array.isArray(records) ? records.length : 'N/A'} record`);
            });
        }

        if (result.detectionResult) {
            console.log('\n🔍 Risultato detection:');
            console.log(`  Tipo rilevato: ${result.detectionResult.type}`);
            console.log(`  Confidenza: ${result.detectionResult.confidence}%`);
        }

        if (result.parseResult && result.parseResult.detectionSummary) {
            console.log('\n📋 Riepilogo parsing:');
            Object.entries(result.parseResult.detectionSummary).forEach(([tipo, count]) => {
                console.log(`  ${tipo}: ${count} record`);
            });
        }

        if (result.errorReport && result.errorReport.errors && result.errorReport.errors.length > 0) {
            console.log('\n❌ Errori riscontrati:');
            result.errorReport.errors.slice(0, 5).forEach(error => {
                console.log(`  - ${error.message} (Riga: ${error.rowNumber || 'N/A'})`);
            });
        }

        console.log('\n🎯 ANALISI RISULTATI:');
        console.log('=' .repeat(25));
        
        const clientiInseriti = result.insertedRecords?.cliente_privato?.length || 0;
        const contrattiLuceInseriti = result.insertedRecords?.contratto_luce?.length || 0;
        const contrattiGasInseriti = result.insertedRecords?.contratto_gas?.length || 0;
        
        console.log(`📊 Clienti privati inseriti: ${clientiInseriti}`);
        console.log(`📊 Contratti luce inseriti: ${contrattiLuceInseriti}`);
        console.log(`📊 Contratti gas inseriti: ${contrattiGasInseriti}`);
        
        if (clientiInseriti > 0 && (contrattiLuceInseriti === 0 && contrattiGasInseriti === 0)) {
            console.log('\n⚠️  PROBLEMA IDENTIFICATO:');
            console.log('   I clienti sono stati importati ma i contratti NO!');
            console.log('   Questo conferma il bug segnalato dall\'utente.');
        } else if (clientiInseriti > 0 && (contrattiLuceInseriti > 0 || contrattiGasInseriti > 0)) {
            console.log('\n✅ IMPORT CORRETTO:');
            console.log('   Sia clienti che contratti sono stati importati.');
        } else {
            console.log('\n❓ RISULTATO INASPETTATO:');
            console.log('   Verifica i dettagli dell\'import.');
        }

    } catch (error) {
        console.error('❌ Errore durante il test API:', error.message);
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📊 Data:', error.response.data);
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Suggerimento: Assicurati che il server backend sia avviato su porta 3001');
        }
    }
}

// Esegui il test
testImportAPI().catch(console.error);