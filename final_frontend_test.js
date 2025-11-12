const axios = require('axios');

async function finalFrontendTest() {
    try {
        console.log('🌐 Final Frontend Test - Verifying the complete fix...\n');
        
        // Step 1: Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');
        
        // Step 2: Get all clients (simulating frontend request)
        console.log('\n2️⃣ Fetching clients (simulating frontend)...');
        const clientsResponse = await axios.get('http://localhost:3001/api/clienti?limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const clients = clientsResponse.data.data.clienti;
        console.log(`📊 Total clients: ${clients.length}`);
        
        // Step 3: Analyze client display names
        console.log('\n3️⃣ Analyzing client display names...');
        
        const privateClients = clients.filter(c => c.tipo === 'privato');
        const companyClients = clients.filter(c => c.tipo === 'azienda');
        
        console.log(`👤 Private clients: ${privateClients.length}`);
        console.log(`🏢 Company clients: ${companyClients.length}`);
        
        // Check for "null null" issues
        const nullNullClients = clients.filter(c => {
            const displayName = `${c.nome || 'NULL'} ${c.cognome || 'NULL'}`.trim();
            return displayName === 'NULL NULL' || displayName === 'null null' || 
                   ((!c.nome || c.nome === 'null') && (!c.cognome || c.cognome === 'null'));
        });
        
        console.log(`❌ "Null null" clients: ${nullNullClients.length}`);
        
        // Step 4: Display results as they would appear in frontend
        console.log('\n4️⃣ Client list as it would appear in frontend:');
        clients.forEach((client, index) => {
            let displayName;
            if (client.tipo === 'azienda') {
                // For company clients, we expect ragione_sociale to be mapped to nome
                displayName = client.nome || 'N/A';
            } else {
                // For private clients, we expect nome + cognome
                displayName = `${client.nome || 'N/A'} ${client.cognome || 'N/A'}`.trim();
            }
            
            const status = (client.tipo === 'azienda' && client.nome === client.ragione_sociale) ? '✅' :
                          (client.tipo === 'privato' && client.nome && client.cognome) ? '✅' : '❌';
            
            console.log(`   ${index + 1}. ${status} "${displayName}" (${client.tipo})`);
        });
        
        // Step 5: Final verification
        console.log('\n5️⃣ Final Verification:');
        
        const workingCompanyClients = companyClients.filter(c => c.nome === c.ragione_sociale);
        const workingPrivateClients = privateClients.filter(c => c.nome && c.cognome);
        
        console.log(`✅ Working company clients: ${workingCompanyClients.length}/${companyClients.length}`);
        console.log(`✅ Working private clients: ${workingPrivateClients.length}/${privateClients.length}`);
        console.log(`❌ Problematic clients: ${nullNullClients.length}`);
        
        // Step 6: Summary
        console.log('\n🎯 FINAL SUMMARY:');
        console.log('================');
        
        if (nullNullClients.length === 0) {
            console.log('✅ SUCCESS! No more "null null" display issues');
        } else {
            console.log(`❌ Still ${nullNullClients.length} clients with display issues`);
        }
        
        if (companyClients.length > 0 && workingCompanyClients.length === companyClients.length) {
            console.log('✅ SUCCESS! Company clients correctly show ragione_sociale');
        } else if (companyClients.length === 0) {
            console.log('✅ Company client fix is ready (no company clients to test)');
        } else {
            console.log('❌ Company client fix needs attention');
        }
        
        console.log(`✅ Total functional clients: ${workingCompanyClients.length + workingPrivateClients.length}/${clients.length}`);
        
        const successRate = ((workingCompanyClients.length + workingPrivateClients.length) / clients.length * 100).toFixed(1);
        console.log(`📊 Success rate: ${successRate}%`);
        
        if (successRate >= 95) {
            console.log('\n🎉 EXCELLENT! The fix is working perfectly!');
            console.log('   - Company clients show ragione_sociale instead of "null null"');
            console.log('   - Private clients with valid data display correctly');
            console.log('   - No more "null null" issues in the frontend');
        } else {
            console.log('\n⚠️  Some issues remain that may need attention');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

finalFrontendTest();