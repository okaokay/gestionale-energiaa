const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testCascadeDelete() {
    try {
        console.log('🧪 TEST ELIMINAZIONE A CASCATA\n');
        
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data?.data?.token || loginResponse.data?.token;
        console.log('✅ Login OK, token ottenuto');
        
        // 2. Ottieni lista clienti con contratti
        console.log('\n📋 Recupero lista clienti...');
        const clientiResponse = await axios.get(`${BASE_URL}/api/clienti?limit=10`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clienti = clientiResponse.data?.data?.clienti || clientiResponse.data?.clienti || [];
        console.log(`📊 Trovati ${clienti.length} clienti`);
        
        // 3. Trova un cliente con contratti
        let clienteConContratti = null;
        for (const cliente of clienti) {
            if (cliente.contratti_luce > 0 || cliente.contratti_gas > 0) {
                clienteConContratti = cliente;
                break;
            }
        }
        
        if (!clienteConContratti) {
            console.log('❌ Nessun cliente con contratti trovato per il test');
            return;
        }
        
        console.log(`\n👤 Cliente selezionato per test eliminazione a cascata:`);
        console.log(`   ID: ${clienteConContratti.id}`);
        console.log(`   Nome: ${clienteConContratti.nome || clienteConContratti.ragione_sociale}`);
        console.log(`   Tipo: ${clienteConContratti.tipo}`);
        console.log(`   Contratti Luce: ${clienteConContratti.contratti_luce}`);
        console.log(`   Contratti Gas: ${clienteConContratti.contratti_gas}`);
        
        // 4. Conta i contratti prima dell'eliminazione
        console.log('\n📊 Conteggio contratti prima dell\'eliminazione...');
        const contrattiLuceResponse = await axios.get(`${BASE_URL}/api/contratti/luce`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const contrattiGasResponse = await axios.get(`${BASE_URL}/api/contratti/gas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const contrattiLucePrima = contrattiLuceResponse.data?.data?.length || 0;
        const contrattiGasPrima = contrattiGasResponse.data?.data?.length || 0;
        
        console.log(`   Contratti Luce totali: ${contrattiLucePrima}`);
        console.log(`   Contratti Gas totali: ${contrattiGasPrima}`);
        
        // 5. Elimina il cliente
        console.log(`\n🗑️ Eliminazione cliente...`);
        const tipo = clienteConContratti.tipo === 'privato' ? 'privati' : 'aziende';
        
        const deleteResponse = await axios.delete(`${BASE_URL}/api/clienti/${tipo}/${clienteConContratti.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Cliente eliminato con successo!');
        console.log('📊 Status:', deleteResponse.status);
        
        // 6. Conta i contratti dopo l'eliminazione
        console.log('\n📊 Conteggio contratti dopo l\'eliminazione...');
        const contrattiLuceDopoResponse = await axios.get(`${BASE_URL}/api/contratti/luce`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const contrattiGasDopoResponse = await axios.get(`${BASE_URL}/api/contratti/gas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const contrattiLuceDopo = contrattiLuceDopoResponse.data?.data?.length || 0;
        const contrattiGasDopo = contrattiGasDopoResponse.data?.data?.length || 0;
        
        console.log(`   Contratti Luce totali: ${contrattiLuceDopo}`);
        console.log(`   Contratti Gas totali: ${contrattiGasDopo}`);
        
        // 7. Verifica eliminazione a cascata
        const contrattiLuceEliminati = contrattiLucePrima - contrattiLuceDopo;
        const contrattiGasEliminati = contrattiGasPrima - contrattiGasDopo;
        
        console.log('\n🔍 Risultati eliminazione a cascata:');
        console.log(`   Contratti Luce eliminati: ${contrattiLuceEliminati}`);
        console.log(`   Contratti Gas eliminati: ${contrattiGasEliminati}`);
        
        if (contrattiLuceEliminati === clienteConContratti.contratti_luce && 
            contrattiGasEliminati === clienteConContratti.contratti_gas) {
            console.log('✅ Eliminazione a cascata funziona correttamente!');
        } else {
            console.log('⚠️ Possibile problema con l\'eliminazione a cascata');
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
    }
}

// Esegui il test
if (require.main === module) {
    testCascadeDelete()
        .then(() => {
            console.log('\n✅ Test completato!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Errore:', error.message);
            process.exit(1);
        });
}

module.exports = { testCascadeDelete };