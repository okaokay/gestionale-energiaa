const axios = require('axios');

async function testConnection() {
  try {
    console.log('🔍 Test connessione al sistema...');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login riuscito');
    
    // Test API clienti
    const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ API clienti funzionante - ${clientiResponse.data.data?.length || 0} clienti trovati`);
    
    // Test API contratti luce
    const contrattiLuceResponse = await axios.get('http://localhost:3001/api/contratti/luce', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Test API contratti gas
    const contrattiGasResponse = await axios.get('http://localhost:3001/api/contratti/gas', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const totalContratti = (contrattiLuceResponse.data.data?.length || 0) + (contrattiGasResponse.data.data?.length || 0);
    console.log(`✅ API contratti funzionante - ${totalContratti} contratti trovati (${contrattiLuceResponse.data.data?.length || 0} luce, ${contrattiGasResponse.data.data?.length || 0} gas)`);
    
    // Test API import
    const importTypesResponse = await axios.get('http://localhost:3001/api/unified-import/supported-types', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ API import funzionante');
    
    console.log('\n🎉 Sistema completamente operativo!');
    console.log('🌐 Frontend: http://localhost:5173');
    console.log('🔧 Backend: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Errore di connessione:', error.response?.data || error.message);
  }
}

testConnection();