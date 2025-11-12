const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function debugClientiEndpoint() {
    try {
        console.log('🔍 DEBUG ENDPOINT CLIENTI\n');
        
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data?.data?.token || loginResponse.data?.token;
        console.log('✅ Login OK, token ottenuto');
        
        // 2. Test endpoint /api/clienti
        console.log('\n📋 Test endpoint /api/clienti...');
        try {
            const clientiResponse = await axios.get(`${BASE_URL}/api/clienti`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Risposta ricevuta');
            console.log('📊 Status:', clientiResponse.status);
            console.log('📦 Data structure:', typeof clientiResponse.data);
            console.log('📝 Response keys:', Object.keys(clientiResponse.data || {}));
            
            const data = clientiResponse.data?.data || clientiResponse.data;
            console.log('📋 Clienti data type:', typeof data);
            console.log('📋 Is array:', Array.isArray(data));
            console.log('📋 Length:', Array.isArray(data) ? data.length : 'N/A');
            
            if (Array.isArray(data) && data.length > 0) {
                console.log('👤 Primo cliente:', JSON.stringify(data[0], null, 2));
            }
            
        } catch (error) {
            console.error('❌ Errore endpoint /api/clienti:', error.response?.data || error.message);
        }
        
        // 3. Test endpoint specifici per clienti privati e azienda
        console.log('\n📋 Test endpoint /api/clienti-privati...');
        try {
            const privatiResponse = await axios.get(`${BASE_URL}/api/clienti-privati`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const privatiData = privatiResponse.data?.data || privatiResponse.data;
            console.log('👤 Clienti privati:', Array.isArray(privatiData) ? privatiData.length : 'N/A');
            
        } catch (error) {
            console.error('❌ Errore endpoint clienti-privati:', error.response?.status, error.response?.data?.message || error.message);
        }
        
        console.log('\n📋 Test endpoint /api/clienti-azienda...');
        try {
            const aziendaResponse = await axios.get(`${BASE_URL}/api/clienti-azienda`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const aziendaData = aziendaResponse.data?.data || aziendaResponse.data;
            console.log('🏢 Clienti azienda:', Array.isArray(aziendaData) ? aziendaData.length : 'N/A');
            
        } catch (error) {
            console.error('❌ Errore endpoint clienti-azienda:', error.response?.status, error.response?.data?.message || error.message);
        }
        
        // 4. Query diretta al database
        console.log('\n🗃️  Query diretta database...');
        const { pool } = require('./backend/config/database.cjs');
        
        const privatiCount = await pool.query('SELECT COUNT(*) as count FROM clienti_privati');
        const aziendaCount = await pool.query('SELECT COUNT(*) as count FROM clienti_azienda');
        
        console.log('👤 Clienti privati (DB):', privatiCount.rows[0].count);
        console.log('🏢 Clienti azienda (DB):', aziendaCount.rows[0].count);
        console.log('📊 Totale (DB):', parseInt(privatiCount.rows[0].count) + parseInt(aziendaCount.rows[0].count));
        
    } catch (error) {
        console.error('❌ Errore generale:', error.message);
    }
}

// Esegui il debug
if (require.main === module) {
    debugClientiEndpoint()
        .then(() => {
            console.log('\n✅ Debug completato!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Errore:', error.message);
            process.exit(1);
        });
}

module.exports = { debugClientiEndpoint };