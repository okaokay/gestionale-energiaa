/**
 * AI Field Analyzer - Analizza campi PDF usando contesto e AI
 * Usa Ollama o Groq per mappatura intelligente
 */

import axios from 'axios';
import type { FieldContext } from './pdfContextExtractor';
import { pool } from '../config/database';

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://185.31.67.249/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface AnalyzedField {
  fieldName: string;
  fieldType: string;
  label: string;  // Label descrittiva inferita dal contesto
  dataType: string; // text, email, date, number, tel, etc.
  category: string; // anagrafica, indirizzo, contratto, dati_fornitura, etc.
  description: string; // Descrizione dettagliata
  required: boolean; // Se sembra essere richiesto
  mappingSuggestion: string; // A quale dato dovrebbe essere mappato
}

/**
 * Analizza un batch di campi con AI usando il contesto
 */
export async function analyzeFieldsWithAI(
  fields: FieldContext[]
): Promise<AnalyzedField[]> {
  console.log(`🤖 Analisi AI di ${fields.length} campi con contesto...`);

  // 🔥 BATCH: Dividi in gruppi di 15 campi per evitare timeout e limiti token
  const BATCH_SIZE = 15;
  const allAnalyzed: AnalyzedField[] = [];
  
  for (let i = 0; i < fields.length; i += BATCH_SIZE) {
    const batch = fields.slice(i, Math.min(i + BATCH_SIZE, fields.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(fields.length / BATCH_SIZE);
    
    console.log(`📦 Batch ${batchNum}/${totalBatches}: analisi ${batch.length} campi...`);
    
    try {
      const batchResult = await analyzeFieldsBatch(batch);
      allAnalyzed.push(...batchResult);
      console.log(`✅ Batch ${batchNum}/${totalBatches}: ${batchResult.length} campi analizzati`);
    } catch (error: any) {
      console.error(`❌ Errore batch ${batchNum}:`, error.message);
      // Usa fallback euristico per questo batch
      console.log(`⚠️  Uso fallback euristico per batch ${batchNum}`);
      const fallbackResults = batch.map(f => generateHeuristicAnalysis([f])[0]);
      allAnalyzed.push(...fallbackResults);
    }
  }
  
  console.log(`✅ Analisi AI completata: ${allAnalyzed.length}/${fields.length} campi`);
  return allAnalyzed;
}

/**
 * Analizza un singolo batch di campi (max 15)
 */
async function analyzeFieldsBatch(fields: FieldContext[]): Promise<AnalyzedField[]> {
  // Prepara lista campi COMPATTA per risparmiare token
  const fieldsDescription = fields
    .map((f, i) => {
      const context = [
        f.contextBefore,
        f.contextAbove
      ].filter(Boolean).join(' ');
      
      return `${i + 1}. "${f.fieldName}" (${f.fieldType})${context ? ` → Context: "${context.substring(0, 100)}"` : ''}`;
    })
    .join('\n');

  const prompt = `Analizza questi ${fields.length} campi di un contratto energetico italiano. Per OGNI campo rispondi in JSON.

CAMPI:
${fieldsDescription}

REGOLE MAPPING:
- "N", "N_2" → "Numero Civico" (residenza o fornitura)
- "DATA_X", "Date_X" → "Data" + numero progressivo
- "POD" → "Codice POD Luce"
- "PDR" → "Codice PDR Gas"
- "_2" nel nome → Campo FORNITURA (non residenza)
- "Consumo kWh" → "consumo_annuo_luce"
- "Consumo smc" → "consumo_annuo_gas"
- "Fornitore Uscente" → "fornitore_uscente_luce" o "_gas"
- "Codice Fiscale" → "codice_fiscale"
- "IBAN" → "iban"

RISPOSTA (JSON puro, NO markdown):
[{"fieldName":"nome_campo_esatto","label":"Nome Chiaro","dataType":"text|email|date|tel|number|fiscalcode|pod|pdr|iban","category":"anagrafica|indirizzo_residenza|indirizzo_fornitura|dati_luce|dati_gas|contratto|pagamento|date|altro","description":"Descrizione breve","required":true|false,"mappingSuggestion":"nome_db"}]`;

  try {
    // 🔥 CARICA CONFIGURAZIONE DAL DATABASE
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
    
    let analysisResult: string;

    if (provider === 'ollama') {
      const ollamaUrl = config.ollama_url || OLLAMA_API_URL;
      const ollamaModel = config.ollama_model || OLLAMA_MODEL;
      
      const response = await axios.post(
        ollamaUrl,
        {
          model: ollamaModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 2000
          }
        },
        {
          timeout: 120000 // 2 minuti
        }
      );

      analysisResult = response.data.response;
    } else if (provider === 'groq') {
      const groqKey = config.groq_api_key || GROQ_API_KEY;
      const groqModel = config.groq_model || GROQ_MODEL;
      
      if (!groqKey) {
        throw new Error('API Key Groq non configurata. Vai su Offerte > Configurazione AI per configurarla.');
      }

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: groqModel,
          messages: [
            {
              role: 'system',
              content: 'Sei un esperto di contratti energetici italiani. Rispondi SOLO con JSON valido, senza markdown o altro testo.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 3000
        },
        {
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minuti
        }
      );

      analysisResult = response.data.choices[0].message.content;
    } else {
      throw new Error(`Provider AI non supportato: ${provider}`);
    }

    // Estrai JSON dalla risposta (rimuovi markdown se presente)
    let jsonText = analysisResult.trim();
    
    // Rimuovi backticks markdown se presenti
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Trova array JSON
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Risposta AI non contiene JSON valido:', jsonText.substring(0, 200));
      throw new Error('Risposta AI non contiene JSON valido');
    }

    const analyzed: AnalyzedField[] = JSON.parse(jsonMatch[0]);
    
    // Arricchisci con fieldType originale se mancante
    const enriched = analyzed.map(a => {
      const originalField = fields.find(f => f.fieldName === a.fieldName);
      return {
        ...a,
        fieldType: a.fieldType || originalField?.fieldType || 'PDFTextField'
      };
    });
    
    return enriched;

  } catch (error: any) {
    console.error(`❌ Errore analisi AI batch:`, error.message);
    throw error;
  }
}

/**
 * Fallback euristico se AI fallisce
 */
function generateHeuristicAnalysis(fields: FieldContext[]): AnalyzedField[] {
  return fields.map(f => {
    const name = f.fieldName.toLowerCase();
    const context = (f.contextBefore + ' ' + f.contextAbove + ' ' + f.nearbyText.join(' ')).toLowerCase();

    let label = f.contextBefore || f.contextAbove || f.fieldName;
    let dataType = 'text';
    let category = 'altro';
    let mappingSuggestion = name.replace(/[^a-z0-9_]/g, '_');
    let required = false;
    let description = `Campo ${f.fieldName}`;

    // 🔥 USA IL NOME DEL CAMPO PDF SE È DESCRITTIVO
    const originalName = f.fieldName;
    const isDescriptive = originalName.length > 5 && !originalName.match(/^(data_\d+|date\d+|undefined_\d+|group\s*\d+)$/i);
    
    if (isDescriptive) {
      // Il nome del campo è già descrittivo, usalo!
      label = originalName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      description = `Campo: ${label}`;
    }

    // Analisi euristica basata su pattern
    if (name.includes('cognome')) {
      label = 'Cognome';
      category = 'anagrafica';
      mappingSuggestion = 'cognome';
      required = true;
    } else if (name.includes('nome') && !name.includes('cognome') && !name.includes('denominazione')) {
      label = 'Nome';
      category = 'anagrafica';
      mappingSuggestion = 'nome';
      required = true;
    } else if (name.includes('codice') && name.includes('fiscale')) {
      label = 'Codice Fiscale';
      dataType = 'fiscalcode';
      category = 'anagrafica';
      mappingSuggestion = 'codice_fiscale';
      required = true;
    } else if (name.includes('data') && name.includes('attivazione')) {
      label = 'Data Presunta Attivazione';
      dataType = 'date';
      category = 'contratto';
      mappingSuggestion = 'data_attivazione';
      description = 'Data prevista per l\'attivazione della fornitura';
    } else if (name.includes('data') && name.includes('nascita')) {
      label = 'Data di Nascita';
      dataType = 'date';
      category = 'anagrafica';
      mappingSuggestion = 'data_nascita';
      required = true;
    } else if (name.match(/^data_\d+$/) || name.match(/^date\d*_/i)) {
      const num = name.replace(/[^0-9]/g, '');
      label = `Data ${num}`;
      dataType = 'date';
      category = 'date';
      mappingSuggestion = `data_${num}`;
      description = 'Data generica del contratto';
    } else if (name === 'n' || name === 'n_2') {
      label = name.includes('_2') ? 'Numero Civico Fornitura' : 'Numero Civico Residenza';
      category = name.includes('_2') ? 'indirizzo_fornitura' : 'indirizzo_residenza';
      mappingSuggestion = name.includes('_2') ? 'civico_fornitura' : 'civico_residenza';
    } else if (name.includes('fornitore') && name.includes('uscente')) {
      label = 'Fornitore Uscente';
      category = name.includes('_4') || name.includes('gas') ? 'dati_gas' : 'dati_luce';
      mappingSuggestion = 'fornitore_uscente';
      description = 'Nome del fornitore precedente';
    } else if (name.includes('consumo') && name.includes('kwh')) {
      label = 'Consumo Annuo Luce';
      dataType = 'number';
      category = 'dati_luce';
      mappingSuggestion = 'consumo_annuo_luce';
      description = 'Consumo annuo in kWh';
    } else if (name.includes('consumo') && name.includes('smc')) {
      label = 'Consumo Annuo Gas';
      dataType = 'number';
      category = 'dati_gas';
      mappingSuggestion = 'consumo_annuo_gas';
      description = 'Consumo annuo in Smc';
    } else if (name.includes('potenza')) {
      label = 'Potenza Impegnata';
      dataType = 'number';
      category = 'dati_luce';
      mappingSuggestion = 'potenza_impegnata';
      description = 'Potenza impegnata in kW';
    } else if (name.includes('pod')) {
      label = 'Codice POD';
      dataType = 'pod';
      category = 'dati_luce';
      mappingSuggestion = 'pod';
    } else if (name.includes('pdr')) {
      label = 'Codice PDR';
      dataType = 'pdr';
      category = 'dati_gas';
      mappingSuggestion = 'pdr';
    } else if (name.includes('email')) {
      label = 'Email';
      dataType = 'email';
      category = 'anagrafica';
      mappingSuggestion = 'email';
    } else if (name.includes('telefon') || name.includes('cellulare')) {
      label = 'Telefono';
      dataType = 'tel';
      category = 'anagrafica';
      mappingSuggestion = 'telefono';
    } else if (name.includes('iban')) {
      label = 'IBAN';
      dataType = 'iban';
      category = 'pagamento';
      mappingSuggestion = 'iban';
    } else if (name.includes('indirizzo')) {
      label = name.includes('_2') || name.includes('fornitura') ? 'Indirizzo Fornitura' : 'Indirizzo Residenza';
      category = name.includes('_2') ? 'indirizzo_fornitura' : 'indirizzo_residenza';
      mappingSuggestion = name.includes('_2') ? 'indirizzo_fornitura' : 'indirizzo_residenza';
    } else if (name.includes('comune')) {
      label = name.includes('_2') ? 'Comune Fornitura' : 'Comune Residenza';
      category = name.includes('_2') ? 'indirizzo_fornitura' : 'indirizzo_residenza';
      mappingSuggestion = name.includes('_2') ? 'comune_fornitura' : 'comune';
    } else if (name.includes('cap')) {
      label = name.includes('_2') ? 'CAP Fornitura' : 'CAP Residenza';
      category = name.includes('_2') ? 'indirizzo_fornitura' : 'indirizzo_residenza';
      mappingSuggestion = name.includes('_2') ? 'cap_fornitura' : 'cap';
    } else if (name.includes('prov')) {
      label = name.includes('_2') ? 'Provincia Fornitura' : 'Provincia Residenza';
      category = name.includes('_2') ? 'indirizzo_fornitura' : 'indirizzo_residenza';
      mappingSuggestion = name.includes('_2') ? 'provincia_fornitura' : 'provincia';
    }

    return {
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      label,
      dataType,
      category,
      description,
      required,
      mappingSuggestion
    };
  });
}