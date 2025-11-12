const axios = require('axios');

async function getImportResult() {
    try {
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login OK');

        // Recupera risultato
        const importId = '34a6229f-7f75-4a08-b044-c4f50302c025';
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('📋 RISULTATO IMPORT:');
        console.log(JSON.stringify(resultResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
    }
}

getImportResult();