const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

// Percorso del database SQLite
const dbPath = path.join(__dirname, 'gestionale_energia.db');

// Dati demo per 10 clienti privati
const clientiDemo = [
    {
        nome: 'Mario',
        cognome: 'Rossi',
        codice_fiscale: 'RSSMRA80A01H501Z',
        data_nascita: '1980-01-01',
        email_principale: 'mario.rossi@email.com',
        telefono_mobile: '3331234567',
        via_residenza: 'Via Roma',
        civico_residenza: '10',
        cap_residenza: '00100',
        citta_residenza: 'Roma',
        provincia_residenza: 'RM',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'AB1234567',
        ente_rilascio: 'Comune di Roma',
        data_scadenza_documento: '2030-12-31',
        iban: 'IT60X0542811101000000123456'
    },
    {
        nome: 'Giulia',
        cognome: 'Bianchi',
        codice_fiscale: 'BNCGLI85B15F205X',
        data_nascita: '1985-02-15',
        email_principale: 'giulia.bianchi@email.com',
        telefono_mobile: '3337654321',
        via_residenza: 'Via Milano',
        civico_residenza: '25',
        cap_residenza: '20100',
        citta_residenza: 'Milano',
        provincia_residenza: 'MI',
        tipo_documento: 'Patente',
        numero_documento: 'MI1234567',
        ente_rilascio: 'Motorizzazione Milano',
        data_scadenza_documento: '2029-02-15',
        iban: 'IT60X0542811101000000234567'
    },
    {
        nome: 'Luca',
        cognome: 'Verdi',
        codice_fiscale: 'VRDLCU90C20L219Y',
        data_nascita: '1990-03-20',
        email_principale: 'luca.verdi@email.com',
        telefono_mobile: '3339876543',
        via_residenza: 'Via Napoli',
        civico_residenza: '5',
        cap_residenza: '80100',
        citta_residenza: 'Napoli',
        provincia_residenza: 'NA',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'NA9876543',
        ente_rilascio: 'Comune di Napoli',
        data_scadenza_documento: '2031-03-20',
        iban: 'IT60X0542811101000000345678'
    },
    {
        nome: 'Anna',
        cognome: 'Neri',
        codice_fiscale: 'NRANNA75D25H501W',
        data_nascita: '1975-04-25',
        email_principale: 'anna.neri@email.com',
        telefono_mobile: '3335432109',
        via_residenza: 'Via Torino',
        civico_residenza: '15',
        cap_residenza: '10100',
        citta_residenza: 'Torino',
        provincia_residenza: 'TO',
        tipo_documento: 'Passaporto',
        numero_documento: 'YA1234567',
        ente_rilascio: 'Questura di Torino',
        data_scadenza_documento: '2028-04-25',
        iban: 'IT60X0542811101000000456789'
    },
    {
        nome: 'Francesco',
        cognome: 'Gialli',
        codice_fiscale: 'GLLFNC88E30F839V',
        data_nascita: '1988-05-30',
        email_principale: 'francesco.gialli@email.com',
        telefono_mobile: '3338765432',
        via_residenza: 'Via Firenze',
        civico_residenza: '8',
        cap_residenza: '50100',
        citta_residenza: 'Firenze',
        provincia_residenza: 'FI',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'FI8765432',
        ente_rilascio: 'Comune di Firenze',
        data_scadenza_documento: '2032-05-30',
        iban: 'IT60X0542811101000000567890'
    },
    {
        nome: 'Chiara',
        cognome: 'Blu',
        codice_fiscale: 'BLUCHR92F10D612U',
        data_nascita: '1992-06-10',
        email_principale: 'chiara.blu@email.com',
        telefono_mobile: '3332109876',
        via_residenza: 'Via Bologna',
        civico_residenza: '12',
        cap_residenza: '40100',
        citta_residenza: 'Bologna',
        provincia_residenza: 'BO',
        tipo_documento: 'Patente',
        numero_documento: 'BO2109876',
        ente_rilascio: 'Motorizzazione Bologna',
        data_scadenza_documento: '2030-06-10',
        iban: 'IT60X0542811101000000678901'
    },
    {
        nome: 'Alessandro',
        cognome: 'Rosa',
        codice_fiscale: 'RSALSS83G15A662T',
        data_nascita: '1983-07-15',
        email_principale: 'alessandro.rosa@email.com',
        telefono_mobile: '3336543210',
        via_residenza: 'Via Bari',
        civico_residenza: '20',
        cap_residenza: '70100',
        citta_residenza: 'Bari',
        provincia_residenza: 'BA',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'BA6543210',
        ente_rilascio: 'Comune di Bari',
        data_scadenza_documento: '2033-07-15',
        iban: 'IT60X0542811101000000789012'
    },
    {
        nome: 'Valentina',
        cognome: 'Viola',
        codice_fiscale: 'VLVLNT87H20L736S',
        data_nascita: '1987-08-20',
        email_principale: 'valentina.viola@email.com',
        telefono_mobile: '3334321098',
        via_residenza: 'Via Palermo',
        civico_residenza: '7',
        cap_residenza: '90100',
        citta_residenza: 'Palermo',
        provincia_residenza: 'PA',
        tipo_documento: 'Passaporto',
        numero_documento: 'YB4321098',
        ente_rilascio: 'Questura di Palermo',
        data_scadenza_documento: '2029-08-20',
        iban: 'IT60X0542811101000000890123'
    },
    {
        nome: 'Davide',
        cognome: 'Arancio',
        codice_fiscale: 'RNCDVD91I25C351R',
        data_nascita: '1991-09-25',
        email_principale: 'davide.arancio@email.com',
        telefono_mobile: '3331098765',
        via_residenza: 'Via Catania',
        civico_residenza: '18',
        cap_residenza: '95100',
        citta_residenza: 'Catania',
        provincia_residenza: 'CT',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'CT1098765',
        ente_rilascio: 'Comune di Catania',
        data_scadenza_documento: '2031-09-25',
        iban: 'IT60X0542811101000000901234'
    },
    {
        nome: 'Federica',
        cognome: 'Marrone',
        codice_fiscale: 'MRRFDR86L30H501Q',
        data_nascita: '1986-10-30',
        email_principale: 'federica.marrone@email.com',
        telefono_mobile: '3338765432',
        via_residenza: 'Via Venezia',
        civico_residenza: '3',
        cap_residenza: '30100',
        citta_residenza: 'Venezia',
        provincia_residenza: 'VE',
        tipo_documento: 'Patente',
        numero_documento: 'VE8765432',
        ente_rilascio: 'Motorizzazione Venezia',
        data_scadenza_documento: '2032-10-30',
        iban: 'IT60X0542811101000000012345'
    }
];

// Funzione per generare POD realistici
function generaPOD() {
    const prefisso = 'IT001E';
    const numero = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefisso + numero;
}

// Funzione per generare PDR realistici
function generaPDR() {
    const numero = Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0');
    return numero;
}

// Funzione per generare numero contratto
function generaNumeroContratto(tipo, index) {
    const prefisso = tipo === 'luce' ? 'EE' : 'GAS';
    const anno = new Date().getFullYear();
    const numero = (index + 1).toString().padStart(4, '0');
    return `${prefisso}${anno}${numero}`;
}

async function inserisciClientiEContratti() {
    const db = new Database(dbPath);
    
    try {
        console.log('🚀 Inizio inserimento 10 clienti privati con contratti luce e gas...\n');
        
        // Ottieni un utente esistente per created_by
        const userResult = db.prepare('SELECT id FROM users LIMIT 1').get();
        const createdBy = userResult?.id;
        
        if (!createdBy) {
            throw new Error('Nessun utente trovato nel database. Inserire prima almeno un utente.');
        }
        
        // Prepara le query
        const insertClienteStmt = db.prepare(`
            INSERT INTO clienti_privati (
                id, nome, cognome, codice_fiscale, data_nascita, 
                email_principale, telefono_mobile, via_residenza, 
                civico_residenza, cap_residenza, citta_residenza, 
                provincia_residenza, tipo_documento, numero_documento, 
                ente_rilascio, data_scadenza_documento, iban,
                consenso_privacy, consenso_marketing, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP
            )
        `);
        
        const insertContrattoLuceStmt = db.prepare(`
            INSERT INTO contratti_luce (
                id, cliente_privato_id, tipo_cliente, numero_contratto, pod,
                fornitore, data_attivazione, data_scadenza, prezzo_energia,
                stato, created_at
            ) VALUES (
                ?, ?, 'privato', ?, ?, ?, ?, ?, ?, 'attivo', CURRENT_TIMESTAMP
            )
        `);
        
        const insertContrattoGasStmt = db.prepare(`
            INSERT INTO contratti_gas (
                id, cliente_privato_id, tipo_cliente, numero_contratto, pdr,
                fornitore, data_attivazione, data_scadenza, prezzo_gas,
                stato, created_at
            ) VALUES (
                ?, ?, 'privato', ?, ?, ?, ?, ?, ?, 'attivo', CURRENT_TIMESTAMP
            )
        `);
        
        // Inizia transazione
        const transaction = db.transaction(() => {
            for (let i = 0; i < clientiDemo.length; i++) {
                const cliente = clientiDemo[i];
                const clienteId = randomUUID();
                
                console.log(`📝 Inserimento cliente ${i + 1}/10: ${cliente.nome} ${cliente.cognome}`);
                
                // 1. Inserisci cliente privato
                insertClienteStmt.run([
                    clienteId, cliente.nome, cliente.cognome, cliente.codice_fiscale,
                    cliente.data_nascita, cliente.email_principale, cliente.telefono_mobile,
                    cliente.via_residenza, cliente.civico_residenza, cliente.cap_residenza,
                    cliente.citta_residenza, cliente.provincia_residenza, cliente.tipo_documento,
                    cliente.numero_documento, cliente.ente_rilascio, cliente.data_scadenza_documento,
                    cliente.iban
                ]);
                
                // 2. Inserisci contratto luce
                const contrattoLuceId = randomUUID();
                const pod = generaPOD();
                const numeroContrattoLuce = generaNumeroContratto('luce', i);
                const dataAttivazioneLuce = new Date();
                dataAttivazioneLuce.setMonth(dataAttivazioneLuce.getMonth() - Math.floor(Math.random() * 12));
                const dataScadenzaLuce = new Date(dataAttivazioneLuce);
                dataScadenzaLuce.setFullYear(dataScadenzaLuce.getFullYear() + 2);
                
                insertContrattoLuceStmt.run([
                    contrattoLuceId, clienteId, numeroContrattoLuce, pod,
                    ['Enel Energia', 'Eni Gas e Luce', 'Edison', 'A2A Energia', 'Hera Comm'][Math.floor(Math.random() * 5)],
                    dataAttivazioneLuce.toISOString().split('T')[0],
                    dataScadenzaLuce.toISOString().split('T')[0],
                    (0.08 + Math.random() * 0.04).toFixed(4) // Prezzo tra 0.08 e 0.12 €/kWh
                ]);
                
                // 3. Inserisci contratto gas
                const contrattoGasId = randomUUID();
                const pdr = generaPDR();
                const numeroContrattoGas = generaNumeroContratto('gas', i);
                const dataAttivazioneGas = new Date();
                dataAttivazioneGas.setMonth(dataAttivazioneGas.getMonth() - Math.floor(Math.random() * 12));
                const dataScadenzaGas = new Date(dataAttivazioneGas);
                dataScadenzaGas.setFullYear(dataScadenzaGas.getFullYear() + 2);
                
                insertContrattoGasStmt.run([
                    contrattoGasId, clienteId, numeroContrattoGas, pdr,
                    ['Eni Gas e Luce', 'Enel Energia', 'Edison', 'A2A Energia', 'Hera Comm'][Math.floor(Math.random() * 5)],
                    dataAttivazioneGas.toISOString().split('T')[0],
                    dataScadenzaGas.toISOString().split('T')[0],
                    (0.35 + Math.random() * 0.25).toFixed(4) // Prezzo tra 0.35 e 0.60 €/Smc
                ]);
                
                console.log(`   ✅ Cliente inserito con contratto luce (${numeroContrattoLuce}) e gas (${numeroContrattoGas})`);
            }
        });
        
        // Esegui la transazione
        transaction();
        
        console.log('\n🎉 Inserimento completato con successo!');
        console.log('📊 Riepilogo:');
        console.log('   • 10 clienti privati inseriti');
        console.log('   • 10 contratti luce attivi');
        console.log('   • 10 contratti gas attivi');
        console.log('   • Tutti i contratti hanno scadenza a 2 anni dall\'attivazione');
        
        // Verifica inserimento
        const verificaClienti = db.prepare('SELECT COUNT(*) as count FROM clienti_privati').get();
        const verificaLuce = db.prepare('SELECT COUNT(*) as count FROM contratti_luce WHERE stato = ?').get('attivo');
        const verificaGas = db.prepare('SELECT COUNT(*) as count FROM contratti_gas WHERE stato = ?').get('attivo');
        
        console.log('\n🔍 Verifica database:');
        console.log(`   • Clienti privati totali: ${verificaClienti.count}`);
        console.log(`   • Contratti luce attivi: ${verificaLuce.count}`);
        console.log(`   • Contratti gas attivi: ${verificaGas.count}`);
        
    } catch (error) {
        console.error('❌ Errore durante l\'inserimento:', error);
        throw error;
    } finally {
        db.close();
    }
}

// Esegui lo script
if (require.main === module) {
    inserisciClientiEContratti()
        .then(() => {
            console.log('\n✅ Script completato con successo!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Errore nell\'esecuzione dello script:', error);
            process.exit(1);
        });
}

module.exports = { inserisciClientiEContratti };