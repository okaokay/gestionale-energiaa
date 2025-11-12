const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testImportSimpleDebug() {
    console.log('🧪 TEST IMPORT SEMPLIFICATO');
    console.log('============================');
    
    try {
        // 1. Login
        console.log('🔐 Effettuando login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login effettuato con successo');
        
        // 2. Test importazione con validazione disabilitata
        console.log('\n📤 Testando importazione...');
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream('./test_contratti_corretto.csv'));
        formData.append('entityType', 'contratti');
        formData.append('autoDetectType', 'true');
        formData.append('skipValidation', 'true');
        formData.append('skipAssociation', 'true');
        formData.append('dryRun', 'false');
        formData.append('batchSize', '10');
        formData.append('confidenceThreshold', '0.1');
        
        const uploadResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            },
            timeout: 30000
        });
        
        const importId = uploadResponse.data.importId;
        console.log(`✅ Upload completato. ImportId: ${importId}`);
        
        // 3. Monitora l'importazione
        console.log('\n⏳ Monitorando l\'importazione...');
        let progress;
        let attempts = 0;
        const maxAttempts = 30;
        
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const progressResponse = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            progress = progressResponse.data;
            console.log(`📊 Progresso: ${progress.percentage}% - Stato: ${progress.stage} - Processati: ${progress.processedRecords}/${progress.totalRecords}`);
            
            attempts++;
        } while (progress.stage !== 'completed' && progress.stage !== 'failed' && attempts < maxAttempts);
        
        // 4. Ottieni il risultato finale
        console.log('\n📋 Ottenendo risultato finale...');
        const resultResponse = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = resultResponse.data;
        console.log('\n📊 RISULTATO IMPORTAZIONE:');
        console.log('==========================');
        console.log(`Stato: ${result.status}`);
        console.log(`Righe totali: ${result.totalRows}`);
        console.log(`Inserite: ${result.insertedCount}`);
        console.log(`Aggiornate: ${result.updatedCount}`);
        console.log(`Saltate: ${result.skippedCount}`);
        console.log(`Errori: ${result.errorCount}`);
        
        if (result.errors && result.errors.length > 0) {
            console.log('\n❌ ERRORI DETTAGLIATI:');
            console.log('======================');
            result.errors.slice(0, 5).forEach((error, index) => {
                console.log(`\nErrore ${index + 1}:`);
                console.log(`  Riga: ${error.row}`);
                console.log(`  Codice: ${error.code}`);
                console.log(`  Messaggio: ${error.message}`);
                if (error.details) {
                    console.log(`  Dettagli: ${JSON.stringify(error.details, null, 2)}`);
                }
            });
            
            if (result.errors.length > 5) {
                console.log(`\n... e altri ${result.errors.length - 5} errori`);
            }
        }
        
        if (result.report) {
            console.log('\n📈 REPORT DETTAGLIATO:');
            console.log('======================');
            Object.entries(result.report).forEach(([tipo, stats]) => {
                console.log(`${tipo}:`);
                console.log(`  Inseriti: ${stats.inserted || 0}`);
                console.log(`  Aggiornati: ${stats.updated || 0}`);
                console.log(`  Saltati: ${stats.skipped || 0}`);
                console.log(`  Errori: ${stats.errors || 0}`);
            });
        }
        
        // 5. Verifica il database
        console.log('\n🔍 Verificando il database...');
        
        try {
            const clientiPrivatiResponse = await axios.get(`${BASE_URL}/api/clienti-privati`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Clienti privati: ${clientiPrivatiResponse.data.length}`);
        } catch (e) {
            console.log('Clienti privati: endpoint non disponibile');
        }
        
        try {
            const clientiAziendeResponse = await axios.get(`${BASE_URL}/api/clienti-aziende`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Clienti aziende: ${clientiAziendeResponse.data.length}`);
        } catch (e) {
            console.log('Clienti aziende: endpoint non disponibile');
        }
        
        try {
            const contrattiLuceResponse = await axios.get(`${BASE_URL}/api/contratti-luce`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Contratti luce: ${contrattiLuceResponse.data.length}`);
        } catch (e) {
            console.log('Contratti luce: endpoint non disponibile');
        }
        
        try {
            const contrattiGasResponse = await axios.get(`${BASE_URL}/api/contratti-gas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Contratti gas: ${contrattiGasResponse.data.length}`);
        } catch (e) {
            console.log('Contratti gas: endpoint non disponibile');
        }
        
        console.log('\n✅ Test completato!');
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error(`Status: ${error.response.status}`);
        }
    }
}

testImportSimpleDebug();