const axios = require('axios');

async function simpleTest() {
    try {
        console.log('🧪 TEST SEMPLICE');
        
        // Test login
        console.log('🔐 Test login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        if (loginResponse.data.success) {
            console.log('✅ Login OK');
            const token = loginResponse.data.data.token;
            
            // Test endpoint supportati
            console.log('📋 Test tipi supportati...');
            const typesResponse = await axios.get('http://localhost:3001/api/unified-import/supported-types', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Tipi supportati:', typesResponse.data);
            
        } else {
            console.log('❌ Login fallito');
        }
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
        if (error.response) {
            console.error('📄 Response data:', error.response.data);
        }
    }
}

simpleTest();