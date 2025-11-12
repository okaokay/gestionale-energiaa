// Script rapido per assegnare un cliente a un agente via API
// Uso: node backend/tools/assign_cliente.js <cliente_id> <cliente_tipo> <new_agent_id>

const axios = require('axios');

async function main() {
  const [,, clienteId, clienteTipo, newAgentId] = process.argv;
  if (!clienteId || !clienteTipo || !newAgentId) {
    console.error('Uso: node backend/tools/assign_cliente.js <cliente_id> <cliente_tipo: privato|azienda> <new_agent_id>');
    process.exit(1);
  }

  const baseURL = 'http://localhost:3001/api';
  try {
    console.log('🔐 Login admin...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    const token = loginRes.data?.data?.token || loginRes.data?.token;
    if (!token) throw new Error('Token non ottenuto dalla risposta di login');
    console.log('✅ Login OK');

    const payload = {
      cliente_id: clienteId,
      cliente_tipo: clienteTipo,
      new_agent_id: newAgentId,
      motivo: 'Assegnazione rapida via script'
    };
    console.log('📤 Invio assegnazione:', payload);
    const res = await axios.put(`${baseURL}/agenti/assign-cliente`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Risposta:', JSON.stringify(res.data, null, 2));

    // Verifica rapido: recupera cliente dal suo tipo
    const clienteUrl = clienteTipo === 'privato'
      ? `${baseURL}/clienti/privati/${clienteId}`
      : `${baseURL}/clienti/aziende/${clienteId}`;
    const check = await axios.get(clienteUrl, { headers: { Authorization: `Bearer ${token}` } });
    console.log('🔎 Cliente dopo assegnazione:', {
      id: check.data?.data?.id,
      assigned_agent_id: check.data?.data?.assigned_agent_id,
      commissione_pattuita: check.data?.data?.commissione_pattuita,
      commissione_luce: check.data?.data?.commissione_luce,
      commissione_gas: check.data?.data?.commissione_gas,
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error('❌ Errore:', status, data || err.message);
    process.exit(2);
  }
}

main();