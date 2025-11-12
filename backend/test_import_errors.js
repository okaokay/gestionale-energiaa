const axios = require('axios');

const baseURL = 'http://localhost:3001';

async function testImportErrors() {
    console.log('🔍 ANALISI ERRORI IMPORTAZIONE');
    console.log('==============================\n');

    try {
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');

        // 2. Upload file
        console.log('📤 Upload file CSV...');
        const FormData = require('form-data');
        const fs = require('fs');
        
        const path = require('path');
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        
        const uploadResponse = await axios.post(`${baseURL}/api/unified-import/upload`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });
        
        const importId = uploadResponse.data.data.importId;
        console.log(`✅ Upload completato. Import ID: ${importId}\n`);

        // 3. Attendi elaborazione
        console.log('⏳ Attendo elaborazione (5 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 4. Nuovo login per sicurezza
        const loginResponse2 = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        const token2 = loginResponse2.data.data.token;

        // 5. Recupera stato dettagliato
        console.log('📊 Recupero stato dettagliato...');
        const statusResponse = await axios.get(`${baseURL}/api/unified-import/progress/${importId}`, {
            headers: { 'Authorization': `Bearer ${token2}` }
        });
        
        console.log('📈 Stato importazione:');
        console.log(JSON.stringify(statusResponse.data, null, 2));

        // 6. Prova a recuperare errori dettagliati (se l'endpoint esiste)
        console.log('\n🚨 Tentativo recupero errori dettagliati...');
        try {
            const errorsResponse = await axios.get(`${baseURL}/api/unified-import/errors/${importId}`, {
                headers: { 'Authorization': `Bearer ${token2}` }
            });
            console.log('❌ Errori trovati:');
            console.log(JSON.stringify(errorsResponse.data, null, 2));
        } catch (error) {
            console.log('ℹ️  Endpoint errori non disponibile o nessun errore dettagliato');
        }

        // 7. Prova a recuperare risultati (se l'endpoint esiste)
        console.log('\n📋 Tentativo recupero risultati...');
        try {
            const resultsResponse = await axios.get(`${baseURL}/api/unified-import/results/${importId}`, {
                headers: { 'Authorization': `Bearer ${token2}` }
            });
            console.log('📊 Risultati:');
            console.log(JSON.stringify(resultsResponse.data, null, 2));
        } catch (error) {
            console.log('ℹ️  Endpoint risultati non disponibile');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('🔑 Problema di autenticazione - token scaduto?');
        }
    }
}

testImportErrors();