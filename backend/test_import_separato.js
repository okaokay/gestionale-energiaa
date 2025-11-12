const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Funzione per il login
async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        return response.data.token;
    } catch (error) {
        console.error('❌ Errore durante il login:', error.response?.data || error.message);
        throw error;
    }
}

// Funzione per pulire il database
async function cleanDatabase(token) {
    try {
        console.log('🧹 Pulizia database...');
        await axios.delete(`${BASE_URL}/api/clienti/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Database pulito');
    } catch (error) {
        console.log('⚠️ Errore pulizia database (potrebbe essere normale):', error.response?.data?.message || error.message);
    }
}

// Funzione per importare un file CSV
async function importCsv(token, filePath, fileName) {
    try {
        console.log(`📤 Importazione ${fileName}...`);
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        
        const response = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log(`✅ Import ${fileName} avviato con ID:`, response.data.importId);
        return response.data.importId;
    } catch (error) {
        console.error(`❌ Errore import ${fileName}:`, error.response?.data || error.message);
        throw error;
    }
}

// Funzione per verificare lo stato dell'import
async function checkImportStatus(token, importId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(`${BASE_URL}/api/unified-import/status/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const status = response.data;
            console.log(`📊 Tentativo ${i + 1}: Stato = ${status.status}, Progresso = ${status.progress}%`);
            
            if (status.status === 'completed') {
                return status;
            } else if (status.status === 'failed') {
                throw new Error(`Import fallito: ${status.error}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`⏳ Import ${importId} non ancora disponibile, attendo...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Timeout: Import non completato entro il tempo limite');
}

// Funzione per ottenere i risultati dell'import
async function getImportResults(token, importId) {
    try {
        const response = await axios.get(`${BASE_URL}/api/unified-import/results/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Errore nel recupero risultati:', error.response?.data || error.message);
        return null;
    }
}

// Funzione per verificare i dati nel database
async function verifyDatabaseData(token) {
    try {
        console.log('🔍 Verifica dati nel database...');
        
        // Verifica clienti privati
        const clientiPrivati = await axios.get(`${BASE_URL}/api/clienti?tipo=privato`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`👥 Clienti privati trovati: ${clientiPrivati.data.length}`);
        
        // Verifica clienti azienda
        const clientiAzienda = await axios.get(`${BASE_URL}/api/clienti?tipo=azienda`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`🏢 Clienti azienda trovati: ${clientiAzienda.data.length}`);
        
        // Verifica contratti luce
        const contrattiLuce = await axios.get(`${BASE_URL}/api/contratti?tipo=luce`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`💡 Contratti luce trovati: ${contrattiLuce.data.length}`);
        
        // Verifica contratti gas
        const contrattiGas = await axios.get(`${BASE_URL}/api/contratti?tipo=gas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`🔥 Contratti gas trovati: ${contrattiGas.data.length}`);
        
        // Verifica offerte
        const offerte = await axios.get(`${BASE_URL}/api/offerte`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`💰 Offerte trovate: ${offerte.data.length}`);
        
        return {
            clientiPrivati: clientiPrivati.data,
            clientiAzienda: clientiAzienda.data,
            contrattiLuce: contrattiLuce.data,
            contrattiGas: contrattiGas.data,
            offerte: offerte.data
        };
    } catch (error) {
        console.error('❌ Errore verifica database:', error.response?.data || error.message);
        return null;
    }
}

// Funzione principale di test
async function runTest() {
    try {
        console.log('🚀 Avvio test import separato...\n');
        
        // Login
        const token = await login();
        console.log('✅ Login effettuato\n');
        
        // Lista dei file da testare
        const testFiles = [
            { path: './test_clienti_privati.csv', name: 'Clienti Privati' },
            { path: './test_clienti_azienda.csv', name: 'Clienti Azienda' },
            { path: './test_contratti_luce.csv', name: 'Contratti Luce' },
            { path: './test_contratti_gas.csv', name: 'Contratti Gas' },
            { path: './test_offerte.csv', name: 'Offerte' }
        ];
        
        for (const testFile of testFiles) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🧪 TEST: ${testFile.name}`);
            console.log(`${'='.repeat(50)}`);
            
            try {
                // Pulisci database prima di ogni test
                await cleanDatabase(token);
                
                // Importa il file
                const importId = await importCsv(token, testFile.path, testFile.name);
                
                // Attendi completamento
                const status = await checkImportStatus(token, importId);
                console.log(`✅ Import ${testFile.name} completato`);
                
                // Ottieni risultati dettagliati
                const results = await getImportResults(token, importId);
                if (results) {
                    console.log(`📊 Risultati ${testFile.name}:`);
                    console.log(`   - Righe processate: ${results.totalRows || 'N/A'}`);
                    console.log(`   - Righe inserite: ${results.insertedRows || 'N/A'}`);
                    console.log(`   - Errori: ${results.errors?.length || 0}`);
                    console.log(`   - Tipo rilevato: ${results.detectedType || 'N/A'}`);
                    console.log(`   - Confidenza: ${results.confidence || 'N/A'}%`);
                    
                    if (results.errors && results.errors.length > 0) {
                        console.log('❌ Errori dettagliati:');
                        results.errors.forEach((error, index) => {
                            console.log(`   ${index + 1}. ${error}`);
                        });
                    }
                }
                
                // Verifica dati nel database
                const dbData = await verifyDatabaseData(token);
                
                console.log(`✅ Test ${testFile.name} completato con successo`);
                
            } catch (error) {
                console.error(`❌ Test ${testFile.name} fallito:`, error.message);
            }
        }
        
        console.log('\n🎉 Test import separato completato!');
        
    } catch (error) {
        console.error('❌ Errore generale:', error.message);
        process.exit(1);
    }
}

// Avvia il test
runTest();