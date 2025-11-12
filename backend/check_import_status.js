const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const IMPORT_ID = '169d0381-9fa5-4296-9360-e4055801d225';

async function checkImportStatus() {
    try {
        console.log('🔐 EFFETTUO LOGIN...');
        
        // 1. Login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato con successo\n');

        // 2. Controllo stato import
        console.log('📊 CONTROLLO STATO IMPORT:', IMPORT_ID);
        console.log('================================\n');
        
        try {
            const statusResponse = await axios.get(`${BASE_URL}/api/unified-import/status/${IMPORT_ID}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('📈 STATO IMPORT:');
            console.log(JSON.stringify(statusResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Errore nel controllo stato:', error.response?.status, error.response?.data);
        }

        // 3. Controllo logs import
        try {
            const logsResponse = await axios.get(`${BASE_URL}/api/unified-import/logs/${IMPORT_ID}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('\n📋 LOGS IMPORT:');
            console.log(JSON.stringify(logsResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Errore nel recupero logs:', error.response?.status, error.response?.data);
        }

        // 4. Verifica dati nel database
        console.log('\n🔍 VERIFICA DATI NEL DATABASE:');
        console.log('================================\n');
        
        try {
            const clientiResponse = await axios.get(`${BASE_URL}/api/clienti`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('👥 Clienti totali:', clientiResponse.data.data?.length || 0);
            
            if (clientiResponse.data.data && clientiResponse.data.data.length > 0) {
                console.log('\n📋 Clienti nel database:');
                clientiResponse.data.data.forEach((cliente, index) => {
                    console.log(`${index + 1}. ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale}) - ID: ${cliente.id}`);
                });
            }
        } catch (error) {
            console.log('❌ Errore nel recupero clienti:', error.response?.data || error.message);
        }

    } catch (error) {
        console.log('❌ Errore durante il controllo:', error.response?.status, error.response?.data || error.message);
    }
}

checkImportStatus();