const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testClientiAzienda() {
    try {
        console.log('🚀 Test import clienti azienda...\n');
        
        // Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato');
        console.log('🔑 Token ricevuto:', token ? token.substring(0, 50) + '...' : 'UNDEFINED');
        console.log('');
        
        // Import CSV clienti azienda
        console.log('📤 Importazione clienti azienda...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream('./test_clienti_azienda.csv'));
        
        const importResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        
        const importId = importResponse.data.data.importId;
        console.log(`✅ Import avviato con ID: ${importId}\n`);
        
        // Attendi completamento
        console.log('⏳ Attesa completamento import...');
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!completed && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                const statusResponse = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const progress = statusResponse.data.data;
                console.log(`📊 Progresso: ${progress.progress}% - ${progress.status}`);
                
                if (progress.status === 'completed' || progress.status === 'failed') {
                    completed = true;
                    console.log(`\n🎯 Import ${progress.status}!`);
                    console.log(`📈 Record inseriti: ${progress.recordsInserted || 0}`);
                    console.log(`❌ Errori: ${progress.errors || 0}`);
                    
                    if (progress.errors > 0) {
                        console.log('\n🔍 Dettagli errori:');
                        console.log(JSON.stringify(progress.errorDetails, null, 2));
                    }
                }
            } catch (statusError) {
                console.log(`⚠️ Errore nel controllo stato (tentativo ${attempts}):`, statusError.message);
            }
        }
        
        if (!completed) {
            console.log('⏰ Timeout raggiunto, import potrebbe essere ancora in corso');
        }
        
        // Verifica risultati
        console.log('\n🔍 Verifica clienti azienda inseriti...');
        try {
            const clientiResponse = await axios.get(`${BASE_URL}/api/clienti?tipo=azienda`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const clientiAzienda = clientiResponse.data.data;
            console.log(`📊 Clienti azienda trovati nel database: ${clientiAzienda ? clientiAzienda.length : 'undefined'}`);
            
            if (clientiAzienda && clientiAzienda.length > 0) {
                console.log('\n📋 Primi 3 clienti azienda:');
                clientiAzienda.slice(0, 3).forEach((cliente, index) => {
                    console.log(`${index + 1}. ${cliente.ragione_sociale} - P.IVA: ${cliente.partita_iva}`);
                });
            }
        } catch (error) {
            console.log('❌ Errore nel recupero clienti azienda:', error.message);
        }
        
        // Ottieni risultati dettagliati
        console.log('\n📄 Recupero risultati dettagliati...');
        try {
            const resultResponse = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Risultati dettagliati ottenuti');
            console.log(JSON.stringify(resultResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Errore nel recupero risultati dettagliati:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('📄 Dettagli errore:', error.response.data);
        }
    }
}

// Esegui il test
testClientiAzienda();