const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testSimple() {
    console.log('🚀 Test semplice...');
    
    try {
        // Test login
        console.log('🔐 Test login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.data?.token || loginResponse.data.token;
        console.log('Token ottenuto:', !!token);
        
        if (!token) {
            throw new Error('Token non ottenuto');
        }
        
        // Test file CSV
        console.log('📄 Test lettura CSV...');
        const csvPath = './import_10_clienti_completi_super_import.csv';
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File non trovato: ${csvPath}`);
        }
        
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        console.log(`CSV letto: ${csvContent.length} caratteri`);
        console.log('Prime 200 caratteri:', csvContent.substring(0, 200));
        
        // Test import
        console.log('📤 Test import...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        formData.append('dryRun', 'false');
        
        const importResponse = await axios.post(
            'http://localhost:3001/api/unified-import/upload',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders()
                }
            }
        );
        
        console.log('Import response:', JSON.stringify(importResponse.data, null, 2));
        
        const importId = importResponse.data.data?.importId;
        console.log('Import ID:', importId);
        
        if (importId) {
            // Attendi e ottieni risultato
            console.log('⏳ Attendo 3 secondi...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('📊 Recupero risultato...');
            const resultResponse = await axios.get(
                `http://localhost:3001/api/unified-import/result/${importId}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            
            console.log('Risultato:', JSON.stringify(resultResponse.data, null, 2));
        }
        
        console.log('✅ Test completato!');
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testSimple();