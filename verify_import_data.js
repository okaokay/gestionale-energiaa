const axios = require('axios');

async function verifyImportData() {
  try {
    console.log('🔍 Verifico dati importati...');
    
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login effettuato');
    
    // Controlla clienti
    const clientiResponse = await axios.get('http://localhost:3000/api/clienti', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const clienti = clientiResponse.data.data || clientiResponse.data;
    console.log(`\n📊 Clienti trovati: ${clienti.length}`);
    
    if (clienti.length > 0) {
      console.log('\n👥 Lista clienti:');
      clienti.forEach((cliente, index) => {
        console.log(`${index + 1}. ${cliente.nome || 'N/A'} ${cliente.cognome || 'N/A'} - ${cliente.email || 'N/A'}`);
        console.log(`   ID: ${cliente.id}`);
        console.log(`   Tipo: ${cliente.tipo_cliente || 'N/A'}`);
        if (cliente.created_at) {
          console.log(`   Creato: ${new Date(cliente.created_at).toLocaleString()}`);
        }
        console.log('');
      });
    }
    
    // Controlla contratti
    const contrattiResponse = await axios.get('http://localhost:3000/api/contratti', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const contratti = contrattiResponse.data.data || contrattiResponse.data;
    console.log(`📋 Contratti trovati: ${contratti.length}`);
    
    if (contratti.length > 0) {
      console.log('\n📄 Lista contratti:');
      contratti.forEach((contratto, index) => {
        console.log(`${index + 1}. Tipo: ${contratto.tipo_contratto || 'N/A'}`);
        console.log(`   Cliente ID: ${contratto.cliente_id || 'N/A'}`);
        console.log(`   POD: ${contratto.pod || 'N/A'}`);
        console.log(`   PDR: ${contratto.pdr || 'N/A'}`);
        if (contratto.created_at) {
          console.log(`   Creato: ${new Date(contratto.created_at).toLocaleString()}`);
        }
        console.log('');
      });
    }
    
    // Controlla offerte
    try {
      const offerteResponse = await axios.get('http://localhost:3000/api/offerte', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const offerte = offerteResponse.data.data || offerteResponse.data;
      console.log(`🎯 Offerte trovate: ${offerte.length}`);
      
      if (offerte.length > 0) {
        console.log('\n💡 Lista offerte:');
        offerte.forEach((offerta, index) => {
          console.log(`${index + 1}. Nome: ${offerta.nome_offerta || 'N/A'}`);
          console.log(`   Tipo: ${offerta.tipo_offerta || 'N/A'}`);
          if (offerta.created_at) {
            console.log(`   Creata: ${new Date(offerta.created_at).toLocaleString()}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.log('⚠️ Endpoint offerte non disponibile o errore:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
  }
}

verifyImportData();