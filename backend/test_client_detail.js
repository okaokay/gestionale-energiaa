const axios = require('axios');

async function run() {
  const BASE_URL = 'http://localhost:3001/api';
  try {
    console.log('🔐 Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    const token = loginRes.data?.data?.token;
    if (!token) throw new Error('Token mancante nella risposta di login');
    console.log('✅ Login OK');

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    console.log('\n👥 Carico lista clienti...');
    const listRes = await axios.get(`${BASE_URL}/clienti`, { headers, params: { limit: 20 } });
    const clienti = listRes.data.data?.clienti || listRes.data.data || listRes.data;
    if (!Array.isArray(clienti) || clienti.length === 0) throw new Error('Nessun cliente nella lista');
    console.log(`✅ Ricevuti ${clienti.length} clienti`);

    const firstPrivato = clienti.find(c => c.tipo === 'privato');
    const firstAzienda = clienti.find(c => c.tipo === 'azienda');

    if (firstPrivato) {
      console.log(`\n🔍 Test dettaglio privato ID=${firstPrivato.id}`);
      const privatoRes = await axios.get(`${BASE_URL}/clienti/privati/${firstPrivato.id}`, { headers });
      console.log('✅ Dettaglio privato OK:', privatoRes.status);
    } else {
      console.log('ℹ️ Nessun privato nella lista');
    }

    if (firstAzienda) {
      console.log(`\n🔍 Test dettaglio azienda ID=${firstAzienda.id}`);
      const aziendaRes = await axios.get(`${BASE_URL}/clienti/aziende/${firstAzienda.id}`, { headers });
      console.log('✅ Dettaglio azienda OK:', aziendaRes.status);
    } else {
      console.log('ℹ️ Nessuna azienda nella lista');
    }

    console.log('\n✅ Test dettagli completati');
  } catch (error) {
    console.error('❌ Errore test dettaglio:', error.response?.data || error.message);
    process.exitCode = 1;
  }
}

run();