/**
 * Script per generare più dati demo
 * Crea clienti, contratti e offerte casuali per testare il gestionale
 */

import { pool } from '../config/database';
import { randomUUID } from 'crypto';

// Dati casuali realistici
const nomiM = ['Mario', 'Luca', 'Giuseppe', 'Francesco', 'Alessandro', 'Andrea', 'Marco', 'Giovanni', 'Roberto', 'Stefano'];
const nomiF = ['Maria', 'Anna', 'Francesca', 'Laura', 'Chiara', 'Valentina', 'Giulia', 'Sara', 'Alessandra', 'Elena'];
const cognomi = ['Rossi', 'Bianchi', 'Verdi', 'Romano', 'Colombo', 'Ricci', 'Ferrari', 'Esposito', 'Basso', 'Russo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini'];

const ragioni_sociali = [
    'Ristorante Da Mario', 'Bar Centrale', 'Panificio Fratelli Rossi', 'Officina Auto Sport',
    'Studio Medico Associato', 'Farmacia San Giuseppe', 'Negozio Abbigliamento Moda',
    'Supermercato Il Mercato', 'Pizzeria Napoli', 'Parrucchiere Glamour', 
    'Palestra FitLife', 'Hotel Bella Vista', 'Pasticceria Dolce Vita', 'Ferramenta Centro',
    'Agenzia Immobiliare Casa', 'Lavanderia Express', 'Gelateria Paradiso', 'Tabaccheria Centrale'
];

const codici_ateco = [
    '56.10.11', // Ristoranti
    '47.11.10', // Supermercati
    '10.71.10', // Panifici
    '45.20.10', // Officine meccaniche
    '86.21.00', // Studi medici
    '47.73.10', // Farmacie
    '47.71.10', // Abbigliamento
    '56.30.00', // Bar
    '93.11.30', // Palestre
    '55.10.00'  // Hotel
];

const citta = ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Padova', 'Trieste'];

const fornitori = ['Enel Energia', 'ENI Plenitude', 'A2A Energia', 'Edison', 'Iren Mercato', 'Acea Energia', 'Hera Comm', 'Sorgenia'];

async function seedMoreDemo() {
    console.log('🌱 Inizio generazione dati demo aggiuntivi...\n');

    let countPrivati = 0;
    let countAziende = 0;
    let countContrattiLuce = 0;
    let countContrattiGas = 0;

    // GENERA 20 CLIENTI PRIVATI
    console.log('👤 Generazione clienti privati...');
    for (let i = 0; i < 20; i++) {
        try {
            const clienteId = randomUUID();
            const genere = Math.random() > 0.5 ? 'M' : 'F';
            const nome = genere === 'M' ? nomiM[Math.floor(Math.random() * nomiM.length)] : nomiF[Math.floor(Math.random() * nomiF.length)];
            const cognome = cognomi[Math.floor(Math.random() * cognomi.length)];
            
            // Genera CF casuale
            const cf = `${cognome.substring(0, 3).toUpperCase()}${nome.substring(0, 3).toUpperCase()}${(80 + Math.floor(Math.random() * 20))}A01H501${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
            
            // Data nascita
            const year = 1950 + Math.floor(Math.random() * 50);
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            const dataNascita = `${year}-${month}-${day}`;

            const città = citta[Math.floor(Math.random() * citta.length)];

            await pool.query(`
                INSERT INTO clienti_privati (
                    id, nome, cognome, codice_fiscale, data_nascita,
                    email_principale, telefono_mobile,
                    via_residenza, citta_residenza,
                    consenso_privacy, consenso_marketing
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                clienteId,
                nome,
                cognome,
                cf,
                dataNascita,
                `${nome.toLowerCase()}.${cognome.toLowerCase()}${i}@email.it`,
                '+39 3' + Math.floor(Math.random() * 900000000 + 100000000),
                `Via ${cognomi[Math.floor(Math.random() * cognomi.length)]} ${Math.floor(Math.random() * 200) + 1}`,
                città,
                1,
                Math.random() > 0.3 ? 1 : 0
            ]);

            countPrivati++;

            // CREA CONTRATTI per ogni cliente
            const hasLuce = Math.random() > 0.2; // 80% ha contratto luce
            const hasGas = Math.random() > 0.3; // 70% ha contratto gas

            if (hasLuce) {
                const contrattoId = randomUUID();
                const pod = `IT${Math.floor(Math.random() * 900) + 100}E${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
                const giorniAScadenza = Math.floor(Math.random() * 365);
                const dataScadenza = new Date();
                dataScadenza.setDate(dataScadenza.getDate() + giorniAScadenza);
                
                await pool.query(`
                    INSERT INTO contratti_luce (
                        id, cliente_privato_id, tipo_cliente, numero_contratto, pod, fornitore,
                        data_attivazione, data_scadenza, prezzo_energia, stato
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    contrattoId,
                    clienteId,
                    'privato',
                    `LUCE-${Math.floor(Math.random() * 900000 + 100000)}`,
                    pod,
                    fornitori[Math.floor(Math.random() * fornitori.length)],
                    new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dataScadenza.toISOString().split('T')[0],
                    (Math.random() * 0.15 + 0.10).toFixed(4),
                    giorniAScadenza < 0 ? 'scaduto' : 'attivo'
                ]);
                countContrattiLuce++;
            }

            if (hasGas) {
                const contrattoId = randomUUID();
                const pdr = `IT${Math.floor(Math.random() * 900000000000000 + 100000000000000)}`;
                const giorniAScadenza = Math.floor(Math.random() * 365);
                const dataScadenza = new Date();
                dataScadenza.setDate(dataScadenza.getDate() + giorniAScadenza);
                
                await pool.query(`
                    INSERT INTO contratti_gas (
                        id, cliente_privato_id, tipo_cliente, numero_contratto, pdr, fornitore,
                        data_attivazione, data_scadenza, prezzo_gas, stato
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    contrattoId,
                    clienteId,
                    'privato',
                    `GAS-${Math.floor(Math.random() * 900000 + 100000)}`,
                    pdr,
                    fornitori[Math.floor(Math.random() * fornitori.length)],
                    new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dataScadenza.toISOString().split('T')[0],
                    (Math.random() * 0.5 + 0.3).toFixed(4),
                    giorniAScadenza < 0 ? 'scaduto' : 'attivo'
                ]);
                countContrattiGas++;
            }

            if ((i + 1) % 5 === 0) {
                console.log(`  ✅ ${i + 1} clienti privati creati...`);
            }

        } catch (error: any) {
            console.error(`❌ Errore creazione privato ${i}:`, error.message);
        }
    }

    // GENERA 15 CLIENTI AZIENDE
    console.log('\n🏢 Generazione clienti aziende...');
    for (let i = 0; i < 15; i++) {
        try {
            const clienteId = randomUUID();
            const ragioneSociale = ragioni_sociali[Math.floor(Math.random() * ragioni_sociali.length)] + ` ${i + 1}`;
            const partitaIva = `IT${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            const codiceAteco = codici_ateco[Math.floor(Math.random() * codici_ateco.length)];
            const città = citta[Math.floor(Math.random() * citta.length)];

            await pool.query(`
                INSERT INTO clienti_aziende (
                    id, ragione_sociale, partita_iva, codice_ateco,
                    email_referente, telefono_referente,
                    citta_sede_legale,
                    consenso_privacy, consenso_marketing
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                clienteId,
                ragioneSociale,
                partitaIva,
                codiceAteco,
                `info@${ragioneSociale.toLowerCase().replace(/\s/g, '')}.it`,
                '+39 0' + Math.floor(Math.random() * 900000000 + 100000000),
                città,
                1,
                Math.random() > 0.4 ? 1 : 0
            ]);

            countAziende++;

            // CREA CONTRATTI per ogni azienda (più probabilità di avere entrambi)
            const hasLuce = Math.random() > 0.1; // 90% ha contratto luce
            const hasGas = Math.random() > 0.15; // 85% ha contratto gas

            if (hasLuce) {
                const contrattoId = randomUUID();
                const pod = `IT${Math.floor(Math.random() * 900) + 100}E${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
                const giorniAScadenza = Math.floor(Math.random() * 365);
                const dataScadenza = new Date();
                dataScadenza.setDate(dataScadenza.getDate() + giorniAScadenza);
                
                await pool.query(`
                    INSERT INTO contratti_luce (
                        id, cliente_azienda_id, tipo_cliente, numero_contratto, pod, fornitore,
                        data_attivazione, data_scadenza, prezzo_energia, stato
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    contrattoId,
                    clienteId,
                    'azienda',
                    `LUCE-${Math.floor(Math.random() * 900000 + 100000)}`,
                    pod,
                    fornitori[Math.floor(Math.random() * fornitori.length)],
                    new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dataScadenza.toISOString().split('T')[0],
                    (Math.random() * 0.15 + 0.10).toFixed(4),
                    giorniAScadenza < 0 ? 'scaduto' : 'attivo'
                ]);
                countContrattiLuce++;
            }

            if (hasGas) {
                const contrattoId = randomUUID();
                const pdr = `IT${Math.floor(Math.random() * 900000000000000 + 100000000000000)}`;
                const giorniAScadenza = Math.floor(Math.random() * 365);
                const dataScadenza = new Date();
                dataScadenza.setDate(dataScadenza.getDate() + giorniAScadenza);
                
                await pool.query(`
                    INSERT INTO contratti_gas (
                        id, cliente_azienda_id, tipo_cliente, numero_contratto, pdr, fornitore,
                        data_attivazione, data_scadenza, prezzo_gas, stato
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    contrattoId,
                    clienteId,
                    'azienda',
                    `GAS-${Math.floor(Math.random() * 900000 + 100000)}`,
                    pdr,
                    fornitori[Math.floor(Math.random() * fornitori.length)],
                    new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dataScadenza.toISOString().split('T')[0],
                    (Math.random() * 0.5 + 0.3).toFixed(4),
                    giorniAScadenza < 0 ? 'scaduto' : 'attivo'
                ]);
                countContrattiGas++;
            }

            if ((i + 1) % 5 === 0) {
                console.log(`  ✅ ${i + 1} clienti aziende creati...`);
            }

        } catch (error: any) {
            console.error(`❌ Errore creazione azienda ${i}:`, error.message);
        }
    }

    console.log('\n📊 RIEPILOGO DATI DEMO GENERATI:');
    console.log(`✅ ${countPrivati} clienti privati creati`);
    console.log(`✅ ${countAziende} clienti aziende creati`);
    console.log(`✅ ${countContrattiLuce} contratti luce creati`);
    console.log(`✅ ${countContrattiGas} contratti gas creati`);
    console.log(`\n🎉 Generazione dati demo completata!`);
}

// Esegui seed
seedMoreDemo()
    .then(() => {
        console.log('✅ Script completato');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Errore durante seed:', error);
        process.exit(1);
    });

