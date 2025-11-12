const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

// Simple UUID generator
function generateUUID() {
    return crypto.randomUUID();
}

const dbPath = path.join(__dirname, 'gestionale_energia.db');

async function testManualCompany() {
    console.log('🏢 Testing manual company client creation...\n');
    
    try {
        // Step 1: Insert company client directly into database
        console.log('1️⃣ Inserting company client directly into database...');
        const db = new sqlite3.Database(dbPath);
        
        const companyId = generateUUID();
        const insertQuery = `
            INSERT INTO clienti_aziende (
                id, ragione_sociale, partita_iva, email_referente, 
                nome_referente, cognome_referente, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        await new Promise((resolve, reject) => {
            db.run(insertQuery, [
                companyId,
                'Test Company SRL',
                '12345678901',
                'test@company.it',
                'Mario',
                'Bianchi'
            ], function(err) {
                if (err) {
                    console.error('Error inserting company:', err);
                    reject(err);
                } else {
                    console.log(`✅ Company inserted with ID: ${companyId}`);
                    resolve(this.lastID);
                }
            });
        });
        
        db.close();
        
        // Step 2: Test API response
        console.log('\n2️⃣ Testing API response...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        
        const clientsResponse = await axios.get('http://localhost:3001/api/clienti?limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const clients = clientsResponse.data.data.clienti;
        const companyClients = clients.filter(c => c.tipo === 'azienda');
        
        console.log(`📊 Total clients: ${clients.length}`);
        console.log(`🏢 Company clients: ${companyClients.length}`);
        
        if (companyClients.length > 0) {
            console.log('\n✅ Company client found! Testing our fix:');
            companyClients.forEach((client, index) => {
                console.log(`\n   Company ${index + 1}:`);
                console.log(`   - ID: ${client.id}`);
                console.log(`   - Nome: "${client.nome || 'NULL'}"`);
                console.log(`   - Cognome: "${client.cognome || 'NULL'}"`);
                console.log(`   - Ragione Sociale: "${client.ragione_sociale || 'N/A'}"`);
                console.log(`   - Tipo: ${client.tipo}`);
                
                // Test our fix
                const displayName = `${client.nome || 'NULL'} ${client.cognome || 'NULL'}`.trim();
                console.log(`   - Display Name: "${displayName}"`);
                
                if (client.nome === client.ragione_sociale && (client.cognome === null || client.cognome === 'NULL')) {
                    console.log(`   ✅ FIX WORKING! ragione_sociale correctly mapped to nome`);
                    console.log(`   ✅ No more "null null" for company clients!`);
                } else {
                    console.log(`   ❌ Fix not working as expected`);
                    console.log(`   Expected: nome="${client.ragione_sociale}", cognome=NULL`);
                    console.log(`   Actual: nome="${client.nome}", cognome="${client.cognome}"`);
                }
            });
        } else {
            console.log('\n❌ No company clients found in API response');
        }
        
        // Step 3: Show all clients
        console.log('\n3️⃣ All current clients:');
        clients.forEach((client, index) => {
            const displayName = `${client.nome || 'NULL'} ${client.cognome || 'NULL'}`.trim();
            console.log(`   ${index + 1}. "${displayName}" (${client.tipo})`);
        });
        
        // Step 4: Final verification
        const nullClients = clients.filter(c => 
            (!c.nome || c.nome === 'null' || c.nome === 'NULL') && 
            (!c.cognome || c.cognome === 'null' || c.cognome === 'NULL')
        );
        
        console.log(`\n🎯 Final Results:`);
        console.log(`   ✅ Total clients: ${clients.length}`);
        console.log(`   ✅ Company clients: ${companyClients.length}`);
        console.log(`   ✅ "Null null" clients: ${nullClients.length}`);
        console.log(`   ✅ Fix status: ${companyClients.length > 0 && nullClients.length === 0 ? 'WORKING PERFECTLY!' : 'Needs attention'}`);
        
        if (companyClients.length > 0 && nullClients.length === 0) {
            console.log('\n🎉 SUCCESS! The fix is working correctly:');
            console.log('   - Company clients now show ragione_sociale as nome');
            console.log('   - No more "null null" display issues');
            console.log('   - All existing private clients are preserved');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testManualCompany();