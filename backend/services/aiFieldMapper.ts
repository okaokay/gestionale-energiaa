/**
 * 🤖 AI Field Mapper
 * 
 * Mappa intelligentemente i dati forniti dall'utente ai campi creati dinamicamente.
 * Usa AI (Ollama/Groq) per capire quali dati vanno in quali campi.
 */

import axios from 'axios';
import { pool } from '../config/database';

interface FieldMapping {
    fieldName: string;
    dataKey: string;
    value: any;
    confidence: number;
}

/**
 * 🤖 Mappa intelligentemente i dati ai campi usando AI
 */
export async function mapDataToFields(
    providedData: Record<string, any>,
    fields: Array<{ fieldName: string; label: string; type: string; required: boolean }>
): Promise<FieldMapping[]> {
    console.log('\n🤖 === MAPPING INTELLIGENTE DATI → CAMPI ===');
    console.log(`📊 Dati forniti: ${Object.keys(providedData).length} chiavi`);
    console.log(`📋 Campi disponibili: ${fields.length}`);
    
    // Leggi configurazione AI dal database
    const configQuery = await pool.query(`
        SELECT chiave, valore FROM configurazioni 
        WHERE chiave IN ('ai_provider', 'groq_api_key', 'ollama_url', 'ollama_model', 'groq_model')
    `);
    
    const config: any = {};
    for (const row of configQuery.rows) {
        const r = row as any;
        config[r.chiave] = r.valore;
    }
    
    const provider = config.ai_provider || 'ollama';
    
    // Prepara il prompt per l'AI
    const prompt = `Sei un esperto di compilazione contratti energetici italiani. 

DATI FORNITI:
${Object.entries(providedData).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join('\n')}

CAMPI DA COMPILARE:
${fields.map((f, idx) => `${idx + 1}. "${f.label}" (nome: ${f.fieldName}, tipo: ${f.type}, obbligatorio: ${f.required})`).join('\n')}

COMPITO: Abbina ogni dato fornito al campo più appropriato. Restituisci SOLO un JSON array con questa struttura:
[
  { "fieldName": "nome_campo", "dataKey": "chiave_dato", "confidence": 0.95 },
  ...
]

REGOLE:
- "nome" → "nome"
- "cognome" → "cognome"
- "codice_fiscale" o "cf" → campi con "fiscale"
- "email" → campi con "email"
- "telefono" → campi con "telefono" o "cellulare"
- "indirizzo" → "indirizzo_residenza" (se non ha "_2") o "indirizzo_fornitura" (se ha "_2")
- "comune", "cap", "provincia" simile
- "pod" → "pod" o "pod3"+"pod7"
- "pdr" → "pdr"
- "data_nascita" → campi con "nascita"
- "data_attivazione" → campi con "attivazione"
- "consumo_annuo_luce" → campi con "consumo" e "kwh"
- "consumo_annuo_gas" → campi con "consumo" e "smc"
- "potenza_impegnata" → campi con "potenza"
- "fornitore_uscente" → campi con "fornitore"

RISPONDI SOLO CON IL JSON, NIENT'ALTRO.`;

    try {
        let mappingResult = '';
        
        if (provider === 'groq') {
            // Usa Groq
            const groqKey = config.groq_api_key || process.env.GROQ_API_KEY;
            const groqModel = config.groq_model || 'llama-3.3-70b-versatile';
            
            console.log(`🤖 Uso Groq (${groqModel})...`);
            
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: groqModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 2000
                },
                {
                    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                    timeout: 30000
                }
            );
            
            mappingResult = response.data.choices[0].message.content;
            
        } else {
            // Usa Ollama
            const ollamaUrl = config.ollama_url || process.env.OLLAMA_URL || 'http://185.31.67.249/api/generate';
            const ollamaModel = config.ollama_model || 'llama3:8b';
            
            console.log(`🤖 Uso Ollama (${ollamaModel})...`);
            
            const response = await axios.post(
                ollamaUrl,
                {
                    model: ollamaModel,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 2000
                    }
                },
                { timeout: 60000 }
            );
            
            mappingResult = response.data.response;
        }
        
        // Estrai JSON dalla risposta
        const jsonMatch = mappingResult.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.log('⚠️ AI non ha restituito JSON valido, uso fallback');
            return generateFallbackMapping(providedData, fields);
        }
        
        const mappings: FieldMapping[] = JSON.parse(jsonMatch[0]);
        
        // Arricchisci con i valori effettivi
        const enrichedMappings = mappings.map(m => ({
            ...m,
            value: providedData[m.dataKey]
        })).filter(m => m.value !== undefined);
        
        console.log(`✅ Mapping AI completato: ${enrichedMappings.length} abbinamenti`);
        
        return enrichedMappings;
        
    } catch (error: any) {
        console.error('❌ Errore mapping AI:', error.message);
        console.log('⚠️ Uso fallback euristico');
        return generateFallbackMapping(providedData, fields);
    }
}

/**
 * 🔄 Mapping euristico di fallback (senza AI)
 */
function generateFallbackMapping(
    providedData: Record<string, any>,
    fields: Array<{ fieldName: string; label: string; type: string }>
): FieldMapping[] {
    console.log('🔄 Generazione mapping euristico...');
    
    const mappings: FieldMapping[] = [];
    
    for (const [dataKey, value] of Object.entries(providedData)) {
        if (value === null || value === undefined || value === '') continue;
        
        const dataKeyLower = dataKey.toLowerCase();
        
        // Cerca il campo più simile
        let bestMatch: any = null;
        let bestScore = 0;
        
        for (const field of fields) {
            const fieldLower = (field.fieldName + ' ' + field.label).toLowerCase();
            let score = 0;
            
            // Matching esatto
            if (fieldLower.includes(dataKeyLower) || dataKeyLower.includes(field.fieldName.toLowerCase())) {
                score = 1.0;
            }
            // Matching parziale
            else if (
                (dataKeyLower.includes('nome') && fieldLower.includes('nome')) ||
                (dataKeyLower.includes('cognome') && fieldLower.includes('cognome')) ||
                (dataKeyLower.includes('fiscal') && fieldLower.includes('fiscal')) ||
                (dataKeyLower.includes('email') && fieldLower.includes('email')) ||
                (dataKeyLower.includes('telefon') && fieldLower.includes('telefon')) ||
                (dataKeyLower.includes('indirizzo') && fieldLower.includes('indirizzo')) ||
                (dataKeyLower.includes('comune') && fieldLower.includes('comune')) ||
                (dataKeyLower.includes('cap') && fieldLower.includes('cap')) ||
                (dataKeyLower.includes('provincia') && fieldLower.includes('prov')) ||
                (dataKeyLower.includes('pod') && fieldLower.includes('pod')) ||
                (dataKeyLower.includes('pdr') && fieldLower.includes('pdr')) ||
                (dataKeyLower.includes('consumo') && fieldLower.includes('consumo')) ||
                (dataKeyLower.includes('potenza') && fieldLower.includes('potenza')) ||
                (dataKeyLower.includes('fornitore') && fieldLower.includes('fornitore'))
            ) {
                score = 0.8;
            }
            // Matching per tipo
            else if (
                (dataKeyLower.includes('data') && field.type === 'date') ||
                (dataKeyLower.includes('email') && field.type === 'email') ||
                (dataKeyLower.includes('telefon') && field.type === 'tel')
            ) {
                score = 0.6;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = field;
            }
        }
        
        if (bestMatch && bestScore >= 0.6) {
            mappings.push({
                fieldName: bestMatch.fieldName,
                dataKey,
                value,
                confidence: bestScore
            });
            
            console.log(`   ✅ "${dataKey}" → "${bestMatch.label}" (confidence: ${bestScore.toFixed(2)})`);
        }
    }
    
    console.log(`✅ Mapping fallback completato: ${mappings.length} abbinamenti`);
    
    return mappings;
}

