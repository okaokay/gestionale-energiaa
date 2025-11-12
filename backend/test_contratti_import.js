const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testContractImport() {
    try {
        console.log('🔐 Effettuando login...');
        
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login fallito');
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato con successo');
        
        const csvPath = path.join(__dirname, 'test_contratti.csv');
        console.log('📁 File CSV:', csvPath);
        
        if (!fs.existsSync(csvPath)) {
            console.log('❌ File CSV non trovato');
            return;
        }
        
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        console.log('📄 Contenuto CSV (prime 300 caratteri):');
        console.log(csvContent.substring(0, 300) + '...');
        
        const form = new FormData();
        form.append('file', fs.createReadStream(csvPath));
        form.append('dryRun', 'false');
        
        console.log('🔍 DEBUG - Parametri form data:');
        console.log('- dryRun: false (esplicitamente impostato)');
        
        console.log('🚀 Avvio import...');
        const response = await axios.post('http://localhost:3001/api/unified-import/upload', form, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
            },
            timeout: 30000
        });
        
        console.log('✅ Import avviato:', response.data);
        
        if (response.data.success && response.data.data.importId) {
            const importId = response.data.data.importId;
            console.log('📋 Import ID:', importId);
            
            // Attendi un po' per il completamento
            console.log('⏳ Attendo completamento import...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Controlla il risultato
            try {
                const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('📊 Risultato import:', JSON.stringify(resultResponse.data, null, 2));
            } catch (resultError) {
                console.log('⚠️ Errore nel recupero risultati:', resultError.response?.data || resultError.message);
                
                // Prova con l'endpoint generico
                try {
                    const genericResult = await axios.get('http://localhost:3001/api/unified-import/result', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    console.log('📊 Risultato generico:', JSON.stringify(genericResult.data, null, 2));
                } catch (genericError) {
                    console.log('⚠️ Anche l\'endpoint generico ha fallito:', genericError.response?.data || genericError.message);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('🔒 Problema di autenticazione');
        }
    }
}

testContractImport();