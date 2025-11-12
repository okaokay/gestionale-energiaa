import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

async function login() {
    try {
        console.log('🔐 Effettuando login...');
        
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });
        
        const result = await response.json();
        
        if (!result.success || !result.data?.token) {
            throw new Error('Login fallito: ' + (result.message || 'Token non ricevuto'));
        }
        
        console.log('✅ Login effettuato con successo!');
        return result.data.token;
        
    } catch (error) {
        console.error('❌ Errore durante il login:', error.message);
        throw error;
    }
}

async function testImport() {
    try {
        console.log('🔍 Testando import contratti gas...');
        
        // Effettua login per ottenere token
        const token = await login();
        
        // Leggi il file CSV
        const csvContent = fs.readFileSync('./test_contratti_gas.csv');
        
        // Crea FormData
        const formData = new FormData();
        formData.append('file', csvContent, {
            filename: 'test_contratti_gas.csv',
            contentType: 'text/csv'
        });
        
        console.log('📤 Inviando file per import...');
        
        // Invia richiesta con token di autenticazione
        const response = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        console.log('📊 Risultato import:', JSON.stringify(result, null, 2));
        
        if (result.success && result.data?.importId) {
            console.log('🎯 Import ID:', result.data.importId);
            console.log('✅ Import avviato con successo! Controlla i log del backend per i dettagli.');
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
    }
}

testImport();