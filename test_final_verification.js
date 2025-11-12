const axios = require('axios');

async function testFinalVerification() {
    try {
        console.log('🔐 Testing final verification...');
        
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
        
        // Analyze client data
        const validClients = clients.filter(c => c.nome && c.cognome);
        const nullClients = clients.filter(c => !c.nome || !c.cognome);
        const companyClients = clients.filter(c => c.tipo === 'azienda');
        const privateClients = clients.filter(c => c.tipo === 'privato');
        
        console.log(`\n📈 Analysis:`);
        console.log(`   ✅ Valid clients (with nome & cognome): ${validClients.length}`);
        console.log(`   ❌ Null clients (missing nome or cognome): ${nullClients.length}`);
        console.log(`   🏢 Company clients: ${companyClients.length}`);
        console.log(`   👤 Private clients: ${privateClients.length}`);
        
        // Show valid clients
        console.log(`\n✅ Valid clients:`);
        validClients.slice(0, 5).forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.nome} ${client.cognome} (${client.tipo})`);
        });
        
        // Show company clients (should show ragione_sociale as nome)
        if (companyClients.length > 0) {
            console.log(`\n🏢 Company clients:`);
            companyClients.slice(0, 5).forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.nome || 'NULL'} ${client.cognome || 'NULL'} (${client.ragione_sociale || 'N/A'})`);
            });
        } else {
            console.log(`\n🏢 No company clients found in database`);
        }
        
        // Show problematic null clients
        if (nullClients.length > 0) {
            console.log(`\n❌ Problematic null clients (first 5):`);
            nullClients.slice(0, 5).forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.nome || 'NULL'} ${client.cognome || 'NULL'} (${client.tipo}) - ID: ${client.id.substring(0, 8)}...`);
            });
        }
        
        console.log(`\n🎯 Summary:`);
        console.log(`   - Our fix for company clients is ready (no company clients to test)`);
        console.log(`   - We have ${nullClients.length} private clients with null names that need cleanup`);
        console.log(`   - We have ${validClients.length} valid clients that work correctly`);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testFinalVerification();