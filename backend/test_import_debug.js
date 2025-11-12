const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';
const LOGIN_CREDENTIALS = {
    email: 'admin@gestionale.it',
    password: 'Admin123!'
};

console.log('🔍 TEST DEBUG IMPORTAZIONE');
console.log('==========================');

let authToken = null;

async function login() {
    try {
        console.log('\n🔐 Login...');
        const response = await axios.post(`${API_BASE}/auth/login`, LOGIN_CREDENTIALS);
        
        if (response.data.success && response.data.data && response.data.data.token) {
            authToken = response.data.data.token;
            console.log('✅ Login OK');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Errore login:', error.message);
        return false;
    }
}

async function testUpload() {
    try {
        console.log('\n📤 Test upload...');
        
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        
        const response = await axios.post(`${API_BASE}/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${authToken}`
            },
            timeout: 30000
        });
        
        console.log('✅ Upload completato');
        console.log('📋 RISPOSTA COMPLETA:');
        console.log(JSON.stringify(response.data, null, 2));
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Errore upload:', error.response?.data || error.message);
        return null;
    }
}

async function testGetData() {
    try {
        console.log('\n🔍 Test recupero dati...');
        
        // Test clienti
        console.log('\n👥 Test clienti:');
        const clientiResponse = await axios.get(`${API_BASE}/clienti`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`Risposta clienti:`, typeof clientiResponse.data, Array.isArray(clientiResponse.data) ? `Array[${clientiResponse.data.length}]` : 'Non array');
        if (Array.isArray(clientiResponse.data) && clientiResponse.data.length > 0) {
            console.log('Primo cliente:', clientiResponse.data[0]);
        }
        
        // Test contratti luce
        console.log('\n💡 Test contratti luce:');
        const luceResponse = await axios.get(`${API_BASE}/contratti/luce`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`Risposta luce:`, typeof luceResponse.data, Array.isArray(luceResponse.data) ? `Array[${luceResponse.data.length}]` : 'Non array');
        if (Array.isArray(luceResponse.data) && luceResponse.data.length > 0) {
            console.log('Primo contratto luce:', luceResponse.data[0]);
        }
        
        // Test contratti gas
        console.log('\n🔥 Test contratti gas:');
        const gasResponse = await axios.get(`${API_BASE}/contratti/gas`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`Risposta gas:`, typeof gasResponse.data, Array.isArray(gasResponse.data) ? `Array[${gasResponse.data.length}]` : 'Non array');
        if (Array.isArray(gasResponse.data) && gasResponse.data.length > 0) {
            console.log('Primo contratto gas:', gasResponse.data[0]);
        }
        
        return {
            clienti: Array.isArray(clientiResponse.data) ? clientiResponse.data.length : 0,
            luce: Array.isArray(luceResponse.data) ? luceResponse.data.length : 0,
            gas: Array.isArray(gasResponse.data) ? gasResponse.data.length : 0
        };
        
    } catch (error) {
        console.error('❌ Errore recupero dati:', error.response?.data || error.message);
        return null;
    }
}

async function runDebugTest() {
    try {
        // Login
        const loginOk = await login();
        if (!loginOk) {
            console.error('💥 Login fallito');
            return;
        }
        
        // Upload
        const uploadResult = await testUpload();
        if (!uploadResult) {
            console.error('💥 Upload fallito');
            return;
        }
        
        // Recupero dati
        const dataResult = await testGetData();
        if (!dataResult) {
            console.error('💥 Recupero dati fallito');
            return;
        }
        
        console.log('\n🎉 RIEPILOGO FINALE:');
        console.log('====================');
        console.log(`👥 Clienti: ${dataResult.clienti}`);
        console.log(`💡 Contratti luce: ${dataResult.luce}`);
        console.log(`🔥 Contratti gas: ${dataResult.gas}`);
        
        if (uploadResult.summary) {
            console.log(`📊 Righe processate: ${uploadResult.summary.totalRows || 'N/A'}`);
            console.log(`✅ Successi: ${uploadResult.summary.successCount || 'N/A'}`);
            console.log(`❌ Errori: ${uploadResult.summary.errorCount || 'N/A'}`);
        }
        
    } catch (error) {
        console.error('💥 Errore generale:', error.message);
    }
}

runDebugTest();