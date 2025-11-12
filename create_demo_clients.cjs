const sqlite3 = require('sqlite3').verbose();
const { randomUUID } = require('crypto');

// Connessione al database
const db = new sqlite3.Database('./backend/database.sqlite');

// Dati demo per clienti privati
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
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'CD7890123',
        ente_rilascio: 'Comune di Milano',
        data_scadenza_documento: '2029-06-30',
        iban: 'IT60X0542811101000000654321'
    },
    {
        nome: 'Luca',
        cognome: 'Verdi',
        codice_fiscale: 'VRDLCU90C10L219Y',
        data_nascita: '1990-03-10',
        email_principale: 'luca.verdi@email.com',
        telefono_mobile: '3339876543',
        via_residenza: 'Via Napoli',
        civico_residenza: '5',
        cap_residenza: '80100',
        citta_residenza: 'Napoli',
        provincia_residenza: 'NA',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'EF4567890',
        ente_rilascio: 'Comune di Napoli',
        data_scadenza_documento: '2031-03-15',
        iban: 'IT60X0542811101000000987654'
    },
    {
        nome: 'Anna',
        cognome: 'Neri',
        codice_fiscale: 'NRANNA88D20H501W',
        data_nascita: '1988-04-20',
        email_principale: 'anna.neri@email.com',
        telefono_mobile: '3335432109',
        via_residenza: 'Via Torino',
        civico_residenza: '15',
        cap_residenza: '10100',
        citta_residenza: 'Torino',
        provincia_residenza: 'TO',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'GH1234567',
        ente_rilascio: 'Comune di Torino',
        data_scadenza_documento: '2032-04-25',
        iban: 'IT60X0542811101000000135792'
    },
    {
        nome: 'Francesco',
        cognome: 'Blu',
        codice_fiscale: 'BLUFNC92E30F205V',
        data_nascita: '1992-05-30',
        email_principale: 'francesco.blu@email.com',
        telefono_mobile: '3338765432',
        via_residenza: 'Via Firenze',
        civico_residenza: '8',
        cap_residenza: '50100',
        citta_residenza: 'Firenze',
        provincia_residenza: 'FI',
        tipo_documento: 'Carta d\'identità',
        numero_documento: 'IJ8901234',
        ente_rilascio: 'Comune di Firenze',
        data_scadenza_documento: '2033-05-31',
        iban: 'IT60X0542811101000000246813'
    }
];

async function insertClientiDemo() {
    console.log('🚀 Inserimento clienti demo...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const stmt = db.prepare(`
                INSERT INTO clienti_privati (
                    id, nome, cognome, codice_fiscale, data_nascita, 
                    email_principale, telefono_mobile, via_residenza, 
                    civico_residenza, cap_residenza, citta_residenza, 
                    provincia_residenza, tipo_documento, numero_documento, 
                    ente_rilascio, data_scadenza_documento, iban,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let inserted = 0;
            let errors = 0;

            clientiDemo.forEach((cliente, index) => {
                const id = randomUUID();
                const now = new Date().toISOString();
                
                stmt.run([
                    id,
                    cliente.nome,
                    cliente.cognome,
                    cliente.codice_fiscale,
                    cliente.data_nascita,
                    cliente.email_principale,
                    cliente.telefono_mobile,
                    cliente.via_residenza,
                    cliente.civico_residenza,
                    cliente.cap_residenza,
                    cliente.citta_residenza,
                    cliente.provincia_residenza,
                    cliente.tipo_documento,
                    cliente.numero_documento,
                    cliente.ente_rilascio,
                    cliente.data_scadenza_documento,
                    cliente.iban,
                    now,
                    now
                ], function(err) {
                    if (err) {
                        console.error(`❌ Errore inserimento cliente ${cliente.nome} ${cliente.cognome}:`, err.message);
                        errors++;
                    } else {
                        console.log(`✅ Cliente ${cliente.nome} ${cliente.cognome} inserito con ID: ${id}`);
                        inserted++;
                    }
                    
                    if (inserted + errors === clientiDemo.length) {
                        stmt.finalize();
                        console.log(`\n📊 Riepilogo:`);
                        console.log(`   - Clienti inseriti: ${inserted}`);
                        console.log(`   - Errori: ${errors}`);
                        resolve({ inserted, errors });
                    }
                });
            });
        });
    });
}

async function main() {
    try {
        console.log('🔍 Verifica connessione database...');
        
        // Verifica che la tabella esista
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='clienti_privati'", (err, row) => {
            if (err) {
                console.error('❌ Errore verifica tabella:', err.message);
                return;
            }
            
            if (!row) {
                console.error('❌ Tabella clienti_privati non trovata! Esegui prima le migrazioni.');
                db.close();
                return;
            }
            
            console.log('✅ Tabella clienti_privati trovata');
            
            // Inserisci i clienti demo
            insertClientiDemo()
                .then((result) => {
                    console.log('\n🎉 Inserimento completato!');
                    db.close();
                })
                .catch((error) => {
                    console.error('❌ Errore durante l\'inserimento:', error);
                    db.close();
                });
        });
        
    } catch (error) {
        console.error('❌ Errore generale:', error);
        db.close();
    }
}

main();