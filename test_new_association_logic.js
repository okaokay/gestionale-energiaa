const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Test della nuova logica di associazione contratti-clienti
async function testNewAssociationLogic() {
    console.log('🧪 TESTING NUOVA LOGICA DI ASSOCIAZIONE CONTRATTI-CLIENTI');
    console.log('=' .repeat(60));

    // Percorso del database
    const dbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
    
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Database non trovato:', dbPath);
        return;
    }

    const db = new Database(dbPath);
    
    try {
        // 1. Pulisci i dati di test precedenti
        console.log('\n1️⃣ Pulizia dati di test precedenti...');
        db.exec(`
            DELETE FROM contratti_luce WHERE numero_contratto LIKE 'TEST_%';
            DELETE FROM contratti_gas WHERE numero_contratto LIKE 'TEST_%';
            DELETE FROM clienti_privati WHERE codice_fiscale LIKE 'TEST%';
        `);
        console.log('✅ Dati di test puliti');

        // 2. Inserisci cliente di test
        console.log('\n2️⃣ Inserimento cliente di test...');
        const insertClientStmt = db.prepare(`
            INSERT INTO clienti_privati (
                nome, cognome, codice_fiscale, email_principale, 
                telefono_mobile, via_residenza, civico_residenza, 
                cap_residenza, citta_residenza, provincia_residenza,
                consenso_privacy, consenso_marketing
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const clienteResult = insertClientStmt.run(
            'Mario', 'Test', 'TSTMRA80A01H501U', 'mario.test@email.it',
            '3331234567', 'Via Test', '10', '00100', 'Roma', 'RM', 1, 0
        );

        const clienteId = clienteResult.lastInsertRowid;
        console.log(`✅ Cliente inserito con ID: ${clienteId}`);

        // 3. Test import CSV con template perfetto
        console.log('\n3️⃣ Test import CSV...');
        
        // Crea un CSV di test con riferimenti al cliente
        const testCsvContent = `tipo_record,nome,cognome,codice_fiscale,email_principale,numero_contratto,pod,pdr,fornitore,data_attivazione,data_scadenza,prezzo_energia,prezzo_gas,stato_contratto
contratto_luce,Mario,Test,TSTMRA80A01H501U,mario.test@email.it,TEST_LUCE_001,IT001E12345678,,Enel Energia,2024-01-15,2026-01-15,0.25,,attivo
contratto_gas,Mario,Test,TSTMRA80A01H501U,mario.test@email.it,TEST_GAS_001,,09876543210987,Eni Gas,2024-01-15,2026-01-15,,0.75,attivo`;

        const testCsvPath = path.join(__dirname, 'test_association.csv');
        fs.writeFileSync(testCsvPath, testCsvContent);
        console.log('✅ File CSV di test creato');

        // 4. Simula l'import tramite API
        console.log('\n4️⃣ Simulazione import tramite API...');
        
        const fetch = require('node-fetch');
        const FormData = require('form-data');
        
        const form = new FormData();
        form.append('file', fs.createReadStream(testCsvPath));
        form.append('mapping', JSON.stringify({
            "tipo_record": "tipo_record",
            "nome": "nome", 
            "cognome": "cognome",
            "codice_fiscale": "codice_fiscale",
            "email_principale": "email_principale",
            "numero_contratto": "numero_contratto",
            "pod": "pod",
            "pdr": "pdr", 
            "fornitore": "fornitore",
            "data_attivazione": "data_attivazione",
            "data_scadenza": "data_scadenza",
            "prezzo_energia": "prezzo_energia",
            "prezzo_gas": "prezzo_gas",
            "stato_contratto": "stato_contratto"
        }));

        try {
            const response = await fetch('http://localhost:3000/api/unified-import/import', {
                method: 'POST',
                body: form,
                headers: {
                    'Authorization': 'Bearer test-token' // Token di test
                }
            });

            const result = await response.json();
            console.log('📊 Risultato import:', JSON.stringify(result, null, 2));

            // 5. Verifica associazioni
            console.log('\n5️⃣ Verifica associazioni...');
            
            // Verifica contratto luce
            const contrattoLuce = db.prepare(`
                SELECT cl.*, cp.nome, cp.cognome, cp.codice_fiscale 
                FROM contratti_luce cl
                LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
                WHERE cl.numero_contratto = 'TEST_LUCE_001'
            `).get();

            if (contrattoLuce) {
                console.log('✅ Contratto luce trovato e associato:');
                console.log(`   - Cliente ID: ${contrattoLuce.cliente_privato_id}`);
                console.log(`   - Cliente: ${contrattoLuce.nome} ${contrattoLuce.cognome}`);
                console.log(`   - Codice Fiscale: ${contrattoLuce.codice_fiscale}`);
                console.log(`   - Numero Contratto: ${contrattoLuce.numero_contratto}`);
            } else {
                console.log('❌ Contratto luce non trovato o non associato');
            }

            // Verifica contratto gas
            const contrattoGas = db.prepare(`
                SELECT cg.*, cp.nome, cp.cognome, cp.codice_fiscale 
                FROM contratti_gas cg
                LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
                WHERE cg.numero_contratto = 'TEST_GAS_001'
            `).get();

            if (contrattoGas) {
                console.log('✅ Contratto gas trovato e associato:');
                console.log(`   - Cliente ID: ${contrattoGas.cliente_privato_id}`);
                console.log(`   - Cliente: ${contrattoGas.nome} ${contrattoGas.cognome}`);
                console.log(`   - Codice Fiscale: ${contrattoGas.codice_fiscale}`);
                console.log(`   - Numero Contratto: ${contrattoGas.numero_contratto}`);
            } else {
                console.log('❌ Contratto gas non trovato o non associato');
            }

            // 6. Test associazione con ID diretto
            console.log('\n6️⃣ Test associazione con ID diretto...');
            
            const testCsvWithId = `tipo_record,cliente_privato_id,numero_contratto,pod,fornitore,data_attivazione,data_scadenza,prezzo_energia,stato_contratto
contratto_luce,${clienteId},TEST_LUCE_002,IT001E87654321,Edison,2024-02-01,2026-02-01,0.30,attivo`;

            const testCsvIdPath = path.join(__dirname, 'test_association_id.csv');
            fs.writeFileSync(testCsvIdPath, testCsvWithId);

            const formId = new FormData();
            formId.append('file', fs.createReadStream(testCsvIdPath));
            formId.append('mapping', JSON.stringify({
                "tipo_record": "tipo_record",
                "cliente_privato_id": "cliente_privato_id",
                "numero_contratto": "numero_contratto",
                "pod": "pod",
                "fornitore": "fornitore",
                "data_attivazione": "data_attivazione",
                "data_scadenza": "data_scadenza",
                "prezzo_energia": "prezzo_energia",
                "stato_contratto": "stato_contratto"
            }));

            const responseId = await fetch('http://localhost:3000/api/unified-import/import', {
                method: 'POST',
                body: formId,
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });

            const resultId = await responseId.json();
            console.log('📊 Risultato import con ID:', JSON.stringify(resultId, null, 2));

            // Verifica contratto con ID diretto
            const contrattoIdDiretto = db.prepare(`
                SELECT cl.*, cp.nome, cp.cognome 
                FROM contratti_luce cl
                LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
                WHERE cl.numero_contratto = 'TEST_LUCE_002'
            `).get();

            if (contrattoIdDiretto && contrattoIdDiretto.cliente_privato_id == clienteId) {
                console.log('✅ Associazione con ID diretto funziona correttamente');
                console.log(`   - Cliente ID: ${contrattoIdDiretto.cliente_privato_id}`);
                console.log(`   - Cliente: ${contrattoIdDiretto.nome} ${contrattoIdDiretto.cognome}`);
            } else {
                console.log('❌ Associazione con ID diretto fallita');
            }

            // Cleanup
            fs.unlinkSync(testCsvPath);
            fs.unlinkSync(testCsvIdPath);

        } catch (apiError) {
            console.error('❌ Errore durante la chiamata API:', apiError.message);
            console.log('ℹ️  Assicurati che il server backend sia in esecuzione su localhost:3000');
        }

        console.log('\n🎯 TEST COMPLETATO');
        console.log('=' .repeat(60));

    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        db.close();
    }
}

// Esegui il test
testNewAssociationLogic().catch(console.error);