const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testDashboard() {
    try {
        console.log('🧪 Test Dashboard API...\n');

        // 1. Login
        console.log('1. 🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        if (loginResponse.status === 200) {
            console.log('✅ Login riuscito');
            console.log('📋 Risposta login:', loginResponse.data);
            const token = loginResponse.data.data.token;

            // 2. Test endpoint dashboard/scadenze
            console.log('\n2. 📊 Test endpoint /dashboard/scadenze...');
            const scadenzeResponse = await axios.get(`${BASE_URL}/dashboard/scadenze`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (scadenzeResponse.status === 200) {
                console.log('✅ Endpoint /dashboard/scadenze funziona correttamente');
                console.log(`📋 Scadenze trovate: ${scadenzeResponse.data.length}`);
                
                if (scadenzeResponse.data.length > 0) {
                    console.log('📄 Prima scadenza:', {
                        tipo: scadenzeResponse.data[0].tipo_contratto,
                        cliente: scadenzeResponse.data[0].cliente_nome || scadenzeResponse.data[0].azienda_nome,
                        giorni: scadenzeResponse.data[0].giorni_a_scadenza
                    });
                }
            } else {
                console.log('❌ Errore endpoint /dashboard/scadenze:', scadenzeResponse.status);
            }

            // 3. Test endpoint dashboard/stats
            console.log('\n3. 📈 Test endpoint /dashboard/stats...');
            const statsResponse = await axios.get(`${BASE_URL}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (statsResponse.status === 200) {
                console.log('✅ Endpoint /dashboard/stats funziona correttamente');
                console.log('📊 Stats:', statsResponse.data);
            } else {
                console.log('❌ Errore endpoint /dashboard/stats:', statsResponse.status);
            }

        } else {
            console.log('❌ Login fallito:', loginResponse.status);
        }

    } catch (error) {
        console.log('❌ Errore durante il test:', error.response?.status, error.response?.data || error.message);
        
        if (error.response?.data) {
            console.log('📋 Dettagli errore:', error.response.data);
        }
    }
}

testDashboard();