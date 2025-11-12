const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testImportImmediate() {
    console.log('⚡ TEST IMPORTAZIONE IMMEDIATO');
    console.log('==============================\n');

    const baseURL = 'http://localhost:3001';

    try {
        // 1. Login e upload in sequenza rapida
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito, token ottenuto\n');

        // 2. Upload immediato
        console.log('📤 Upload immediato file CSV...');
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));

        // Uso il token immediatamente
        const uploadResponse = await axios.post(`${baseURL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            },
            timeout: 30000
        });

        const importId = uploadResponse.data.data.importId;
        console.log(`✅ Upload completato. Import ID: ${importId}\n`);

        // 3. Nuovo login per le verifiche successive
        console.log('🔐 Nuovo login per verifiche...');
        const loginResponse2 = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token2 = loginResponse2.data.data.token;
        console.log('✅ Secondo login riuscito\n');

        // 4. Attendi elaborazione
        console.log('⏳ Attendo elaborazione (3 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Verifica stato con nuovo token
        console.log('📊 Verifica stato importazione...');
        const statusResponse = await axios.get(`${baseURL}/api/unified-import/progress/${importId}`, {
            headers: { 'Authorization': `Bearer ${token2}` }
        });

        console.log('📈 Stato importazione:');
        console.log(JSON.stringify(statusResponse.data, null, 2));

        // 6. Nuovo login per conteggi finali
        console.log('\n🔐 Terzo login per conteggi finali...');
        const loginResponse3 = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token3 = loginResponse3.data.data.token;

        // 7. Verifica dati nel database
        console.log('🔍 Verifica dati nel database...');
        
        const clientiResponse = await axios.get(`${baseURL}/api/clienti`, {
            headers: { 'Authorization': `Bearer ${token3}` }
        });
        console.log(`👥 Clienti trovati: ${clientiResponse.data.length}`);

        const contrattiLuceResponse = await axios.get(`${baseURL}/api/contratti/luce`, {
            headers: { 'Authorization': `Bearer ${token3}` }
        });
        console.log(`💡 Contratti luce trovati: ${contrattiLuceResponse.data.length}`);

        const contrattiGasResponse = await axios.get(`${baseURL}/api/contratti/gas`, {
            headers: { 'Authorization': `Bearer ${token3}` }
        });
        console.log(`🔥 Contratti gas trovati: ${contrattiGasResponse.data.length}`);

        console.log('\n✅ Test completato!');

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('📄 Status:', error.response.status);
            console.error('📄 Data:', error.response.data);
        }
    }
}

testImportImmediate();