const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

async function cleanupAndTest() {
    console.log('🧹 Starting cleanup and test...\n');
    
    // Step 1: Clean up null clients
    console.log('1️⃣ Cleaning up clients with null names...');
    const db = new sqlite3.Database(dbPath);
    
    await new Promise((resolve, reject) => {
        db.run("DELETE FROM clienti_privati WHERE nome IS NULL AND cognome IS NULL", function(err) {
            if (err) {
                console.error('Error cleaning up:', err);
                reject(err);
            } else {
                console.log(`✅ Deleted ${this.changes} clients with null names`);
                resolve(this.changes);
            }
        });
    });
    
    db.close();
    
    // Step 2: Test API after cleanup
    console.log('\n2️⃣ Testing API after cleanup...');
    try {
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        
        // Get clients
        const clientsResponse = await axios.get('http://localhost:3001/api/clienti?limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const clients = clientsResponse.data.data.clienti;
        console.log(`📊 Clients after cleanup: ${clients.length}`);
        
        const nullClients = clients.filter(c => !c.nome || !c.cognome);
        console.log(`❌ Remaining null clients: ${nullClients.length}`);
        
        if (nullClients.length === 0) {
            console.log('✅ All null clients cleaned up successfully!');
        }
        
        // Show remaining clients
        console.log('\n📋 Remaining clients:');
        clients.forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.nome} ${client.cognome} (${client.tipo})`);
        });
        
    } catch (error) {
        console.error('❌ API Error:', error.response?.data || error.message);
    }
    
    // Step 3: Test company client import
    console.log('\n3️⃣ Testing company client import...');
    try {
        const testCompanyData = {
            tipo_record: 'cliente_azienda',
            ragione_sociale: 'Test Company SRL',
            partita_iva: '12345678901',
            email_referente: 'test@company.it',
            nome_referente: 'Mario',
            cognome_referente: 'Bianchi'
        };
        
        // Create CSV content
        const csvHeaders = Object.keys(testCompanyData).join(',');
        const csvValues = Object.values(testCompanyData).join(',');
        const csvContent = csvHeaders + '\n' + csvValues;
        
        // Create form data
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', Buffer.from(csvContent), {
            filename: 'test_company.csv',
            contentType: 'text/csv'
        });
        
        // Import via unified import
        const importResponse = await axios.post('http://localhost:3001/api/unified-import/upload', formData, {
            headers: {
                'Authorization': `Bearer ${loginResponse.data.data.token}`,
                ...formData.getHeaders()
            }
        });
        
        console.log('📤 Company import result:', importResponse.data);
        
        // Check if company was created
        const clientsAfterImport = await axios.get('http://localhost:3001/api/clienti?limit=50', {
            headers: {
                'Authorization': `Bearer ${loginResponse.data.data.token}`
            }
        });
        
        const companyClients = clientsAfterImport.data.data.clienti.filter(c => c.tipo === 'azienda');
        console.log(`🏢 Company clients after import: ${companyClients.length}`);
        
        if (companyClients.length > 0) {
            console.log('✅ Company client created successfully!');
            companyClients.forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.nome || 'NULL'} ${client.cognome || 'NULL'} (Ragione Sociale: ${client.ragione_sociale || 'N/A'})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Company Import Error:', error.response?.data || error.message);
    }
}

cleanupAndTest();