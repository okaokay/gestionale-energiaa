const fs = require('fs');
const path = require('path');

// Simuliamo il RecordTypeDetector in JavaScript
class RecordTypeDetector {
    constructor() {
        this.patterns = [
            // Cliente Privato
            {
                type: 'cliente_privato',
                requiredFields: ['codice_fiscale'],
                optionalFields: [
                    'nome', 'cognome', 'email_principale', 'telefono_mobile', 'telefono_fisso',
                    'data_nascita', 'luogo_nascita', 'provincia_nascita', 'sesso',
                    'indirizzo_residenza', 'citta_residenza', 'provincia_residenza', 'cap_residenza',
                    'indirizzo_domicilio', 'citta_domicilio', 'provincia_domicilio', 'cap_domicilio',
                    'professione', 'reddito_annuo', 'stato_civile', 'numero_componenti_famiglia',
                    'consenso_marketing', 'consenso_profilazione', 'note_agente', 'stato'
                ],
                uniqueIdentifiers: ['codice_fiscale', 'email_principale'],
                weight: 10
            },
            
            // Cliente Azienda
            {
                type: 'cliente_azienda',
                requiredFields: ['ragione_sociale'],
                optionalFields: [
                    'partita_iva', 'codice_fiscale_azienda', 'forma_giuridica', 'codice_ateco',
                    'settore_attivita', 'numero_dipendenti', 'fatturato_annuo',
                    'indirizzo_sede_legale', 'citta_sede_legale', 'provincia_sede_legale', 'cap_sede_legale',
                    'indirizzo_sede_operativa', 'citta_sede_operativa', 'provincia_sede_operativa', 'cap_sede_operativa',
                    'nome_referente', 'cognome_referente', 'ruolo_referente',
                    'email_referente', 'telefono_referente', 'email_amministrazione',
                    'consenso_marketing', 'note_agente', 'stato'
                ],
                uniqueIdentifiers: ['partita_iva', 'codice_fiscale_azienda'],
                weight: 10
            },
            
            // Contratto Luce
            {
                type: 'contratto_luce',
                requiredFields: ['pod'],
                optionalFields: [
                    'fornitore', 'tipo_contratto', 'potenza_impegnata', 'tensione',
                    'tipo_uso', 'regime_fiscale', 'data_attivazione', 'data_cessazione',
                    'prezzo_energia', 'prezzo_trasporto', 'altre_componenti',
                    'canone_mensile', 'deposito_cauzionale', 'modalita_pagamento',
                    'stato', 'note_contratto', 'codice_offerta'
                ],
                uniqueIdentifiers: ['pod'],
                weight: 9
            },
            
            // Contratto Gas
            {
                type: 'contratto_gas',
                requiredFields: ['pdr'],
                optionalFields: [
                    'fornitore', 'tipo_contratto', 'classe_prelievo', 'pressione_fornitura',
                    'uso_gas', 'regime_fiscale', 'data_attivazione', 'data_cessazione',
                    'prezzo_materia_prima', 'prezzo_trasporto', 'altre_componenti',
                    'canone_mensile', 'deposito_cauzionale', 'modalita_pagamento',
                    'stato', 'note_contratto', 'codice_offerta'
                ],
                uniqueIdentifiers: ['pdr'],
                weight: 9
            }
        ];
    }

    detectRecordType(csvFields) {
        // Normalizza i nomi dei campi
        const normalizedFields = csvFields.map(field => 
            field.toLowerCase().trim().replace(/\s+/g, '_')
        );

        const results = [];

        // Analizza ogni pattern
        for (const pattern of this.patterns) {
            const analysis = this.analyzePattern(normalizedFields, pattern);
            results.push(analysis);
        }

        // Ordina per score decrescente
        results.sort((a, b) => b.score - a.score);

        const bestMatch = results[0];
        
        // Calcola confidence
        const maxPossibleScore = bestMatch.pattern.weight * 
            (bestMatch.pattern.requiredFields.length + bestMatch.pattern.optionalFields.length);
        const confidence = Math.min(100, (bestMatch.score / maxPossibleScore) * 100);

        return {
            type: bestMatch.pattern.type,
            confidence: Math.round(confidence),
            detectedFields: bestMatch.matchedFields,
            missingRequiredFields: bestMatch.missingRequired,
            allResults: results.map(r => ({
                type: r.pattern.type,
                score: r.score,
                confidence: Math.round(Math.min(100, (r.score / (r.pattern.weight * (r.pattern.requiredFields.length + r.pattern.optionalFields.length))) * 100))
            }))
        };
    }

    analyzePattern(csvFields, pattern) {
        let score = 0;
        const matchedFields = [];
        const missingRequired = [];

        // Controlla campi obbligatori
        for (const requiredField of pattern.requiredFields) {
            if (csvFields.includes(requiredField)) {
                score += pattern.weight * 2;
                matchedFields.push(requiredField);
            } else {
                missingRequired.push(requiredField);
                score -= pattern.weight;
            }
        }

        // Controlla campi opzionali
        for (const optionalField of pattern.optionalFields) {
            if (csvFields.includes(optionalField)) {
                score += pattern.weight;
                matchedFields.push(optionalField);
            }
        }

        // Bonus per identificatori univoci
        for (const identifier of pattern.uniqueIdentifiers) {
            if (csvFields.includes(identifier)) {
                score += pattern.weight * 1.5;
            }
        }

        return {
            pattern,
            score: Math.max(0, score),
            matchedFields,
            missingRequired
        };
    }
}

// Test del RecordTypeDetector
async function testRecordTypeDetector() {
    console.log('🔍 Test del RecordTypeDetector');
    console.log('================================');

    const csvFile = path.join(__dirname, 'import_10_clienti_completi_super_import.csv');
    
    if (!fs.existsSync(csvFile)) {
        console.error('❌ File CSV non trovato:', csvFile);
        return;
    }

    // Leggi il CSV
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        console.error('❌ File CSV vuoto');
        return;
    }

    // Estrai l'header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('📋 Headers del CSV:', headers);
    console.log('');

    // Inizializza il detector
    const detector = new RecordTypeDetector();

    // Testa la detection sui headers
    const detectionResult = detector.detectRecordType(headers);
    
    console.log('🎯 Risultato Detection:');
    console.log('  Tipo rilevato:', detectionResult.type);
    console.log('  Confidence:', detectionResult.confidence + '%');
    console.log('  Campi rilevati:', detectionResult.detectedFields);
    console.log('  Campi obbligatori mancanti:', detectionResult.missingRequiredFields);
    console.log('');

    console.log('📊 Tutti i risultati (ordinati per score):');
    detectionResult.allResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.type}: ${result.score} punti (${result.confidence}% confidence)`);
    });
    console.log('');

    // Analizza alcuni record specifici per vedere se contengono i campi chiave
    console.log('🔍 Analisi record specifici:');
    
    // Analizza i primi 10 record per vedere i tipi
    for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
        const record = lines[i].split(',').map(r => r.trim().replace(/"/g, ''));
        const recordObj = {};
        headers.forEach((header, index) => {
            recordObj[header.toLowerCase().trim().replace(/\s+/g, '_')] = record[index] || '';
        });

        // Determina il tipo basato sui campi chiave
        let recordType = 'unknown';
        if (recordObj.codice_fiscale && recordObj.nome && recordObj.cognome) {
            recordType = 'cliente_privato';
        } else if (recordObj.ragione_sociale) {
            recordType = 'cliente_azienda';
        } else if (recordObj.pod) {
            recordType = 'contratto_luce';
        } else if (recordObj.pdr) {
            recordType = 'contratto_gas';
        }

        console.log(`  Riga ${i + 1}: ${recordType} - Campi chiave: ${Object.keys(recordObj).filter(k => recordObj[k]).slice(0, 3).join(', ')}`);
    }
}

// Esegui il test
testRecordTypeDetector().catch(console.error);