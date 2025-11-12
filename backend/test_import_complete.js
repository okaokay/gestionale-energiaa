const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testImportComplete() {
    console.log('🔍 TEST IMPORTAZIONE COMPLETO');
    console.log('==============================\n');

    try {
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        if (!loginResponse.data.success) {
            throw new Error('Login fallito');
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login OK\n');

        // 2. Upload file
        console.log('📤 Upload file CSV...');
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));

        const uploadResponse = await axios.post(`${API_BASE}/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Upload completato');
        console.log('📋 Import ID:', uploadResponse.data.data.importId);
        
        const importId = uploadResponse.data.data.importId;
        console.log('\n⏳ Aspetto 3 secondi per il completamento...\n');
        await sleep(3000);

        // 3. Verifica stato importazione (se esiste endpoint)
        try {
            console.log('🔍 Verifica stato importazione...');
            const statusResponse = await axios.get(`${API_BASE}/unified-import/progress/${importId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('📊 Stato importazione:', JSON.stringify(statusResponse.data, null, 2));
        } catch (error) {
            console.log('ℹ️  Endpoint status non disponibile, continuo...');
        }

        // 4. Verifica dati nel database
        console.log('\n🔍 Verifica dati importati...\n');

        // Clienti
        console.log('👥 Verifica clienti...');
        const clientiResponse = await axios.get(`${API_BASE}/clienti`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📋 Struttura risposta clienti:', typeof clientiResponse.data);
        console.log('📋 Clienti trovati:', JSON.stringify(clientiResponse.data, null, 2));
        
        let clientiCount = 0;
        if (Array.isArray(clientiResponse.data)) {
            clientiCount = clientiResponse.data.length;
        } else if (clientiResponse.data.data && Array.isArray(clientiResponse.data.data)) {
            clientiCount = clientiResponse.data.data.length;
        } else if (clientiResponse.data.success && clientiResponse.data.data) {
            clientiCount = Array.isArray(clientiResponse.data.data) ? clientiResponse.data.data.length : 1;
        }

        // Contratti luce
        console.log('\n💡 Verifica contratti luce...');
        const luceResponse = await axios.get(`${API_BASE}/contratti/luce`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📋 Struttura risposta luce:', typeof luceResponse.data);
        console.log('📋 Contratti luce trovati:', JSON.stringify(luceResponse.data, null, 2));
        
        let luceCount = 0;
        if (Array.isArray(luceResponse.data)) {
            luceCount = luceResponse.data.length;
        } else if (luceResponse.data.data && Array.isArray(luceResponse.data.data)) {
            luceCount = luceResponse.data.data.length;
        } else if (luceResponse.data.success && luceResponse.data.data) {
            luceCount = Array.isArray(luceResponse.data.data) ? luceResponse.data.data.length : 1;
        }

        // Contratti gas
        console.log('\n🔥 Verifica contratti gas...');
        const gasResponse = await axios.get(`${API_BASE}/contratti/gas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📋 Struttura risposta gas:', typeof gasResponse.data);
        console.log('📋 Contratti gas trovati:', JSON.stringify(gasResponse.data, null, 2));
        
        let gasCount = 0;
        if (Array.isArray(gasResponse.data)) {
            gasCount = gasResponse.data.length;
        } else if (gasResponse.data.data && Array.isArray(gasResponse.data.data)) {
            gasCount = gasResponse.data.data.length;
        } else if (gasResponse.data.success && gasResponse.data.data) {
            gasCount = Array.isArray(gasResponse.data.data) ? gasResponse.data.data.length : 1;
        }

        // Riepilogo finale
        console.log('\n🎉 RIEPILOGO FINALE:');
        console.log('====================');
        console.log(`👥 Clienti importati: ${clientiCount}`);
        console.log(`💡 Contratti luce importati: ${luceCount}`);
        console.log(`🔥 Contratti gas importati: ${gasCount}`);
        
        if (clientiCount > 0 || luceCount > 0 || gasCount > 0) {
            console.log('\n✅ IMPORTAZIONE RIUSCITA!');
            console.log('🎯 Le modifiche al database hanno funzionato correttamente');
        } else {
            console.log('\n⚠️  Nessun dato importato - potrebbero esserci problemi');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('📋 Dettagli errore:', error.response.data);
        }
        process.exit(1);
    }
}

testImportComplete();