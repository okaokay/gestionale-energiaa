const axios = require('axios');

console.log('🌐 TEST API CON AUTENTICAZIONE FRESCA');
console.log('====================================');

async function testAPI() {
    try {
        // Login con delay per evitare problemi di timing
        console.log('🔐 Login...');
        
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        console.log('✅ Login OK');
        console.log('Struttura risposta:', JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.data?.token;
        console.log('Token ricevuto:', token ? 'SI' : 'NO');
        
        // Piccolo delay prima della chiamata API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Test API clienti
        console.log('\n📋 Test API clienti...');
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: { 
                limit: 10
            }
        });
        
        const clienti = clientiResponse.data.data?.clienti || clientiResponse.data.data || clientiResponse.data;
        console.log(`✅ API OK - ${Array.isArray(clienti) ? clienti.length : 'Formato non array'} clienti ricevuti`);
        
        if (Array.isArray(clienti)) {
            // Mostra dettagli
            console.log('\n📊 CLIENTI DALL\'API:');
            clienti.forEach((cliente, index) => {
                console.log(`${index + 1}. ID: ${cliente.id}, Tipo: ${cliente.tipo}, Nome: ${cliente.nome || cliente.ragione_sociale}`);
            });
            
            // Verifica ID
            const senzaId = clienti.filter(c => !c.id);
            if (senzaId.length > 0) {
                console.log(`❌ ${senzaId.length} clienti senza ID`);
            } else {
                console.log('✅ Tutti i clienti hanno ID validi');
            }
        } else {
            console.log('⚠️ La risposta non è un array di clienti');
        }
        
        console.log('\n✅ TEST API COMPLETATO!');
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testAPI();