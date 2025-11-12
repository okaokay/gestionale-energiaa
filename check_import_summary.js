const axios = require('axios');

async function checkImportSummary() {
  try {
    console.log('🔍 Controllo riepilogo import...');
    
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login effettuato');
    
    // Usa l'ID dell'import più recente
    const importId = '6a21ed6b-dcef-4299-a891-29378e232b5a';
    
    // Controlla il risultato dell'import
    const resultResponse = await axios.get(`http://localhost:3000/api/unified-import/result/${importId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const result = resultResponse.data.data;
    
    console.log('📊 Riepilogo import:');
    console.log(`- Righe totali: ${result.totalRows}`);
    console.log(`- Righe processate: ${result.processedRows}`);
    console.log(`- Righe inserite: ${result.insertedRows}`);
    console.log(`- Righe con errori: ${result.errorRows}`);
    console.log(`- Righe saltate: ${result.skippedRows}`);
    
    console.log('\n✅ Record inseriti con successo:');
    result.results.forEach((record, index) => {
      if (record.success) {
        console.log(`${index + 1}. Tipo: ${record.detectedType} - ID: ${record.id}`);
        if (record.normalizedData.nome && record.normalizedData.cognome) {
          console.log(`   Cliente: ${record.normalizedData.nome} ${record.normalizedData.cognome}`);
        }
        if (record.normalizedData.email) {
          console.log(`   Email: ${record.normalizedData.email}`);
        }
        if (record.normalizedData.pod) {
          console.log(`   POD: ${record.normalizedData.pod}`);
        }
        if (record.normalizedData.pdr) {
          console.log(`   PDR: ${record.normalizedData.pdr}`);
        }
        if (record.normalizedData.nome_offerta) {
          console.log(`   Offerta: ${record.normalizedData.nome_offerta}`);
        }
      }
    });
    
    console.log('\n❌ Record con errori:');
    result.results.forEach((record, index) => {
      if (!record.success) {
        console.log(`${index + 1}. Tipo rilevato: ${record.detectedType}`);
        console.log(`   Errori: ${record.errors.join(', ')}`);
        if (record.warnings.length > 0) {
          console.log(`   Warning: ${record.warnings.join(', ')}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
  }
}

checkImportSummary();