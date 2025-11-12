const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testDeleteClient() {
    try {
        console.log('🧪 TEST ELIMINAZIONE CLIENTE\n');
        
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data?.data?.token || loginResponse.data?.token;
        console.log('✅ Login OK, token ottenuto');
        
        // 2. Ottieni lista clienti per trovare un ID da testare
        console.log('\n📋 Recupero lista clienti...');
        const clientiResponse = await axios.get(`${BASE_URL}/api/clienti?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clienti = clientiResponse.data?.data?.clienti || clientiResponse.data?.clienti || [];
        console.log(`📊 Trovati ${clienti.length} clienti`);
        
        if (clienti.length === 0) {
            console.log('❌ Nessun cliente trovato per il test');
            return;
        }
        
        // 3. Prendi il primo cliente per il test
        const clienteTest = clienti[0];
        console.log(`\n👤 Cliente selezionato per test eliminazione:`);
        console.log(`   ID: ${clienteTest.id}`);
        console.log(`   Nome: ${clienteTest.nome || clienteTest.ragione_sociale}`);
        console.log(`   Tipo: ${clienteTest.tipo}`);
        
        // 4. Test eliminazione
        console.log(`\n🗑️ Test eliminazione cliente...`);
        const tipo = clienteTest.tipo === 'privato' ? 'privati' : 'aziende';
        
        try {
            const deleteResponse = await axios.delete(`${BASE_URL}/api/clienti/${tipo}/${clienteTest.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Eliminazione completata con successo!');
            console.log('📊 Status:', deleteResponse.status);
            console.log('📝 Response:', deleteResponse.data);
            
            // 5. Verifica che il cliente sia stato eliminato
            console.log('\n🔍 Verifica eliminazione...');
            try {
                const verifyResponse = await axios.get(`${BASE_URL}/api/clienti/${tipo}/${clienteTest.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('❌ ERRORE: Il cliente esiste ancora dopo l\'eliminazione');
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log('✅ Confermato: Cliente eliminato correttamente (404 Not Found)');
                } else {
                    console.log('⚠️ Errore inaspettato durante la verifica:', error.response?.status);
                }
            }
            
        } catch (error) {
            console.error('❌ Errore durante eliminazione:', error.response?.status, error.response?.data?.message || error.message);
            
            if (error.response?.status === 400) {
                console.log('🔍 Dettagli errore 400:', error.response.data);
            }
        }
        
    } catch (error) {
        console.error('❌ Errore generale:', error.message);
    }
}

// Esegui il test
if (require.main === module) {
    testDeleteClient()
        .then(() => {
            console.log('\n✅ Test completato!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Errore:', error.message);
            process.exit(1);
        });
}

module.exports = { testDeleteClient };