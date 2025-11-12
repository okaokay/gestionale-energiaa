const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testFrontendIntegration() {
    console.log('🔗 TEST INTEGRAZIONE FRONTEND');
    console.log('=============================\n');

    try {
        // 1. Login
        console.log('🔐 1. Login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        if (!loginResponse.data.success) {
            throw new Error('Login fallito');
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito');

        // 2. Test endpoint clienti con parametri del frontend
        console.log('\n👥 2. Test endpoint clienti con parametri frontend...');
        const clientiResponse = await axios.get(`${BASE_URL}/clienti`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: {
                search: '',
                tipo: '',
                limit: 200,
                _t: Date.now()
            }
        });

        console.log('✅ Endpoint clienti funziona');
        console.log('📊 Risposta:', {
            success: clientiResponse.data.success,
            totalClienti: clientiResponse.data.data?.length || 0,
            message: clientiResponse.data.message
        });

        // 3. Test endpoint clienti privati
        console.log('\n🏠 3. Test endpoint clienti privati...');
        const privatiResponse = await axios.get(`${BASE_URL}/clienti`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: {
                search: '',
                tipo: 'privato',
                limit: 200,
                _t: Date.now()
            }
        });

        console.log('✅ Endpoint clienti privati funziona');
        console.log('📊 Clienti privati:', privatiResponse.data.data?.length || 0);

        // 4. Test endpoint clienti aziende
        console.log('\n🏢 4. Test endpoint clienti aziende...');
        const aziendeResponse = await axios.get(`${BASE_URL}/clienti`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: {
                search: '',
                tipo: 'azienda',
                limit: 200,
                _t: Date.now()
            }
        });

        console.log('✅ Endpoint clienti aziende funziona');
        console.log('📊 Clienti aziende:', aziendeResponse.data.data?.length || 0);

        console.log('\n🎉 TUTTI I TEST SONO PASSATI!');

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('📋 Dettagli errore:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }
    }
}

testFrontendIntegration();