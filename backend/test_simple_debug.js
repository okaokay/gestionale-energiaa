const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testSimpleImport() {
    try {
        console.log('🔍 TEST SEMPLIFICATO IMPORTAZIONE');
        console.log('=================================');
        
        // 1. Login
        console.log('\n🔐 Login...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Login fallito:', loginData);
            return;
        }
        
        const token = loginData.data.token;
        console.log('✅ Login riuscito');
        
        // 2. Test con parametri più permissivi
        console.log('\n📤 Upload con parametri permissivi...');
        const fileBuffer = fs.readFileSync('./test_contratti_corretto.csv');
        
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: 'test_contratti_corretto.csv',
            contentType: 'text/csv'
        });
        
        // Parametri più permissivi
        formData.append('entityType', 'contratti');
        formData.append('autoDetectType', 'true');
        formData.append('skipValidation', 'true');  // Salta validazione
        formData.append('skipAssociation', 'true'); // Salta associazione
        formData.append('confidenceThreshold', '0.3'); // Soglia più bassa
        formData.append('dryRun', 'false');
        formData.append('batchSize', '10');
        
        console.log('📋 Parametri:');
        console.log('- skipValidation: true');
        console.log('- skipAssociation: true');
        console.log('- confidenceThreshold: 0.3');
        console.log('- batchSize: 10');
        
        const uploadResponse = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        console.log('\n📊 Upload response:', JSON.stringify(uploadData, null, 2));
        
        if (!uploadData.success) {
            console.log('❌ Upload fallito');
            return;
        }
        
        const importId = uploadData.data.importId;
        console.log(`\n✅ ImportId: ${importId}`);
        
        // 3. Attendi e controlla risultato
        console.log('\n⏳ Attendo 5 secondi...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const resultResponse = await fetch(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const resultData = await resultResponse.json();
        console.log('\n📊 Risultato finale:', JSON.stringify(resultData, null, 2));
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
    }
}

testSimpleImport();