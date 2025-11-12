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
    if (!token) throw new Error('Token mancante');
    const headers = { Authorization: `Bearer ${token}` };

    console.log('👥 Recupero lista clienti...');
    const listRes = await axios.get(`${BASE_URL}/clienti`, { headers, params: { limit: 10 } });
    const clienti = listRes.data.data?.clienti || listRes.data.data || listRes.data;
    const firstPrivato = Array.isArray(clienti) ? clienti.find(c => c.tipo === 'privato') : null;
    if (!firstPrivato) throw new Error('Nessun cliente privato disponibile');

    console.log(`📦 Export completo per privato ID=${firstPrivato.id}`);
    const exportRes = await axios.get(`${BASE_URL}/clienti/privato/${firstPrivato.id}/export-complete`, { headers });
    console.log('✅ Export OK - status:', exportRes.status);
    console.log('📄 Chiavi payload:', Object.keys(exportRes.data.data || exportRes.data).slice(0, 20));
  } catch (error) {
    console.error('❌ Errore export-complete:', error.response?.data || error.message);
    process.exitCode = 1;
  }
}

run();