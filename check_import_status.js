const axios = require('axios');

async function checkImportStatus() {
    try {
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito');
        
        // Verifica import ID: 02ef57ed-7499-4dde-a946-5c95e4df9e85
        const importId = '02ef57ed-7499-4dde-a946-5c95e4df9e85';
        
        console.log(`🔍 Verifico stato import: ${importId}`);
        
        try {
            const statusResponse = await axios.get(`http://localhost:3001/api/unified-import/status/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('📊 Status:', statusResponse.data);
        } catch (error) {
            console.log('❌ Errore status:', error.response?.data || error.message);
        }
        
        try {
            const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('📋 Result:', resultResponse.data);
        } catch (error) {
            console.log('❌ Errore result:', error.response?.data || error.message);
        }
        
        // Verifica quanti clienti ci sono ora
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`👥 Clienti totali: ${clientiResponse.data.data?.length || 0}`);
        
        // Verifica contratti
        const contrattiLuceResponse = await axios.get('http://localhost:3001/api/contratti/luce?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`⚡ Contratti luce: ${contrattiLuceResponse.data.data?.length || 0}`);
        
        const contrattiGasResponse = await axios.get('http://localhost:3001/api/contratti/gas?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`🔥 Contratti gas: ${contrattiGasResponse.data.data?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
    }
}

checkImportStatus();