const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

console.log('🔌 TEST API FRONTEND');
console.log('===================\n');

async function testFrontendAPIs() {
    try {
        // 1. Login per ottenere il token
        console.log('🔐 1. Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login riuscito, token ottenuto\n');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Test API clienti (unificata)
        console.log('👥 2. Test API clienti...');
        let clientiResponse;
        try {
            clientiResponse = await axios.get(`${BASE_URL}/api/clienti`, { headers });
            const clienti = clientiResponse.data.data || clientiResponse.data;
            console.log(`✅ Clienti recuperati: ${Array.isArray(clienti) ? clienti.length : 'N/A'}`);
            
            if (Array.isArray(clienti) && clienti.length > 0) {
                console.log('📋 Primi 3 clienti:');
                clienti.slice(0, 3).forEach((cliente, index) => {
                    const nome = cliente.tipo === 'privato' 
                        ? `${cliente.nome} ${cliente.cognome}` 
                        : cliente.ragione_sociale || 'N/A';
                    console.log(`   ${index + 1}. ${nome} (${cliente.tipo}) - ID: ${cliente.id}`);
                    console.log(`      CF/PIVA: ${cliente.codice_fiscale || cliente.partita_iva || 'N/A'}`);
                    console.log(`      Email: ${cliente.email || 'N/A'}`);
                    console.log(`      Contratti: ${cliente.contratti_luce || 0} luce, ${cliente.contratti_gas || 0} gas`);
                });
            }
        } catch (error) {
            console.error('❌ Errore API clienti:', error.response?.data || error.message);
        }

        // 3. Test API clienti solo privati
        console.log('\n👤 3. Test API clienti privati...');
        try {
            const clientiPrivatiResponse = await axios.get(`${BASE_URL}/api/clienti?tipo=privati`, { headers });
            const privati = clientiPrivatiResponse.data.data || clientiPrivatiResponse.data;
            console.log(`✅ Clienti privati: ${Array.isArray(privati) ? privati.length : 'N/A'}`);
        } catch (error) {
            console.error('❌ Errore API clienti privati:', error.response?.data || error.message);
        }

        // 4. Test API clienti solo aziende
        console.log('\n🏢 4. Test API clienti aziende...');
        try {
            const clientiAziendeResponse = await axios.get(`${BASE_URL}/api/clienti?tipo=aziende`, { headers });
            const aziende = clientiAziendeResponse.data.data || clientiAziendeResponse.data;
            console.log(`✅ Clienti aziende: ${Array.isArray(aziende) ? aziende.length : 'N/A'}`);
        } catch (error) {
            console.error('❌ Errore API clienti aziende:', error.response?.data || error.message);
        }

        // 5. Test API contratti per un cliente specifico
        if (clientiResponse && clientiResponse.data) {
            const clienti = clientiResponse.data.data || clientiResponse.data;
            if (Array.isArray(clienti) && clienti.length > 0) {
                const primoCliente = clienti[0];
                const nomeCliente = primoCliente.tipo === 'privato' 
                    ? `${primoCliente.nome} ${primoCliente.cognome}` 
                    : primoCliente.ragione_sociale;
                
                console.log(`\n💡 5. Test contratti per cliente ${nomeCliente}...`);
                 
                 try {
                     const contrattiResponse = await axios.get(`${BASE_URL}/api/contratti/cliente/${primoCliente.tipo}/${primoCliente.id}`, { headers });
                     const contratti = contrattiResponse.data.data || contrattiResponse.data;
                     console.log(`✅ Contratti totali trovati: ${Array.isArray(contratti) ? contratti.length : 'N/A'}`);
                     
                     if (Array.isArray(contratti) && contratti.length > 0) {
                         const contrattiLuce = contratti.filter(c => c.tipo_contratto === 'luce');
                         const contrattiGas = contratti.filter(c => c.tipo_contratto === 'gas');
                         
                         console.log(`   💡 Contratti LUCE: ${contrattiLuce.length}`);
                         contrattiLuce.forEach((contratto, index) => {
                             console.log(`      ${index + 1}. Contratto: ${contratto.numero_contratto || 'N/A'}`);
                             console.log(`         POD: ${contratto.pod || 'N/A'}`);
                             console.log(`         Fornitore: ${contratto.fornitore || 'N/A'}`);
                             console.log(`         Stato: ${contratto.stato || 'N/A'}`);
                         });
                         
                         console.log(`   🔥 Contratti GAS: ${contrattiGas.length}`);
                         contrattiGas.forEach((contratto, index) => {
                             console.log(`      ${index + 1}. Contratto: ${contratto.numero_contratto || 'N/A'}`);
                             console.log(`         PDR: ${contratto.pdr || 'N/A'}`);
                             console.log(`         Fornitore: ${contratto.fornitore || 'N/A'}`);
                             console.log(`         Stato: ${contratto.stato || 'N/A'}`);
                         });
                     }
                 } catch (error) {
                     console.error('❌ Errore API contratti:', error.response?.data || error.message);
                 }
            }
        }

        // 6. Test API generale clienti (se esiste)
        console.log('\n👥 6. Test API generale clienti...');
        try {
            const clientiResponse = await axios.get(`${BASE_URL}/api/clienti`, { headers });
            console.log(`✅ Clienti totali recuperati: ${clientiResponse.data.length}`);
        } catch (error) {
            console.log('ℹ️  API generale clienti non disponibile o non implementata');
        }

        console.log('\n✅ Test API frontend completato!');

    } catch (error) {
        console.error('❌ Errore generale:', error.response?.data || error.message);
    }
}

testFrontendAPIs();