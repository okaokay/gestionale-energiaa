// Script rapido per verificare lista clienti e mostrare agente assegnato
// Uso: node backend/tools/check_clienti.js [search]

const axios = require('axios');

async function main() {
  const search = process.argv[2] || '';
  const baseURL = 'http://localhost:3001/api';
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    const token = loginRes.data?.data?.token || loginRes.data?.token;
    const res = await axios.get(`${baseURL}/clienti`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 100, search }
    });
    const clienti = res.data?.data?.clienti || [];
    console.log(`📋 Trovati ${clienti.length} clienti`);
    for (const c of clienti) {
      if (search && !(`${c.nome || ''} ${c.cognome || ''} ${c.ragione_sociale || ''}`.toLowerCase().includes(search.toLowerCase()))) continue;
      console.log({
        id: c.id,
        tipo: c.tipo,
        nome: c.nome || c.ragione_sociale,
        cf_piva: c.codice_fiscale || c.partita_iva,
        assigned_agent_id: c.assigned_agent_id,
        contratti_luce: c.contratti_luce,
        contratti_gas: c.contratti_gas,
      });
    }
  } catch (err) {
    console.error('❌ Errore:', err.response?.status, err.response?.data || err.message);
    process.exit(2);
  }
}

main();