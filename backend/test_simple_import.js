const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSimpleImport() {
    console.log('🧪 TEST IMPORTAZIONE SEMPLIFICATO');
    console.log('=================================\n');

    const baseURL = 'http://localhost:3001';
    let authToken = null;

    try {
        // 1. Login
        console.log('🔐 Tentativo di login...');
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        authToken = loginResponse.data.token;
        console.log('✅ Login riuscito\n');

        // 2. Upload file CSV
        console.log('📤 Upload file CSV...');
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));

        const uploadResponse = await axios.post(`${baseURL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${authToken}`
            },
            timeout: 30000
        });

        const importId = uploadResponse.data.importId;
        console.log(`✅ Upload completato. Import ID: ${importId}\n`);

        // 3. Attendi un po' per l'elaborazione
        console.log('⏳ Attendo elaborazione (5 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 4. Verifica stato importazione
        console.log('📊 Verifica stato importazione...');
        const statusResponse = await axios.get(`${baseURL}/api/unified-import/progress/${importId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        console.log('📈 Stato importazione:', JSON.stringify(statusResponse.data, null, 2));

        // 5. Verifica dati nel database
        console.log('\n🔍 Verifica dati nel database...');
        
        // Clienti
        const clientiResponse = await axios.get(`${baseURL}/api/clienti`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`👥 Clienti trovati: ${clientiResponse.data.length}`);

        // Contratti luce
        const contrattiLuceResponse = await axios.get(`${baseURL}/api/contratti-luce`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`💡 Contratti luce trovati: ${contrattiLuceResponse.data.length}`);

        // Contratti gas
        const contrattiGasResponse = await axios.get(`${baseURL}/api/contratti-gas`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`🔥 Contratti gas trovati: ${contrattiGasResponse.data.length}`);

        // 6. Se ci sono clienti, mostra il primo
        if (clientiResponse.data.length > 0) {
            console.log('\n👤 Primo cliente importato:');
            console.log(JSON.stringify(clientiResponse.data[0], null, 2));
        }

        // 7. Se ci sono contratti luce, mostra il primo
        if (contrattiLuceResponse.data.length > 0) {
            console.log('\n💡 Primo contratto luce importato:');
            console.log(JSON.stringify(contrattiLuceResponse.data[0], null, 2));
        }

        console.log('\n✅ Test completato con successo!');

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('📄 Dettagli errore:', error.response.data);
        }
    }
}

testSimpleImport();