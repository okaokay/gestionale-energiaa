/**
 * Script per triggare manualmente il controllo delle campagne programmate via API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        if (response.data.success && response.data.data?.token) {
            return response.data.data.token;
        } else {
            throw new Error('Login fallito');
        }
    } catch (error) {
        console.error('❌ Errore login:', error.response?.data || error.message);
        return null;
    }
}

async function triggerManualCheck() {
    console.log('🧪 Trigger manuale controllo campagne programmate');
    console.log('================================================\n');
    
    try {
        console.log('🔐 Effettuando login...');
        const token = await login();
        
        if (!token) {
            console.error('❌ Impossibile procedere senza login');
            return;
        }
        
        console.log('✅ Login effettuato con successo');
        console.log('⏰ Avvio controllo manuale...\n');
        
        const response = await axios.post(`${BASE_URL}/emails/campaigns/check-scheduled`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 secondi timeout
        });
        
        console.log('✅ Controllo completato!');
        console.log('📊 Risposta server:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('\n🎉 Controllo eseguito con successo!');
            const result = response.data.data;
            if (result.campaignsSent > 0) {
                console.log(`📧 Campagne inviate: ${result.campaignsSent}`);
            } else {
                console.log('📭 Nessuna campagna da inviare trovata (o controllo in corso)');
            }
        } else {
            console.log('❌ Errore durante il controllo');
        }
        
    } catch (error) {
        console.error('❌ Errore durante l\'esecuzione:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

triggerManualCheck();