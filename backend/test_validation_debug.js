const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testValidationDebug() {
    console.log('🧪 TEST DEBUG VALIDAZIONE');
    console.log('==========================');
    
    try {
        // 1. Login
        console.log('🔐 Effettuando login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login effettuato con successo');
        
        // 2. Pulisci il database prima del test
        console.log('\n🧹 Pulendo il database...');
        await axios.delete(`${BASE_URL}/api/clienti-privati/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        await axios.delete(`${BASE_URL}/api/clienti-aziende/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        await axios.delete(`${BASE_URL}/api/contratti-luce/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        await axios.delete(`${BASE_URL}/api/contratti-gas/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Database pulito');
        
        // 3. Test importazione con validazione disabilitata
        console.log('\n📤 Testando importazione con validazione disabilitata...');
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream('./test_contratti_corretto.csv'));
        formData.append('entityType', 'contratti');
        formData.append('autoDetectType', 'true');
        formData.append('skipValidation', 'true');
        formData.append('skipAssociation', 'true');
        formData.append('dryRun', 'false');
        formData.append('batchSize', '10');
        formData.append('confidenceThreshold', '0.1');
        
        const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        
        const importId = uploadResponse.data.importId;
        console.log(`✅ Upload completato. ImportId: ${importId}`);
        
        // 4. Monitora l'importazione
        console.log('\n⏳ Monitorando l\'importazione...');
        let progress;
        let attempts = 0;
        const maxAttempts = 30;
        
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const progressResponse = await axios.get(`${BASE_URL}/api/import/${importId}/progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            progress = progressResponse.data;
            console.log(`📊 Progresso: ${progress.percentage}% - Stato: ${progress.stage} - Processati: ${progress.processedRecords}/${progress.totalRecords}`);
            
            attempts++;
        } while (progress.stage !== 'completed' && progress.stage !== 'failed' && attempts < maxAttempts);
        
        // 5. Ottieni il risultato finale
        console.log('\n📋 Ottenendo risultato finale...');
        const resultResponse = await axios.get(`${BASE_URL}/api/import/${importId}/result`, {
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
            result.errors.forEach((error, index) => {
                console.log(`\nErrore ${index + 1}:`);
                console.log(`  Riga: ${error.row}`);
                console.log(`  Codice: ${error.code}`);
                console.log(`  Messaggio: ${error.message}`);
                if (error.details) {
                    console.log(`  Dettagli: ${JSON.stringify(error.details, null, 2)}`);
                }
            });
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
        
        // 6. Verifica il database
        console.log('\n🔍 Verificando il database...');
        
        const clientiPrivatiResponse = await axios.get(`${BASE_URL}/api/clienti-privati`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clientiAziendeResponse = await axios.get(`${BASE_URL}/api/clienti-aziende`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const contrattiLuceResponse = await axios.get(`${BASE_URL}/api/contratti-luce`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const contrattiGasResponse = await axios.get(`${BASE_URL}/api/contratti-gas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('\n📊 STATO DATABASE:');
        console.log('==================');
        console.log(`Clienti privati: ${clientiPrivatiResponse.data.length}`);
        console.log(`Clienti aziende: ${clientiAziendeResponse.data.length}`);
        console.log(`Contratti luce: ${contrattiLuceResponse.data.length}`);
        console.log(`Contratti gas: ${contrattiGasResponse.data.length}`);
        
        if (clientiPrivatiResponse.data.length > 0) {
            console.log('\n👤 CLIENTI PRIVATI:');
            clientiPrivatiResponse.data.forEach(cliente => {
                console.log(`  ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale})`);
            });
        }
        
        if (clientiAziendeResponse.data.length > 0) {
            console.log('\n🏢 CLIENTI AZIENDE:');
            clientiAziendeResponse.data.forEach(cliente => {
                console.log(`  ${cliente.ragione_sociale} (${cliente.partita_iva})`);
            });
        }
        
        console.log('\n✅ Test completato!');
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
    }
}

testValidationDebug();