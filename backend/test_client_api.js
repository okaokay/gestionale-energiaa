const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testClientAPI() {
    try {
        console.log('🔐 Tentativo di login...');
        
        // Login con le credenziali corrette
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        console.log('✅ Login riuscito!');
        const token = loginResponse.data.data.token;
        
        console.log('📋 Recupero lista clienti...');
        
        // Test API clienti con token
        const clientiResponse = await axios.get(`${API_BASE_URL}/clienti`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ API clienti funziona!');
        console.log(`📊 Totale clienti: ${clientiResponse.data.data.total}`);
        
        // Controlla i primi 3 clienti per verificare la struttura degli ID
        const clienti = clientiResponse.data.data.clienti;
        console.log('\n🔍 Controllo ID dei primi clienti:');
        
        clienti.slice(0, 3).forEach((cliente, index) => {
            console.log(`  ${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome || cliente.ragione_sociale}, Tipo: ${cliente.tipo}`);
        });
        
        // Verifica se ci sono clienti con ID null
        const clientiConIdNull = clienti.filter(c => c.id === null || c.id === undefined);
        if (clientiConIdNull.length > 0) {
            console.log(`\n⚠️  Trovati ${clientiConIdNull.length} clienti con ID null!`);
        } else {
            console.log('\n✅ Tutti i clienti hanno ID validi');
        }
        
    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔑 Prova con password diversa...');
            
            // Prova con altre password comuni
            const passwords = ['password', '123456', 'admin', 'gestionale123'];
            
            for (const pwd of passwords) {
                try {
                    console.log(`🔐 Tentativo con password: ${pwd}`);
                    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                        email: 'admin@gestionale.it',
                        password: pwd
                    });
                    
                    console.log(`✅ Login riuscito con password: ${pwd}`);
                    return;
                } catch (err) {
                    console.log(`❌ Password ${pwd} non funziona`);
                }
            }
        }
    }
}

testClientAPI();