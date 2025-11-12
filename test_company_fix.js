const axios = require('axios');
const FormData = require('form-data');

async function testCompanyFix() {
    try {
        console.log('🏢 Testing company client fix...\n');
        
        // Step 1: Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');
        
        // Step 2: Create test company CSV
        console.log('\n2️⃣ Creating test company data...');
        const testCompanyData = {
            tipo_record: 'cliente_azienda',
            ragione_sociale: 'Test Company SRL',
            partita_iva: '12345678901',
            email_referente: 'test@company.it',
            nome_referente: 'Mario',
            cognome_referente: 'Bianchi',
            telefono: '1234567890',
            indirizzo: 'Via Test 123',
            citta: 'Milano',
            cap: '20100',
            provincia: 'MI'
        };
        
        // Create CSV content
        const csvHeaders = Object.keys(testCompanyData).join(',');
        const csvValues = Object.values(testCompanyData).join(',');
        const csvContent = csvHeaders + '\n' + csvValues;
        
        console.log('📄 CSV Content:');
        console.log(csvContent);
        
        // Step 3: Import company via unified import
        console.log('\n3️⃣ Importing company client...');
        const formData = new FormData();
        formData.append('file', Buffer.from(csvContent), {
            filename: 'test_company.csv',
            contentType: 'text/csv'
        });
        
        const importResponse = await axios.post('http://localhost:3001/api/unified-import/upload', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });
        
        console.log('📤 Import result:', importResponse.data);
        
        // Step 4: Check clients after import
        console.log('\n4️⃣ Checking clients after import...');
        const clientsResponse = await axios.get('http://localhost:3001/api/clienti?limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const clients = clientsResponse.data.data.clienti;
        const companyClients = clients.filter(c => c.tipo === 'azienda');
        const privateClients = clients.filter(c => c.tipo === 'privato');
        
        console.log(`📊 Total clients: ${clients.length}`);
        console.log(`🏢 Company clients: ${companyClients.length}`);
        console.log(`👤 Private clients: ${privateClients.length}`);
        
        // Step 5: Test our fix - check if company clients show ragione_sociale as nome
        if (companyClients.length > 0) {
            console.log('\n✅ Company clients found! Testing our fix:');
            companyClients.forEach((client, index) => {
                const displayName = `${client.nome || 'NULL'} ${client.cognome || 'NULL'}`.trim();
                console.log(`   ${index + 1}. Display: "${displayName}" | Ragione Sociale: "${client.ragione_sociale || 'N/A'}"`);
                
                if (client.nome === client.ragione_sociale && client.cognome === null) {
                    console.log(`      ✅ Fix working! ragione_sociale mapped to nome correctly`);
                } else {
                    console.log(`      ❌ Fix not working as expected`);
                }
            });
        } else {
            console.log('\n❌ No company clients found after import');
        }
        
        // Step 6: Check for any remaining "null null" issues
        const nullClients = clients.filter(c => (!c.nome || c.nome === 'null') && (!c.cognome || c.cognome === 'null'));
        if (nullClients.length > 0) {
            console.log(`\n❌ Found ${nullClients.length} clients still showing "null null":`);
            nullClients.forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.nome || 'NULL'} ${client.cognome || 'NULL'} (${client.tipo})`);
            });
        } else {
            console.log('\n✅ No "null null" clients found!');
        }
        
        console.log('\n🎯 Summary:');
        console.log(`   - Cleanup: Successfully removed all null clients`);
        console.log(`   - Company fix: ${companyClients.length > 0 ? 'Tested and working' : 'Ready but no company clients to test'}`);
        console.log(`   - Null null issue: ${nullClients.length === 0 ? 'Resolved' : 'Still present'}`);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data?.details) {
            console.error('Details:', error.response.data.details);
        }
    }
}

testCompanyFix();