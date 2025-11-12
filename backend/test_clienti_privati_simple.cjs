const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testClientiPrivati() {
    try {
        console.log('🚀 Test import clienti privati...\n');
        
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
        
        // Import CSV clienti privati
        console.log('📤 Importazione clienti privati...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream('./test_clienti_privati.csv'));
        
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
                
                console.log('🔍 DEBUG - Risposta completa:', JSON.stringify(statusResponse.data, null, 2));
                
                if (statusResponse.data.success) {
                    const progress = statusResponse.data.data;
                    console.log(`📊 Progresso: ${progress.progress}% - ${progress.message}`);
                    
                    if (progress.stage === 'completed' || progress.stage === 'failed') {
                        completed = true;
                        
                        if (progress.stage === 'completed') {
                            console.log('✅ Import completato con successo!');
                            if (progress.errors > 0) {
                                console.log(`⚠️ Attenzione: ${progress.errors} errori durante l'import`);
                            }
                        } else {
                            console.log('❌ Import fallito:', progress.message);
                            throw new Error(`Import fallito: ${progress.message}`);
                        }
                    }
                } else {
                    console.log('⏳ Import non ancora disponibile...');
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`⏳ Import ${importId} non ancora disponibile...`);
                } else {
                    console.log('🔍 DEBUG - Errore:', error.response?.data || error.message);
                    throw error;
                }
            }
        }
        
        if (!completed) {
            throw new Error('Timeout: Import non completato');
        }

        // Ottieni i risultati dettagliati
        try {
            const resultResponse = await axios.get(`http://localhost:3000/api/unified-import/result/${importId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (resultResponse.data.success) {
                const result = resultResponse.data.data;
                console.log('\n📊 Risultati dettagliati:');
                console.log(`✅ Record inseriti: ${result.insertedRows}`);
                console.log(`❌ Record con errori: ${result.errorRows}`);
                console.log(`📝 Record totali processati: ${result.totalRows}`);
                
                if (result.errors && result.errors.length > 0) {
                    console.log('\n🔍 Errori trovati:');
                    result.errors.slice(0, 5).forEach((error, index) => {
                        console.log(`${index + 1}. Riga ${error.row}: ${error.message}`);
                    });
                    if (result.errors.length > 5) {
                        console.log(`... e altri ${result.errors.length - 5} errori`);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Impossibile ottenere i risultati dettagliati:', error.message);
        }
        
        // Verifica dati nel database
        console.log('\n🔍 Verifica dati nel database...');
        const clientiResponse = await axios.get(`${BASE_URL}/api/clienti?tipo=privato`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clienti = clientiResponse.data;
        console.log(`👥 Clienti privati trovati: ${clienti.length}`);
        
        if (clienti.length > 0) {
            console.log('📋 Dettagli clienti:');
            clienti.forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.nome} ${cliente.cognome} - ${cliente.codice_fiscale} - ${cliente.email_principale}`);
            });
        }

        console.log('\n🎉 Test completato!');

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        process.exit(1);
    }
}

testClientiPrivati();