const axios = require('axios');

async function testClientNamesFix() {
    try {
        console.log('🔐 Testing login...');
        
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');
        
        // Get clients
        console.log('\n📋 Testing clients endpoint...');
        const clientsResponse = await axios.get('http://localhost:3001/api/clienti?limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!clientsResponse.data.success) {
            throw new Error('Clients request failed');
        }
        
        const clients = clientsResponse.data.data.clienti;
        console.log(`📊 Total clients: ${clients.length}`);
        
        // Check for null null clients
        const nullClients = clients.filter(c => 
            (c.nome === null || c.nome === undefined) && 
            (c.cognome === null || c.cognome === undefined)
        );
        
        console.log(`\n🔍 Clients with null nome and cognome: ${nullClients.length}`);
        
        if (nullClients.length > 0) {
            console.log('❌ Still have null null clients:');
            nullClients.forEach((client, index) => {
                console.log(`   ${index + 1}. ID: ${client.id}, Type: ${client.tipo}, Nome: ${client.nome}, Cognome: ${client.cognome}, Ragione Sociale: ${client.ragione_sociale || 'N/A'}`);
            });
        } else {
            console.log('✅ No more null null clients found!');
        }
        
        // Show company clients specifically
        const companyClients = clients.filter(c => c.tipo === 'azienda');
        console.log(`\n🏢 Company clients: ${companyClients.length}`);
        companyClients.slice(0, 5).forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.nome || 'NULL'} ${client.cognome || 'NULL'} (${client.ragione_sociale || 'N/A'})`);
        });
        
        // Show private clients
        const privateClients = clients.filter(c => c.tipo === 'privato');
        console.log(`\n👤 Private clients: ${privateClients.length}`);
        privateClients.slice(0, 5).forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.nome || 'NULL'} ${client.cognome || 'NULL'}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testClientNamesFix();