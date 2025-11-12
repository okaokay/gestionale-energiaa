const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function login() {
  const res = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: 'admin@gestionale.it',
    password: 'Admin123!'
  });
  return res.data?.data?.token;
}

async function ensureClientePrivato(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await axios.get(`${BASE_URL}/api/clienti?tipo=privati`, { headers });
  if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];

  // Crea un cliente privato minimo
  const payload = {
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: 'RSSMRA80A01H501U',
    data_nascita: '1980-01-01',
    email_principale: 'mario.rossi@example.com',
    telefono_mobile: '+390000000000',
    via_residenza: 'Via Roma',
    civico_residenza: '1',
    cap_residenza: '00100',
    citta_residenza: 'Roma',
    provincia_residenza: 'RM',
    tipo_documento: 'CI',
    numero_documento: 'AA1234567',
    ente_rilascio: 'Comune di Roma',
    data_scadenza_documento: '2030-01-01'
  };
  const createRes = await axios.post(`${BASE_URL}/api/clienti/privati`, payload, { headers });
  return createRes.data.data;
}

async function testCreateContrattoLuce() {
  try {
    console.log('🔐 Login...');
    const token = await login();
    const headers = { Authorization: `Bearer ${token}` };

    console.log('👤 Recupero/creazione cliente privato...');
    const cliente = await ensureClientePrivato(token);
    console.log('✅ Cliente pronto:', { id: cliente.id, nome: cliente.nome, cognome: cliente.cognome });

    const payload = {
      tipo_cliente: 'privato',
      cliente_privato_id: cliente.id,
      cliente_azienda_id: null,
      numero_contratto: `TEST-${Date.now()}`,
      pod: 'IT001E12345678',
      fornitore: 'Enel',
      data_attivazione: '2025-01-01',
      data_scadenza: '2026-01-01',
      prezzo_energia: 0.125,
      stato: 'In compilazione'
    };

    console.log('📤 POST /api/contratti/luce payload:', payload);
    const res = await axios.post(`${BASE_URL}/api/contratti/luce`, payload, { headers });
    console.log('✅ Creato contratto luce:', res.data);
  } catch (error) {
    console.error('❌ Errore POST contratto luce');
    if (error.response) {
      console.error('HTTP:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testCreateContrattoLuce();