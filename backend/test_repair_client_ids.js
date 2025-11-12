const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const CREDENTIALS = { email: 'admin@gestionale.it', password: 'Admin123!' };

async function runRepair() {
  try {
    console.log('🔐 Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
    const token = loginRes.data?.data?.token || loginRes.data?.token;
    if (!token) throw new Error('Token non ricevuto al login');
    console.log('✅ Login OK');

    console.log('🧹 Riparazione ID vuoti clienti...');
    const res = await axios.post(`${BASE_URL}/clienti/repair-ids`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Risultato riparazione:');
    console.log(JSON.stringify(res.data, null, 2));

    // Verifica veloce: ricarica clienti
    console.log('🔍 Verifica post-riparazione (lista clienti)...');
    const clientiRes = await axios.get(`${BASE_URL}/clienti`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50, _t: Date.now() }
    });
    const clienti = clientiRes.data?.data?.clienti || clientiRes.data?.data || clientiRes.data || [];
    const invalid = Array.isArray(clienti) ? clienti.filter(c => !c.id || String(c.id).trim() === '') : [];
    console.log(`👥 Clienti totali: ${Array.isArray(clienti) ? clienti.length : 'N/A'}`);
    console.log(`⚠️  Clienti con ID non valido dopo repair: ${invalid.length}`);

    console.log('\n🎉 Completato. Se invalid=0 puoi selezionare ed eliminare dal frontend.');
  } catch (err) {
    console.error('❌ Errore:', err.response?.data || err.message);
  }
}

runRepair();