const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function testImport() {
    try {
        console.log('🧪 Test importazione CSV con dati corretti...\n');
        
        // 1. Login per ottenere il token
        console.log('🔐 Effettuo login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        console.log('Login response:', loginResponse.data);
        const token = loginResponse.data.data.token;
        
        if (!token) {
            throw new Error('Token non ricevuto dal login');
        }
        
        console.log('✅ Login effettuato con successo\n');
        
        // 2. Preparo il file per l'importazione
        const form = new FormData();
        form.append('file', fs.createReadStream('test_import_corretto.csv'));
        
        const response = await axios.post('http://localhost:3001/api/unified-import/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = response.data;
        
        console.log('📊 RISULTATO IMPORTAZIONE:');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ SUCCESSO!');
            console.log(`📈 Righe totali: ${result.totalRows}`);
            console.log(`✅ Inserimenti: ${result.successfulImports}`);
            console.log(`❌ Errori: ${result.failedImports}`);
            console.log(`⚠️  Incompleti: ${result.incompleteImports || 0}`);
            
            if (result.contractsCreated) {
                console.log(`🔌 Contratti luce creati: ${result.contractsCreated.luce || 0}`);
                console.log(`⛽ Contratti gas creati: ${result.contractsCreated.gas || 0}`);
            }
            
            if (result.errors && result.errors.length > 0) {
                console.log('\n❌ DETTAGLI ERRORI:');
                result.errors.forEach((error, index) => {
                    console.log(`Riga ${error.row}: ${error.message}`);
                });
            }
        } else {
            console.log('\n❌ ERRORE IMPORTAZIONE:');
            console.log(result.message || 'Errore sconosciuto');
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testImport();