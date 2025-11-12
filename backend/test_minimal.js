const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testMinimal() {
    try {
        console.log('🔐 Login...');
        
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login OK');
        
        const csvPath = path.join(__dirname, 'test_contratti.csv');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        formData.append('dryRun', 'false');
        
        console.log('📤 Upload file...');
        
        const uploadResponse = await axios.post('http://localhost:3001/api/unified-import/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Upload completato');
        console.log('📊 Risultato:', JSON.stringify(uploadResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
    }
}

testMinimal();