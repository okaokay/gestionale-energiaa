const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testExportCompleteAzienda() {
    try {
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data?.data?.token;
        if (!token) throw new Error('Token mancante');
        console.log('✅ Login OK');

        console.log('👥 Recupero lista clienti azienda...');
        const clientsResponse = await axios.get(`${BASE_URL}/clienti`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { tipo: 'aziende', limit: 10 }
        });
        
        let clientiAziende = clientsResponse.data?.data?.clienti || [];
        console.log(`📋 Aziende trovate: ${clientiAziende.length}`);

        // Se non esiste un cliente azienda, ne creo uno minimale
        if (!clientiAziende.find(c => c.tipo === 'azienda')) {
            console.log('➕ Creo un cliente azienda di test...');
            const createRes = await axios.post(`${BASE_URL}/clienti/aziende`, {
                ragione_sociale: 'Test Azienda Export',
                email_referente: 'referente@test-azienda.local'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const nuovaAzienda = createRes.data?.data;
            console.log(`✅ Azienda creata: ID=${nuovaAzienda.id}`);
            clientiAziende = [
                ...(clientiAziende || []),
                { tipo: 'azienda', id: nuovaAzienda.id, nome: nuovaAzienda.ragione_sociale }
            ];
        }

        // Trova un cliente azienda (preferisci il primo in lista)
        const clienteAzienda = clientiAziende.find(c => c.tipo === 'azienda');
        if (!clienteAzienda) throw new Error('Cliente azienda non disponibile dopo creazione');

        console.log(`📦 Export completo per azienda ID=${clienteAzienda.id}`);
        const exportResponse = await axios.get(`${BASE_URL}/clienti/azienda/${clienteAzienda.id}/export-complete`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Export OK - status:', exportResponse.status);
        console.log('📄 Chiavi payload:', Object.keys(exportResponse.data.data || exportResponse.data));

    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
    }
}

testExportCompleteAzienda();