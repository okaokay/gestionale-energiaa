const fetch = require('node-fetch');

async function checkResult() {
    try {
        console.log('🔐 Login...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.data.token;
        console.log('✅ Login OK');
        
        // Usa l'importId dell'ultimo test
        const importId = '3bfb5ef7-75d9-42c3-b6f8-9d432c056a37';
        
        console.log(`📊 Controllo risultato per importId: ${importId}`);
        
        const resultResponse = await fetch(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const resultData = await resultResponse.json();
        console.log('\n📊 RISULTATO COMPLETO:');
        console.log(JSON.stringify(resultData, null, 2));
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
    }
}

checkResult();