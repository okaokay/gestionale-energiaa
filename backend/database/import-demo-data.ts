import * as XLSX from 'xlsx';
import { pool } from '../config/database';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

interface ExcelRow {
    Commodity?: string;
    Procedura?: string;
    POP?: string;
    'Codice cliente'?: string;
    'Regione Sociale'?: string;
    'Codice Fiscale'?: string;
    'P.iva'?: string;
    'Data stipula'?: string;
    'Data creazione'?: string;
    'Data attivazione'?: string;
    'Utente acquisizione'?: string;
    agente?: string;
    fornitore?: string;
    Offerta?: string;
    'validità offerta'?: string;
    'tipo offerta'?: string;
    Stato?: string;
    'news letter'?: string;
    'codice ateco'?: string;
}

async function importDemoData() {
    console.log('📂 Lettura file Excel...');
    
    const excelPath = path.join(__dirname, '../../crm.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0]; // Legge il primo foglio
    const sheet = workbook.Sheets[sheetName];
    const data: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`✅ Trovate ${data.length} righe nel file Excel`);

    let countPrivati = 0;
    let countAziende = 0;
    let countContrattiLuce = 0;
    let countContrattiGas = 0;

    for (const row of data) {
        try {
            // Determina se è privato o azienda
            const hasPartitaIva = row['P.iva'] && row['P.iva'].toString().trim() !== '';
            const hasCodiceAteco = row['codice ateco'] && row['codice ateco'].toString().trim() !== '';
            const isAzienda = hasPartitaIva || hasCodiceAteco;

            let clienteId: string;

            if (isAzienda) {
                // CLIENTE AZIENDA
                clienteId = randomUUID();
                const ragioneSociale = row['Regione Sociale'] || `Azienda ${row['Codice cliente'] || 'Demo'}`;
                const partitaIva = row['P.iva'] || `IT${Math.floor(Math.random() * 10000000000)}`;
                const codiceFiscale = row['Codice Fiscale'] || partitaIva;
                const codiceAteco = row['codice ateco'] || '47.11.10';
                
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
                    '+39 02 ' + Math.floor(Math.random() * 90000000 + 10000000),
                    'Milano',
                    1,
                    row['news letter'] === 'SI' ? 1 : 0
                ]);
                
                countAziende++;
                console.log(`✅ Azienda creata: ${ragioneSociale}`);
            } else {
                // CLIENTE PRIVATO
                clienteId = randomUUID();
                const nomeCompleto = row['Regione Sociale'] || `Cliente ${row['Codice cliente'] || 'Demo'}`;
                const parti = nomeCompleto.split(' ');
                const nome = parti[0] || 'Mario';
                const cognome = parti.slice(1).join(' ') || 'Rossi';
                const codiceFiscale = row['Codice Fiscale'] || `RSSMRA${Math.floor(Math.random() * 90)}A01H501X`;
                
                // Genera data di nascita casuale
                const year = 1950 + Math.floor(Math.random() * 50);
                const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
                const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
                const dataNascita = `${year}-${month}-${day}`;

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
                    codiceFiscale,
                    dataNascita,
                    `${nome.toLowerCase()}.${cognome.toLowerCase()}@email.it`,
                    '+39 3' + Math.floor(Math.random() * 900000000 + 100000000),
                    'Via Milano 45',
                    'Roma',
                    1,
                    row['news letter'] === 'SI' ? 1 : 0
                ]);
                
                countPrivati++;
                console.log(`✅ Privato creato: ${nome} ${cognome}`);
            }

            // CREA CONTRATTO se presente
            const commodity = row.Commodity?.toString().toLowerCase();
            const fornitore = row.fornitore || 'Enel Energia';
            const stato = row.Stato?.toLowerCase() === 'attivazione' ? 'attivo' : 'in_attesa';
            
            // Data scadenza: casuale tra 30 e 365 giorni
            const giorniAScadenza = Math.floor(Math.random() * 335) + 30;
            const dataScadenza = new Date();
            dataScadenza.setDate(dataScadenza.getDate() + giorniAScadenza);
            const dataScadenzaStr = dataScadenza.toISOString().split('T')[0];

            const dataAttivazione = row['Data attivazione'] || new Date().toISOString().split('T')[0];

            if (commodity === 'gas' || !commodity) {
                // CONTRATTO GAS
                const contrattoId = randomUUID();
                const pdr = row.POP || `IT${Math.floor(Math.random() * 900000000000000 + 100000000000000)}`;
                
                await pool.query(`
                    INSERT INTO contratti_gas (
                        id, ${isAzienda ? 'cliente_azienda_id' : 'cliente_privato_id'},
                        tipo_cliente, numero_contratto, pdr, fornitore, 
                        data_attivazione, data_scadenza, prezzo_gas, stato
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    contrattoId,
                    clienteId,
                    isAzienda ? 'azienda' : 'privato',
                    `GAS-${Math.floor(Math.random() * 900000 + 100000)}`,
                    pdr,
                    fornitore,
                    dataAttivazione,
                    dataScadenzaStr,
                    (Math.random() * 0.5 + 0.3).toFixed(4),
                    stato
                ]);
                
                countContrattiGas++;
                console.log(`  → Contratto GAS creato (scadenza: ${giorniAScadenza} giorni)`);
            }

            if (commodity === 'luce' || !commodity) {
                // CONTRATTO LUCE
                const contrattoId = randomUUID();
                const pod = row.POP || `IT${Math.floor(Math.random() * 900) + 100}E${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
                
                await pool.query(`
                    INSERT INTO contratti_luce (
                        id, ${isAzienda ? 'cliente_azienda_id' : 'cliente_privato_id'},
                        tipo_cliente, numero_contratto, pod, fornitore, 
                        data_attivazione, data_scadenza, prezzo_energia, stato
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    contrattoId,
                    clienteId,
                    isAzienda ? 'azienda' : 'privato',
                    `LUCE-${Math.floor(Math.random() * 900000 + 100000)}`,
                    pod,
                    fornitore,
                    dataAttivazione,
                    dataScadenzaStr,
                    (Math.random() * 0.15 + 0.10).toFixed(4),
                    stato
                ]);
                
                countContrattiLuce++;
                console.log(`  → Contratto LUCE creato (scadenza: ${giorniAScadenza} giorni)`);
            }

        } catch (error: any) {
            console.error(`❌ Errore elaborazione riga:`, error.message);
        }
    }

    console.log('\n📊 RIEPILOGO IMPORTAZIONE:');
    console.log(`✅ ${countPrivati} clienti privati creati`);
    console.log(`✅ ${countAziende} clienti aziende creati`);
    console.log(`✅ ${countContrattiLuce} contratti luce creati`);
    console.log(`✅ ${countContrattiGas} contratti gas creati`);
    console.log(`\n🎉 Importazione completata con successo!`);
}

// Esegui importazione
importDemoData()
    .then(() => {
        console.log('✅ Script completato');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Errore durante importazione:', error);
        process.exit(1);
    });

