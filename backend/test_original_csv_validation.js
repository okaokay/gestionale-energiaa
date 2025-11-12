const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testOriginalCsvValidation() {
    try {
        console.log('🔐 EFFETTUO LOGIN...');
        
        // 1. Login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('🔑 Token ricevuto:', token ? 'SI' : 'NO');
        console.log('✅ Login effettuato con successo\n');

        // 2. Test validazione del file CSV originale
        console.log('📄 TEST VALIDAZIONE FILE CSV ORIGINALE:');
        console.log('================================\n');
        
        const csvFilePath = '../import_10_clienti_completi_super_import.csv';
        
        if (!fs.existsSync(csvFilePath)) {
            console.log('❌ File CSV non trovato:', csvFilePath);
            return;
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));

        const validateResponse = await axios.post(`${BASE_URL}/api/unified-import/validate`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        console.log('📊 RISULTATO VALIDAZIONE:');
        console.log('Valid:', validateResponse.data.data.valid);
        console.log('Errori:', validateResponse.data.data.errors.length);
        console.log('Warning:', validateResponse.data.data.warnings.length);
        
        if (validateResponse.data.data.errors.length > 0) {
            console.log('\n❌ ERRORI TROVATI:');
            validateResponse.data.data.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        if (validateResponse.data.data.warnings.length > 0) {
            console.log('\n⚠️ WARNING TROVATI:');
            validateResponse.data.data.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }
        
        if (validateResponse.data.data.sampleData && validateResponse.data.data.sampleData.length > 0) {
            console.log('\n📋 SAMPLE DATA (primi 3 record):');
            validateResponse.data.data.sampleData.slice(0, 3).forEach((record, index) => {
                console.log(`Record ${index + 1}:`, JSON.stringify(record, null, 2));
            });
        }

    } catch (error) {
        console.log('❌ Errore durante il test:', error.response?.status, error.response?.data || error.message);
    }
}

testOriginalCsvValidation();