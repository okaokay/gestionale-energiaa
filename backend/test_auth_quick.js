const axios = require('axios');

async function testAuth() {
    console.log('🔐 TEST AUTENTICAZIONE RAPIDO');
    console.log('=============================\n');

    const baseURL = 'http://localhost:3001';

    try {
        // Test diretto login

        // Test login
        console.log('🔐 Test login...');
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        }, { timeout: 10000 });

        console.log('✅ Login riuscito');
        console.log('📋 Risposta login:', JSON.stringify(loginResponse.data, null, 2));

        const token = loginResponse.data.token;
        
        // Test immediato con token
        console.log('\n🔍 Test immediato endpoint clienti...');
        const clientiResponse = await axios.get(`${baseURL}/api/clienti`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 5000
        });

        console.log('✅ Endpoint clienti accessibile');
        console.log(`👥 Numero clienti: ${clientiResponse.data.length}`);

        console.log('\n✅ Test autenticazione completato con successo!');

    } catch (error) {
        console.error('❌ Errore:', error.message);
        if (error.response) {
            console.error('📄 Status:', error.response.status);
            console.error('📄 Data:', error.response.data);
        }
        if (error.code) {
            console.error('📄 Code:', error.code);
        }
    }
}

testAuth();