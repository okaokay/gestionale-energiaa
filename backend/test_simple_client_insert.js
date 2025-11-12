const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function testSimpleClientInsert() {
    console.log('🔍 Test Inserimento Cliente Semplice');
    console.log('===================================\n');

    try {
        // 1. Login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato\n');

        // 2. Test con un singolo record cliente molto semplice
        console.log('📝 Test con singolo record cliente...');
        const singleClientCSV = `tipo_record,nome,cognome,codice_fiscale,email_principale
cliente_privato,Mario,Rossi,RSSMRA80A01H501Z,mario.rossi@test.com`;

        // Salva il CSV temporaneo
        const tempCsvPath = path.join(__dirname, 'temp_simple_client.csv');
        fs.writeFileSync(tempCsvPath, singleClientCSV);

        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempCsvPath));
        formData.append('autoDetectType', 'true');
        formData.append('skipValidation', 'false');
        formData.append('skipAssociation', 'false');
        formData.append('dryRun', 'false');

        const importResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            },
            timeout: 30000
        });

        const importId = importResponse.data.data.importId;
        console.log(`✅ Import avviato con ID: ${importId}`);

        // 3. Attendi completamento
        console.log('\n⏳ Attendo completamento...');
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30;

        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const status = statusResponse.data.data;
            if (status.stage === 'completed' || status.stage === 'failed') {
                completed = true;
            }
            attempts++;
        }

        // 4. Ottieni risultati dettagliati
        const resultResponse = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = resultResponse.data.data;
        
        console.log('\n📊 RISULTATO DETTAGLIATO:');
        console.log('========================');
        console.log('Successo:', result.success);
        console.log('File:', result.fileName);
        console.log('Righe totali:', result.totalRows);
        console.log('Righe processate:', result.processedRows);
        console.log('Righe inserite:', result.insertedRows);
        console.log('Righe saltate:', result.skippedRows);
        console.log('Righe con errori:', result.errorRows);

        // 5. Mostra errori se presenti
        if (result.errors && result.errors.length > 0) {
            console.log('\n❌ ERRORI TROVATI:');
            console.log('==================');
            result.errors.forEach((error, index) => {
                console.log(`${index + 1}. Riga ${error.row}: ${error.message}`);
                if (error.details) {
                    console.log('   Dettagli:', JSON.stringify(error.details, null, 2));
                }
            });
        }

        // 6. Mostra record processati
        if (result.parsedRecords && result.parsedRecords.length > 0) {
            console.log('\n📋 RECORD PROCESSATI:');
            console.log('=====================');
            result.parsedRecords.forEach((record, index) => {
                console.log(`Record ${index + 1}:`, JSON.stringify(record, null, 2));
            });
        }

        // 7. Verifica nel database
        console.log('\n🔍 Verifica database...');
        const clientsResponse = await axios.get(`${BASE_URL}/api/clienti`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Gestisci la struttura della risposta API
        let clients = [];
        if (clientsResponse.data.data && clientsResponse.data.data.clienti && Array.isArray(clientsResponse.data.data.clienti)) {
            clients = clientsResponse.data.data.clienti;
        } else if (Array.isArray(clientsResponse.data)) {
            clients = clientsResponse.data;
        } else if (clientsResponse.data.data && Array.isArray(clientsResponse.data.data)) {
            clients = clientsResponse.data.data;
        }
        
        console.log('📋 Clienti trovati:', clients.length);
        const foundClient = clients.find(c => c.nome === 'Mario' && c.cognome === 'Rossi');
        
        if (foundClient) {
            console.log('✅ Cliente trovato nel database:', foundClient);
        } else {
            console.log('❌ Cliente NON trovato nel database');
            console.log('Clienti presenti:', clients.length);
        }

        // Cleanup
        fs.unlinkSync(tempCsvPath);
        console.log('\n✅ Test completato!');

    } catch (error) {
        console.error('\n❌ Errore durante il test:', error.message);
        console.error('Stack trace:', error.stack);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

testSimpleClientInsert();