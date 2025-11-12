const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🧪 Test finale del servizio di importazione...');

// Crea un CSV di test con un nuovo cliente
const csvContent = `tipo_record,nome,cognome,codice_fiscale,email_principale,telefono_mobile,numero_contratto,pod,pdr,fornitore,data_attivazione,prezzo_energia,prezzo_gas,stato
cliente_privato,Test,Cliente,TSTCLN90A01H501Z,test.cliente@email.com,3331111111,,,,,,,,
contratto_luce,,,,,LUCE-TEST-001,IT001E999888777,,,Enel Test,2024-01-01,0.15,,attivo
contratto_gas,,,,,GAS-TEST-001,,IT999888777666,Eni Test,2024-01-01,,0.90,attivo`;

const csvPath = path.join(__dirname, 'test_import_final.csv');
fs.writeFileSync(csvPath, csvContent);

async function testImport() {
    try {
        // 1. Login per ottenere il token
        console.log('🔐 1. Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login effettuato');
        
        // 2. Test import
        console.log('📤 2. Test import CSV...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        
        const importResponse = await axios.post('http://localhost:3001/api/unified-import/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Import completato');
        console.log('📊 Risultato:', JSON.stringify(importResponse.data, null, 2));
        
        // 3. Verifica che il cliente sia stato creato
        console.log('🔍 3. Verifica cliente creato...');
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti?search=Test Cliente', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clienti = clientiResponse.data.data.clienti || [];
        const testCliente = clienti.find(c => c.nome === 'Test' && c.cognome === 'Cliente');
        
        if (testCliente) {
            console.log('✅ Cliente Test Cliente trovato:');
            console.log(`   ID: ${testCliente.id}`);
            console.log(`   CF: ${testCliente.codice_fiscale}`);
            console.log(`   Email: ${testCliente.email_principale}`);
            
            // 4. Verifica contratti
            console.log('🔍 4. Verifica contratti...');
            const contrattiResponse = await axios.get(`http://localhost:3001/api/contratti/cliente/privato/${testCliente.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const contratti = contrattiResponse.data.data || [];
            console.log(`✅ Contratti trovati: ${contratti.length}`);
            
            contratti.forEach((contratto, index) => {
                console.log(`   ${index + 1}. ${contratto.commodity} - ${contratto.numero_contratto}`);
                console.log(`      Fornitore: ${contratto.fornitore}`);
                console.log(`      Stato: ${contratto.stato}`);
            });
            
        } else {
            console.log('❌ Cliente Test Cliente NON trovato');
        }
        
        // 5. Cleanup
        console.log('🧹 5. Cleanup...');
        if (testCliente) {
            try {
                await axios.delete(`http://localhost:3001/api/clienti/privato/${testCliente.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Cliente di test eliminato');
            } catch (error) {
                console.log('⚠️ Errore eliminazione cliente (normale se non supportata)');
            }
        }
        
        // Elimina file CSV di test
        fs.unlinkSync(csvPath);
        console.log('✅ File CSV di test eliminato');
        
        console.log('\n🎉 Test completato con successo!');
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
        
        // Cleanup in caso di errore
        if (fs.existsSync(csvPath)) {
            fs.unlinkSync(csvPath);
        }
    }
}

testImport();