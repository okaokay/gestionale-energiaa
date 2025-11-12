const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImportWithFix() {
    console.log('🧪 TEST IMPORT CON FIX APPLICATO');
    console.log('================================\n');

    try {
        // 1. Login come admin
        console.log('🔐 Login come admin...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login fallito: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login effettuato con successo');

        // 2. Trova il file CSV più recente
        const uploadsDir = path.join(__dirname, 'uploads', 'csv-import');
        const files = fs.readdirSync(uploadsDir)
            .filter(file => file.endsWith('.csv'))
            .map(file => ({
                name: file,
                path: path.join(uploadsDir, file),
                stats: fs.statSync(path.join(uploadsDir, file))
            }))
            .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

        if (files.length === 0) {
            throw new Error('Nessun file CSV trovato');
        }

        const latestFile = files[0];
        console.log(`📁 File CSV: ${latestFile.name}`);
        console.log(`📅 Data modifica: ${latestFile.stats.mtime.toLocaleString()}\n`);

        // 3. Carica il file per l'import
        console.log('📤 Caricamento file per import...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(latestFile.path));
        formData.append('options', JSON.stringify({
            autoDetectType: true,
            skipValidation: false,
            skipAssociation: false
        }));

        const uploadResponse = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload fallito: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('✅ Upload completato');
        console.log('📊 Risultato import:');
        console.log(`   - Righe totali: ${uploadResult.totalRows}`);
        console.log(`   - Successi: ${uploadResult.successfulImports}`);
        console.log(`   - Errori: ${uploadResult.failedImports}`);
        console.log(`   - Incompleti: ${uploadResult.incompleteImports}`);

        if (uploadResult.detectionSummary) {
            console.log('\n🔍 Rilevamento tipi:');
            Object.entries(uploadResult.detectionSummary).forEach(([type, count]) => {
                console.log(`   - ${type}: ${count} record`);
            });
        }

        if (uploadResult.errors && uploadResult.errors.length > 0) {
            console.log('\n❌ Primi 5 errori:');
            uploadResult.errors.slice(0, 5).forEach((error, index) => {
                console.log(`   ${index + 1}. Riga ${error.row}: ${error.message}`);
            });
        }

        // 4. Verifica i dati inseriti nel database
        console.log('\n🔍 Verifica dati nel database...');
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('gestionale_energia.db');

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Conta clienti privati
                db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                    if (err) {
                        console.error('❌ Errore conteggio clienti privati:', err);
                    } else {
                        console.log(`   - Clienti privati: ${row.count}`);
                    }
                });

                // Conta clienti aziende
                db.get("SELECT COUNT(*) as count FROM clienti_aziende", (err, row) => {
                    if (err) {
                        console.error('❌ Errore conteggio clienti aziende:', err);
                    } else {
                        console.log(`   - Clienti aziende: ${row.count}`);
                    }
                });

                // Conta contratti luce
                db.get("SELECT COUNT(*) as count FROM contratti_luce", (err, row) => {
                    if (err) {
                        console.error('❌ Errore conteggio contratti luce:', err);
                    } else {
                        console.log(`   - Contratti luce: ${row.count}`);
                    }
                });

                // Conta contratti gas
                db.get("SELECT COUNT(*) as count FROM contratti_gas", (err, row) => {
                    if (err) {
                        console.error('❌ Errore conteggio contratti gas:', err);
                    } else {
                        console.log(`   - Contratti gas: ${row.count}`);
                    }
                    
                    db.close();
                    resolve();
                });
            });
        });

    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        console.error(error.stack);
    }
}

testImportWithFix();