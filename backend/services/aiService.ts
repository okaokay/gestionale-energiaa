/**
 * Servizio per integrazione Ollama AI
 * Analisi PDF offerte e matching intelligente
 */

import axios from 'axios';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import { pool } from '../config/database';
import * as dotenv from 'dotenv';

dotenv.config();

// Configurazione AI - Supporta sia Ollama che Groq
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama'; // 'ollama' o 'groq'
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://185.31.67.249';
const OLLAMA_API_URL = `${OLLAMA_BASE_URL}/api/generate`; // Endpoint corretto Ollama
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

console.log(`📡 Configurazione AI: Provider=${AI_PROVIDER}, URL=${AI_PROVIDER === 'groq' ? GROQ_API_URL : OLLAMA_API_URL}`);

interface OffertaEstratta {
    nome_offerta: string;
    fornitore: string;
    tipo_energia: string;
    prezzo_luce?: number;
    prezzo_gas?: number;
    costo_fisso_mensile_luce?: number;
    costo_fisso_mensile_gas?: number;
    durata_vincolo_mesi?: number;
    target_clienti: string;
    consumo_minimo_kwh?: number;
    consumo_massimo_kwh?: number;
    codici_ateco_ammessi?: string[];
    condizioni_particolari?: string;
}

/**
 * Estrae testo da file PDF
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text;
    } catch (error) {
        console.error('❌ Errore estrazione testo PDF:', error);
        throw new Error('Impossibile estrarre testo dal PDF');
    }
}

/**
 * Chiama AI API (Ollama o Groq) per analisi testo
 */
export async function analyzeWithOllama(prompt: string): Promise<any> {
    // Carica configurazione dal database
    const configQuery = await pool.query(`
        SELECT chiave, valore FROM configurazioni 
        WHERE chiave IN ('ai_provider', 'groq_api_key', 'ollama_url', 'ollama_model', 'groq_model')
    `);
    
    const config: any = {};
    for (const row of configQuery.rows) {
        const r = row as any;
        config[r.chiave] = r.valore;
    }
    
    const provider = config.ai_provider || AI_PROVIDER;
    
    try {
        if (provider === 'groq') {
            // USA GROQ API
            const groqKey = config.groq_api_key || GROQ_API_KEY;
            const groqModel = config.groq_model || GROQ_MODEL;
            
            if (!groqKey) {
                throw new Error('API Key Groq non configurata. Vai su Offerte & AI per configurarla.');
            }
            
            console.log(`🤖 Chiamata Groq AI (${groqModel})...`);
            
            const response = await axios.post(GROQ_API_URL, {
                model: groqModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            }, {
                timeout: 60000,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                }
            });
            
            const content = response.data?.choices?.[0]?.message?.content || '';
            
            if (!content) {
                console.warn('⚠️  Risposta Groq vuota');
                throw new Error('Risposta Groq vuota');
            }
            
            console.log('✅ Risposta Groq ricevuta (' + content.length + ' caratteri)');
            return content;
            
        } else {
            // USA OLLAMA API
            const ollamaUrl = config.ollama_url || OLLAMA_API_URL;
            const ollamaModel = config.ollama_model || OLLAMA_MODEL;
            
            console.log(`🤖 Chiamata Ollama AI su ${ollamaUrl}...`);
            
            const response = await axios.post(ollamaUrl, {
                model: ollamaModel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                    num_predict: 2000
                }
            }, {
                timeout: 120000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const content = response.data?.response || '';
            
            if (!content) {
                console.warn('⚠️  Risposta Ollama vuota, formato dati:', JSON.stringify(response.data).substring(0, 200));
                throw new Error('Risposta Ollama vuota');
            }
            
            console.log('✅ Risposta Ollama ricevuta (' + content.length + ' caratteri)');
            return content;
        }
    } catch (error: any) {
        console.error(`❌ Errore chiamata ${provider}:`, error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data).substring(0, 200));
        }
        
        if (error.code === 'ECONNREFUSED') {
            throw new Error(`Server ${provider} non raggiungibile. Verifica configurazione.`);
        }
        
        if (error.response?.status === 404) {
            throw new Error(`Endpoint ${provider} non trovato (404). Verifica configurazione in Offerte & AI.`);
        }
        
        if (error.response?.status === 401) {
            throw new Error(`API Key ${provider} non valida. Verifica configurazione.`);
        }
        
        throw new Error(`Errore ${provider} AI: ${error.message}`);
    }
}

/**
 * Analizza PDF offerta con AI
 */
export async function analyzePDFOfferta(pdfPath: string): Promise<OffertaEstratta> {
    try {
        // 1. Estrai testo dal PDF
        console.log('📄 Estrazione testo da PDF...');
        const testoCompleto = await extractTextFromPDF(pdfPath);
        
        if (!testoCompleto || testoCompleto.length < 50) {
            throw new Error('PDF vuoto o illeggibile');
        }
        
        // 2. Prepara prompt per AI
        const prompt = `
Sei un esperto analista di offerte energetiche italiane. Analizza il seguente testo estratto da un PDF commerciale 
e estrai le informazioni chiave in formato JSON valido.

TESTO OFFERTA:
${testoCompleto.substring(0, 4000)} 

ISTRUZIONI CRITICHE:
1. TIPO ENERGIA: Determina automaticamente se l'offerta riguarda:
   - "luce": solo elettricità (cerca: kWh, POD, potenza, F1/F2/F3)
   - "gas": solo gas naturale (cerca: Smc, mc, PDR, gas metano)
   - "dual": entrambe le forniture
   
2. FLESSIBILITÀ: I PDF hanno strutture diverse. Adattati al formato:
   - Cerca prezzi in formato: 0.XXX €/kWh, €/Smc, cent/kWh
   - Cerca costi fissi: €/mese, €/anno (converti in €/mese)
   - Cerca vincoli: mesi, anni (converti in mesi)
   
3. CAMPI OPZIONALI: Includi SOLO i campi presenti nel documento
   - Se un campo non è menzionato, NON inventare, usa null
   
4. TARGET: Identifica il cliente target:
   - "privati": domestici, residenziali, famiglie
   - "aziende": PMI, partite IVA, business, ATECO
   - "entrambi": se non specificato o aperto a tutti

FORMATO JSON RICHIESTO:
{
  "nome_offerta": "nome commerciale (OBBLIGATORIO)",
  "fornitore": "nome azienda fornitore (OBBLIGATORIO)",
  "tipo_energia": "luce|gas|dual (OBBLIGATORIO - determina automaticamente)",
  "prezzo_luce": numero_decimale o null,
  "prezzo_gas": numero_decimale o null,
  "costo_fisso_mensile_luce": numero_decimale o null,
  "costo_fisso_mensile_gas": numero_decimale o null,
  "durata_vincolo_mesi": numero_intero o null,
  "target_clienti": "privati|aziende|entrambi (OBBLIGATORIO)",
  "consumo_minimo_kwh": numero_intero o null,
  "consumo_massimo_kwh": numero_intero o null,
  "consumo_minimo_smc": numero_intero o null,
  "consumo_massimo_smc": numero_intero o null,
  "potenza_minima_kw": numero_decimale o null,
  "codici_ateco_ammessi": ["XX.XX.XX"] o null,
  "bonus_attivazione": numero_decimale o null,
  "condizioni_particolari": "sintesi condizioni speciali" o null
}

ESEMPI:
- "0.15 €/kWh" → "prezzo_luce": 0.15
- "120 €/anno" → "costo_fisso_mensile": 10
- "24 mesi" → "durata_vincolo_mesi": 24
- "Offerta Luce Casa" + POD + kWh → "tipo_energia": "luce"
- "Gas Naturale Pro" + Smc + PDR → "tipo_energia": "gas"

Restituisci SOLO il JSON valido, senza markdown, senza spiegazioni, senza commenti.
`;

        // 3. Chiama Ollama
        const aiResponse = await analyzeWithOllama(prompt);
        
        // 4. Parse JSON dalla risposta
        let jsonData: any;
        try {
            // Estrai JSON dalla risposta (potrebbe contenere markdown)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonData = JSON.parse(jsonMatch[0]);
            } else {
                jsonData = JSON.parse(aiResponse);
            }
        } catch (parseError) {
            console.error('❌ Errore parsing JSON da AI:', aiResponse);
            throw new Error('Risposta AI non in formato JSON valido');
        }
        
        // 5. Valida e normalizza dati estratti
        const offertaEstratta: OffertaEstratta = {
            nome_offerta: jsonData.nome_offerta || 'Offerta senza nome',
            fornitore: jsonData.fornitore || 'Fornitore sconosciuto',
            tipo_energia: ['luce', 'gas', 'dual'].includes(jsonData.tipo_energia) ? jsonData.tipo_energia : 'luce',
            prezzo_luce: parseFloat(jsonData.prezzo_luce) || undefined,
            prezzo_gas: parseFloat(jsonData.prezzo_gas) || undefined,
            costo_fisso_mensile_luce: parseFloat(jsonData.costo_fisso_mensile_luce) || undefined,
            costo_fisso_mensile_gas: parseFloat(jsonData.costo_fisso_mensile_gas) || undefined,
            durata_vincolo_mesi: parseInt(jsonData.durata_vincolo_mesi) || undefined,
            target_clienti: ['privati', 'aziende', 'entrambi'].includes(jsonData.target_clienti) ? jsonData.target_clienti : 'entrambi',
            consumo_minimo_kwh: parseInt(jsonData.consumo_minimo_kwh) || undefined,
            consumo_massimo_kwh: parseInt(jsonData.consumo_massimo_kwh) || undefined,
            codici_ateco_ammessi: Array.isArray(jsonData.codici_ateco_ammessi) ? jsonData.codici_ateco_ammessi : undefined,
            condizioni_particolari: jsonData.condizioni_particolari || undefined,
        };
        
        console.log('✅ Analisi AI completata:', offertaEstratta);
        return offertaEstratta;
        
    } catch (error: any) {
        console.error('❌ Errore analisi PDF:', error);
        throw error;
    }
}

/**
 * Calcola matching score tra cliente e offerta
 */
export function calculateMatchingScore(
    cliente: any,
    contratto: any,
    offerta: any,
    tipoCliente: 'privato' | 'azienda'
): number {
    let score = 0;
    
    // 1. Verifica hard requirements (se falliscono, score = 0)
    
    // Target clienti (gestisce sia singolare che plurale)
    const targetMatch = 
        offerta.target_clienti === tipoCliente ||
        offerta.target_clienti === (tipoCliente === 'privato' ? 'privati' : 'aziende') ||
        offerta.target_clienti === 'entrambi';
    
    if (targetMatch) {
        score += 10;
    } else {
        return 0; // Non eligibile
    }
    
    // Per aziende: verifica ATECO
    if (tipoCliente === 'azienda' && offerta.codici_ateco_ammessi) {
        const atecoAmmessi = offerta.codici_ateco_ammessi;
        const clienteAteco = cliente.codice_ateco;
        
        if (Array.isArray(atecoAmmessi) && atecoAmmessi.length > 0) {
            // Verifica match esatto o prefisso (es. "45.20" matcha "45.20.1")
            const match = atecoAmmessi.some((ateco: string) => 
                clienteAteco.startsWith(ateco) || ateco.startsWith(clienteAteco)
            );
            
            if (!match) {
                return 0; // ATECO non ammesso
            }
        }
    }
    
    // 2. Calcolo score convenienza (peso 40%)
    if (contratto && offerta) {
        const prezzoAttuale = contratto.prezzo_energia || contratto.prezzo_gas || 0;
        const prezzoNuovo = offerta.prezzo_luce || offerta.prezzo_gas || 0;
        
        if (prezzoAttuale > 0 && prezzoNuovo > 0) {
            const risparmioPercentuale = ((prezzoAttuale - prezzoNuovo) / prezzoAttuale) * 100;
            
            if (risparmioPercentuale > 20) score += 40;
            else if (risparmioPercentuale > 10) score += 30;
            else if (risparmioPercentuale > 5) score += 20;
            else if (risparmioPercentuale > 0) score += 10;
        }
    }
    
    // 3. Vicinanza scadenza (peso 15%)
    if (contratto && contratto.data_scadenza) {
        const giorniScadenza = Math.floor(
            (new Date(contratto.data_scadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (giorniScadenza <= 30) score += 15;
        else if (giorniScadenza <= 60) score += 10;
        else if (giorniScadenza <= 90) score += 5;
    }
    
    // 4. Consumo in range (peso 20%)
    if (contratto) {
        const consumo = contratto.consumo_annuo_reale || contratto.consumo_annuo_stimato || 0;
        const minConsumo = offerta.consumo_minimo_kwh || offerta.consumo_minimo_smc || 0;
        const maxConsumo = offerta.consumo_massimo_kwh || offerta.consumo_massimo_smc || 999999;
        
        if (consumo >= minConsumo && consumo <= maxConsumo) {
            score += 20;
        } else if (consumo > 0) {
            score += 5; // Consumo fuori range ma esiste
        }
    }
    
    // 5. Bonus e incentivi (peso 15%)
    if (offerta.bonus_attivazione && offerta.bonus_attivazione > 0) {
        score += 10;
    }
    if (offerta.durata_vincolo_mesi && offerta.durata_vincolo_mesi <= 12) {
        score += 5; // Preferenza vincoli brevi
    }
    
    return Math.min(score, 100); // Cap a 100
}

/**
 * Esegue matching intelligente tra offerta e clienti
 */
export async function executeMatching(offertaId: string): Promise<{ matches_created: number }> {
    try {
        console.log('🎯 Avvio matching per offerta:', offertaId);
        
        // 1. Recupera offerta
        const offertaResult = await pool.query(
            'SELECT * FROM offerte WHERE id = ?',
            [offertaId]
        );
        
        if (offertaResult.rows.length === 0) {
            throw new Error('Offerta non trovata');
        }
        
        const offerta = offertaResult.rows[0] as any;
        let matchCount = 0;
        
        // 2. Match con clienti privati (se target compatibile)
        if (offerta.target_clienti === 'privati' || offerta.target_clienti === 'entrambi') {
            // Prima recupera tutti i clienti privati
            const clientiPrivati = await pool.query(`
                SELECT * FROM clienti_privati
                WHERE (consenso_marketing IS NULL OR consenso_marketing = 1)
            `);
            
            console.log(`📊 Trovati ${clientiPrivati.rows.length} clienti privati`);
            
            for (const cliente of clientiPrivati.rows) {
                const clienteTyped = cliente as any;
                
                // Recupera il contratto appropriato in base al tipo energia dell'offerta
                let contratto: any = null;
                if (offerta.tipo_energia === 'luce') {
                    const contrattoResult = await pool.query(
                        'SELECT * FROM contratti_luce WHERE cliente_privato_id = ? AND stato = ? LIMIT 1',
                        [clienteTyped.id, 'attivo']
                    );
                    contratto = contrattoResult.rows.length > 0 ? (contrattoResult.rows[0] as any) : null;
                } else if (offerta.tipo_energia === 'gas') {
                    const contrattoResult = await pool.query(
                        'SELECT * FROM contratti_gas WHERE cliente_privato_id = ? AND stato = ? LIMIT 1',
                        [clienteTyped.id, 'attivo']
                    );
                    contratto = contrattoResult.rows.length > 0 ? (contrattoResult.rows[0] as any) : null;
                }
                
                console.log(`👤 Cliente: ${clienteTyped.nome} ${clienteTyped.cognome} | Contratto ${offerta.tipo_energia}: ${contratto ? 'TROVATO' : 'NON TROVATO'}`);
                
                if (contratto) {
                    const score = calculateMatchingScore(clienteTyped, contratto, offerta, 'privato');
                    
                    console.log(`   📈 Score matching: ${score}`);
                    
                    if (score > 0) {
                        // Calcola risparmio stimato
                        const prezzoAttuale = contratto.prezzo_energia || contratto.prezzo_gas || 0;
                        const prezzoNuovo = offerta.prezzo_luce || offerta.prezzo_gas || 0;
                        const consumo = contratto.consumo_annuo_reale || contratto.consumo_annuo_stimato || 3500; // Default 3500 kWh/Smc
                        const risparmioAnnuo = (prezzoAttuale - prezzoNuovo) * consumo;
                        const percentualeRisparmio = prezzoAttuale > 0 ? ((prezzoAttuale - prezzoNuovo) / prezzoAttuale) * 100 : 0;
                        
                        // Determina categoria lead
                        let categoria = 'cold';
                        if (score >= 80) categoria = 'hot';
                        else if (score >= 60) categoria = 'warm';
                        
                        // Inserisci match (SQLite syntax con INSERT OR IGNORE)
                        await pool.query(`
                            INSERT OR IGNORE INTO ai_matches 
                            (id, offerta_id, cliente_privato_id, tipo_cliente, contratto_luce_id, contratto_gas_id, 
                             score_matching, categoria_lead, risparmio_stimato_annuo, percentuale_risparmio, 
                             giorni_a_scadenza, dettagli_matching, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                        `, [
                            require('crypto').randomUUID(),
                            offertaId,
                            clienteTyped.id,
                            'privato',
                            offerta.tipo_energia === 'luce' ? contratto.id : null,
                            offerta.tipo_energia === 'gas' ? contratto.id : null,
                            score,
                            categoria,
                            risparmioAnnuo,
                            percentualeRisparmio,
                            Math.floor((new Date(contratto.data_scadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                            JSON.stringify({ algoritmo: 'v1', timestamp: new Date() })
                        ]);
                        
                        console.log(`   ✅ Match inserito! Risparmio: €${risparmioAnnuo.toFixed(2)}/anno`);
                        matchCount++;
                    }
                }
            }
        }
        
        // 3. Match con clienti aziende (se target compatibile)
        if (offerta.target_clienti === 'aziende' || offerta.target_clienti === 'entrambi') {
            const clientiAziende = await pool.query(`
                SELECT * FROM clienti_aziende
                WHERE (consenso_marketing IS NULL OR consenso_marketing = 1)
            `);
            
            for (const cliente of clientiAziende.rows) {
                const clienteTyped = cliente as any;
                
                // Recupera il contratto appropriato in base al tipo energia dell'offerta
                let contratto: any = null;
                if (offerta.tipo_energia === 'luce') {
                    const contrattoResult = await pool.query(
                        'SELECT * FROM contratti_luce WHERE cliente_azienda_id = ? AND stato = ? LIMIT 1',
                        [clienteTyped.id, 'attivo']
                    );
                    contratto = contrattoResult.rows.length > 0 ? (contrattoResult.rows[0] as any) : null;
                } else if (offerta.tipo_energia === 'gas') {
                    const contrattoResult = await pool.query(
                        'SELECT * FROM contratti_gas WHERE cliente_azienda_id = ? AND stato = ? LIMIT 1',
                        [clienteTyped.id, 'attivo']
                    );
                    contratto = contrattoResult.rows.length > 0 ? (contrattoResult.rows[0] as any) : null;
                }
                
                if (contratto) {
                    const score = calculateMatchingScore(clienteTyped, contratto, offerta, 'azienda');
                    
                    if (score > 0) {
                        const prezzoAttuale = contratto.prezzo_energia || contratto.prezzo_gas || 0;
                        const prezzoNuovo = offerta.prezzo_luce || offerta.prezzo_gas || 0;
                        const consumo = contratto.consumo_annuo_reale || contratto.consumo_annuo_stimato || 10000; // Default 10000 per aziende
                        const risparmioAnnuo = (prezzoAttuale - prezzoNuovo) * consumo;
                        const percentualeRisparmio = prezzoAttuale > 0 ? ((prezzoAttuale - prezzoNuovo) / prezzoAttuale) * 100 : 0;
                        
                        let categoria = 'cold';
                        if (score >= 80) categoria = 'hot';
                        else if (score >= 60) categoria = 'warm';
                        
                        await pool.query(`
                            INSERT OR IGNORE INTO ai_matches 
                            (id, offerta_id, cliente_azienda_id, tipo_cliente, contratto_luce_id, contratto_gas_id,
                             score_matching, categoria_lead, risparmio_stimato_annuo, percentuale_risparmio,
                             giorni_a_scadenza, dettagli_matching, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                        `, [
                            require('crypto').randomUUID(),
                            offertaId,
                            clienteTyped.id,
                            'azienda',
                            offerta.tipo_energia === 'luce' ? contratto.id : null,
                            offerta.tipo_energia === 'gas' ? contratto.id : null,
                            score,
                            categoria,
                            risparmioAnnuo,
                            percentualeRisparmio,
                            Math.floor((new Date(contratto.data_scadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                            JSON.stringify({ algoritmo: 'v1', timestamp: new Date() })
                        ]);
                        
                        matchCount++;
                    }
                }
            }
        }
        
        console.log(`✅ Matching completato: ${matchCount} clienti eligibili trovati`);
        return { matches_created: matchCount };
        
    } catch (error) {
        console.error('❌ Errore matching:', error);
        throw error;
    }
}

export default {
    analyzePDFOfferta,
    executeMatching,
    analyzeWithOllama,
    extractTextFromPDF,
    calculateMatchingScore,
};

