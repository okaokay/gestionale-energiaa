const axios = require('axios');

async function checkCurrentClients() {
    try {
        console.log('🔍 Verifica numero attuale di clienti nel database...\n');
        
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data?.token || loginResponse.data.token;
        
        if (!token) {
            throw new Error('Token non ottenuto dal login');
        }
        
        console.log('✅ Login effettuato con successo');
        
        // Ottieni tutti i clienti
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti?limit=1000', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const clienti = clientiResponse.data.clienti || clientiResponse.data.data?.clienti || [];
        
        console.log('📊 Stato attuale database:');
        console.log('=========================');
        console.log(`📋 Clienti totali: ${clienti.length}`);
        
        // Raggruppa per tipo
        const clientiPrivati = clienti.filter(c => c.tipo === 'privato' || !c.ragione_sociale);
        const clientiAzienda = clienti.filter(c => c.tipo === 'azienda' || c.ragione_sociale);
        
        console.log(`👤 Clienti privati: ${clientiPrivati.length}`);
        console.log(`🏢 Clienti azienda: ${clientiAzienda.length}`);
        
        // Mostra alcuni dettagli
        if (clientiPrivati.length > 0) {
            console.log('\n📝 Ultimi 5 clienti privati:');
            clientiPrivati.slice(-5).forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.nome || 'N/A'} ${cliente.cognome || 'N/A'} (${cliente.codice_fiscale || 'N/A'})`);
            });
        }
        
        // Verifica contratti
        try {
            const contrattiLuceResponse = await axios.get('http://localhost:3001/api/contratti?tipo=luce&limit=1000', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const contrattiGasResponse = await axios.get('http://localhost:3001/api/contratti?tipo=gas&limit=1000', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const contrattiLuce = contrattiLuceResponse.data.contratti || contrattiLuceResponse.data.data?.contratti || [];
            const contrattiGas = contrattiGasResponse.data.contratti || contrattiGasResponse.data.data?.contratti || [];
            
            console.log('\n⚡ Contratti:');
            console.log(`   Luce: ${contrattiLuce.length}`);
            console.log(`   Gas: ${contrattiGas.length}`);
            
        } catch (error) {
            console.log('\n⚠️  Impossibile verificare i contratti:', error.message);
        }
        
        console.log('\n🎯 Obiettivo dopo import CSV:');
        console.log(`   Clienti totali attesi: ${clienti.length + 10} (${clienti.length} attuali + 10 nuovi)`);
        
        return {
            clientiAttuali: clienti.length,
            clientiPrivati: clientiPrivati.length,
            clientiAzienda: clientiAzienda.length
        };
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        throw error;
    }
}

// Esegui la verifica
if (require.main === module) {
    checkCurrentClients()
        .then((result) => {
            console.log('\n✅ Verifica completata!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Verifica fallita:', error.message);
            process.exit(1);
        });
}

module.exports = { checkCurrentClients };