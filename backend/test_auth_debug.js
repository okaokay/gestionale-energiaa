const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

console.log('🔐 DEBUG AUTENTICAZIONE');
console.log('=======================\n');

async function debugAuth() {
    try {
        // 1. Test connessione server
        console.log('🌐 1. Test connessione server...');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                timeout: 5000,
                validateStatus: () => true // Accetta tutti i status code
            });
            console.log(`✅ Server risponde - Status: ${healthResponse.status}`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ Server non raggiungibile sulla porta 3001');
                return;
            }
            console.log('✅ Server raggiungibile');
        }

        // 2. Test login
        console.log('\n🔐 2. Test login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        console.log('✅ Login riuscito');
        console.log('📋 Risposta completa:', JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.token || loginResponse.data.data?.token;
        if (!token) {
            console.log('❌ Token non trovato nella risposta');
            return;
        }
        
        console.log(`🎫 Token ricevuto: ${token.substring(0, 50)}...`);

        // 3. Test immediato con token
        console.log('\n🔍 3. Test immediato endpoint /me...');
        try {
            const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Endpoint /me funziona');
            console.log('👤 Dati utente:', JSON.stringify(meResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Errore endpoint /me:', error.response?.data || error.message);
        }

        // 4. Test endpoint clienti
        console.log('\n👥 4. Test endpoint clienti...');
        try {
            const clientiResponse = await axios.get(`${BASE_URL}/api/clienti`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Endpoint clienti funziona');
            console.log(`📊 Numero clienti: ${clientiResponse.data.data?.length || clientiResponse.data.length || 'N/A'}`);
        } catch (error) {
            console.log('❌ Errore endpoint clienti:', error.response?.data || error.message);
            console.log('📄 Status:', error.response?.status);
            console.log('📄 Headers richiesta:', error.config?.headers);
        }

        // 5. Test con delay
        console.log('\n⏱️ 5. Test con delay di 1 secondo...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            const clientiResponse2 = await axios.get(`${BASE_URL}/api/clienti`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Endpoint clienti funziona dopo delay');
        } catch (error) {
            console.log('❌ Errore endpoint clienti dopo delay:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ Errore generale:', error.message);
        if (error.response) {
            console.error('📄 Status:', error.response.status);
            console.error('📄 Data:', error.response.data);
        }
    }
}

debugAuth();