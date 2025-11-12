const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testImport() {
    try {
        console.log('🔍 Avvio test import debug...');
        
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato');
        
        // Prepara il file
        const form = new FormData();
        form.append('file', fs.createReadStream('./test_contratti.csv'));
        form.append('dryRun', 'false');
        
        console.log('📤 Invio file per import...');
        
        // Avvia import
        const importResponse = await axios.post('http://localhost:3001/api/unified-import/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        
        const importId = importResponse.data.data.importId;
        console.log('🆔 Import ID:', importId);
        
        // Attendi completamento
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Ottieni risultato
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Risultato import:', JSON.stringify(resultResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
    }
}

testImport();