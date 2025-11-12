const axios = require('axios');

async function checkImportProgress() {
    try {
        console.log('🔍 Verifica progresso importazione...\n');
        
        // 1. Login per ottenere il token
        console.log('🔐 Effettuo login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato con successo\n');
        
        // 2. Verifica il progresso dell'ultimo import
        const importId = 'ba0784d4-fbee-4ee7-adb6-c6bbde2ba9b2'; // ID dall'ultimo test
        
        console.log(`📊 Controllo progresso import ID: ${importId}`);
        
        const progressResponse = await axios.get(`http://localhost:3001/api/unified-import/progress/${importId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const progress = progressResponse.data;
        
        console.log('\n📊 PROGRESSO IMPORTAZIONE:');
        console.log('Status:', progressResponse.status);
        console.log('Response:', JSON.stringify(progress, null, 2));
        
        // 3. Verifica anche il risultato
        console.log('\n📋 Controllo anche il risultato...');
        
        try {
            const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('\n📊 RISULTATO IMPORTAZIONE:');
            console.log('Status:', resultResponse.status);
            console.log('Response:', JSON.stringify(resultResponse.data, null, 2));
            
        } catch (resultError) {
            console.log('\n⚠️  Risultato non ancora disponibile:', resultError.response?.data?.message || resultError.message);
        }
        
        // 4. Verifica tutti gli import recenti
        console.log('\n📋 Controllo tutti gli import recenti...');
        
        try {
            const allImportsResponse = await axios.get('http://localhost:3001/api/unified-import/history', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('\n📊 STORICO IMPORTAZIONI:');
            console.log('Status:', allImportsResponse.status);
            console.log('Response:', JSON.stringify(allImportsResponse.data, null, 2));
            
        } catch (historyError) {
            console.log('\n⚠️  Storico non disponibile:', historyError.response?.data?.message || historyError.message);
        }
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

checkImportProgress();