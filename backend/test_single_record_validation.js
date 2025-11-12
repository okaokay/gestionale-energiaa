const axios = require('axios');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        console.log('📋 Risposta login completa:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.data && response.data.data.token) {
            console.log('🔑 Token ricevuto: SI');
            return response.data.data.token;
        } else {
            console.log('🔑 Token ricevuto: NO');
            console.log('❌ Struttura risposta non valida');
            return null;
        }
    } catch (error) {
        console.error('❌ Errore login:', error.response?.data || error.message);
        throw error;
    }
}

async function testValidationEndpoint(token) {
    console.log('\n🔍 TEST ENDPOINT DI VALIDAZIONE');
    console.log('================================\n');

    // Test se l'endpoint esiste
    try {
        const response = await axios.get(`${BASE_URL}/api/unified-import/supported-types`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Endpoint unified-import accessibile');
        console.log('📋 Tipi supportati:', response.data);
    } catch (error) {
        console.log('❌ Endpoint unified-import non accessibile:', error.response?.status, error.response?.data?.message || error.message);
        return false;
    }

    return true;
}

async function testDirectValidation() {
    console.log('🧪 TEST VALIDAZIONE DIRETTA');
    console.log('============================\n');

    try {
        // 1. Login fresco
        console.log('🔐 Effettuo login...');
        const token = await login();
        console.log('✅ Login effettuato con successo\n');

        // 2. Test endpoint
        const endpointExists = await testValidationEndpoint(token);
        if (!endpointExists) {
            console.log('⚠️ L\'endpoint di validazione non esiste, testo direttamente l\'upload...\n');
            return await testDirectUpload(token);
        }

        // 3. Test validazione cliente privato
        console.log('👤 TEST VALIDAZIONE CLIENTE PRIVATO:');
        try {
            // Creo un CSV di test per un cliente privato
            const csvContent = `tipo,nome,cognome,codice_fiscale,email,telefono,indirizzo,citta,cap,provincia
cliente_privato,Mario,Rossi,RSSMRA80A01H501Z,mario.rossi@email.com,3331234567,Via Roma 123,Milano,20100,MI`;

            // Creo un FormData per inviare il file
            const FormData = require('form-data');
            const fs = require('fs');
            
            // Scrivo il CSV temporaneo
            const tempCsvPath = './temp_test_cliente.csv';
            fs.writeFileSync(tempCsvPath, csvContent);
            
            const formData = new FormData();
            formData.append('file', fs.createReadStream(tempCsvPath));

            const validateResponse = await axios.post(`${BASE_URL}/api/unified-import/validate`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders()
                }
            });

            console.log('✅ Validazione cliente privato riuscita:', validateResponse.data);
            
            // Pulisco il file temporaneo
            fs.unlinkSync(tempCsvPath);
        } catch (error) {
            console.log('❌ Errore validazione cliente privato:', error.response?.status, error.response?.data);
            // Pulisco il file temporaneo anche in caso di errore
            try {
                const fs = require('fs');
                fs.unlinkSync('./temp_test_cliente.csv');
            } catch (cleanupError) {
                // Ignoro errori di cleanup
            }
        }

    } catch (error) {
        console.error('❌ Errore generale nel test:', error.message);
    }
}

async function testDirectUpload(token) {
    console.log('📤 TEST UPLOAD DIRETTO PER ANALISI ERRORI');
    console.log('==========================================\n');

    const FormData = require('form-data');
    const fs = require('fs');

    try {
        // Crea un CSV di test con un solo record
        const testCsvContent = `tipo_record,modalita_import,nome,cognome,codice_fiscale,data_nascita,email_principale,telefono_mobile,via_residenza,civico_residenza,cap_residenza,citta_residenza,provincia_residenza,tipo_documento,numero_documento,ente_rilascio,data_scadenza_documento,iban,consenso_privacy,consenso_marketing,numero_contratto,pod,fornitore,data_attivazione,data_scadenza,prezzo_energia,stato_contratto,pdr,prezzo_gas
cliente_privato,update,Mario,Rossi,RSSMRA80A01H501Z,1980-01-01,mario.rossi@email.com,3331234567,Via Roma,10,00100,Roma,RM,Carta d'identità,AB1234567,Comune di Roma,2030-12-31,IT60X0542811101000000123456,true,true,,,,,,,,,,`;

        const testFilePath = path.join(__dirname, 'test_single_record.csv');
        fs.writeFileSync(testFilePath, testCsvContent);

        const form = new FormData();
        form.append('file', fs.createReadStream(testFilePath));
        form.append('skipValidation', 'false');
        form.append('dryRun', 'true'); // Solo validazione, non importazione

        const uploadResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log('📊 Risultato upload di test:');
        console.log(JSON.stringify(uploadResponse.data, null, 2));

        if (uploadResponse.data.success && uploadResponse.data.data?.importId) {
            const importId = uploadResponse.data.data.importId;
            console.log(`\n🔍 Controllo progresso importazione: ${importId}`);

            // Attendi un momento per l'elaborazione
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Nuovo login per sicurezza
            const freshToken = await login();

            try {
                const progressResponse = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, {
                    headers: { Authorization: `Bearer ${freshToken}` }
                });

                console.log('📈 Progresso importazione:');
                console.log(JSON.stringify(progressResponse.data, null, 2));
            } catch (error) {
                console.log('❌ Errore nel recupero progresso:', error.response?.status, error.response?.data || error.message);
            }
        }

        // Pulisci il file di test
        fs.unlinkSync(testFilePath);

    } catch (error) {
        console.error('❌ Errore nell\'upload di test:', error.response?.status, error.response?.data || error.message);
    }
}

// Esegui il test
testDirectValidation().then(() => {
    console.log('\n✅ Test completato');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test fallito:', error);
    process.exit(1);
});