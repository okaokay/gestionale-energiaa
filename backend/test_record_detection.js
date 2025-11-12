const fs = require('fs');

// Simuliamo il RecordTypeDetector
class RecordTypeDetector {
    constructor() {
        this.patterns = [
            {
                type: 'cliente_privato',
                requiredFields: ['nome', 'cognome', 'codice_fiscale'],
                optionalFields: ['email_principale', 'telefono_mobile', 'via_residenza', 'citta_residenza', 'cap_residenza', 'provincia_residenza'],
                uniqueIdentifiers: ['codice_fiscale'],
                weight: 10
            },
            {
                type: 'cliente_azienda',
                requiredFields: ['ragione_sociale', 'partita_iva'],
                optionalFields: ['email_referente', 'telefono_principale', 'via_sede_legale', 'citta_sede_legale'],
                uniqueIdentifiers: ['partita_iva'],
                weight: 10
            },
            {
                type: 'contratto_luce',
                requiredFields: ['pod', 'fornitore'],
                optionalFields: ['numero_contratto', 'data_attivazione', 'data_scadenza', 'potenza_impegnata', 'consumo_annuo_stimato'],
                uniqueIdentifiers: ['pod'],
                weight: 10
            },
            {
                type: 'contratto_gas',
                requiredFields: ['pdr', 'fornitore'],
                optionalFields: ['numero_contratto', 'data_attivazione', 'data_scadenza', 'consumo_annuo_stimato'],
                uniqueIdentifiers: ['pdr'],
                weight: 10
            }
        ];
    }

    detectRecordType(csvFields) {
        console.log('🔍 Campi CSV ricevuti:', csvFields);
        
        // Normalizza i nomi dei campi
        const normalizedFields = csvFields.map(field => 
            field.toLowerCase().trim().replace(/\s+/g, '_')
        );
        
        console.log('🔍 Campi normalizzati:', normalizedFields);

        const results = [];

        // Analizza ogni pattern
        for (const pattern of this.patterns) {
            const analysis = this.analyzePattern(normalizedFields, pattern);
            results.push(analysis);
            
            console.log(`\n📊 Analisi ${pattern.type}:`);
            console.log(`   Score: ${analysis.score}`);
            console.log(`   Campi trovati: ${analysis.matchedFields.join(', ')}`);
            console.log(`   Campi obbligatori mancanti: ${analysis.missingRequired.join(', ')}`);
        }

        // Ordina per score decrescente
        results.sort((a, b) => b.score - a.score);

        const bestMatch = results[0];
        
        // Calcola confidence
        const maxPossibleScore = bestMatch.pattern.weight * 
            (bestMatch.pattern.requiredFields.length + bestMatch.pattern.optionalFields.length);
        const confidence = Math.min(100, (bestMatch.score / maxPossibleScore) * 100);

        console.log(`\n🎯 RISULTATO FINALE:`);
        console.log(`   Tipo rilevato: ${bestMatch.pattern.type}`);
        console.log(`   Confidence: ${Math.round(confidence)}%`);
        console.log(`   Score: ${bestMatch.score}/${maxPossibleScore}`);

        return {
            type: bestMatch.pattern.type,
            confidence: Math.round(confidence),
            detectedFields: bestMatch.matchedFields,
            missingRequiredFields: bestMatch.missingRequired
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

    hasExplicitType(record) {
        // Controlla se il record ha un campo tipo_record esplicito
        return record.tipo_record || record.type || record.record_type || null;
    }
}

async function testRecordDetection() {
    console.log('🧪 TEST RILEVAMENTO TIPO RECORD');
    console.log('================================');
    
    // Leggi il file CSV
    const csvContent = fs.readFileSync('./test_contratti_corretto.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📁 File CSV: ${lines.length} righe`);
    
    // Estrai header
    const header = lines[0].split(',');
    console.log('📋 Header originale:', header);
    
    // Test rilevamento globale
    const detector = new RecordTypeDetector();
    const globalDetection = detector.detectRecordType(header);
    
    console.log('\n🌍 RILEVAMENTO GLOBALE (basato su header):');
    console.log('==========================================');
    console.log('Risultato:', globalDetection);
    
    // Test rilevamento per singoli record
    console.log('\n📝 RILEVAMENTO PER SINGOLI RECORD:');
    console.log('==================================');
    
    for (let i = 1; i < Math.min(lines.length, 4); i++) {
        const fields = lines[i].split(',');
        const record = {};
        
        header.forEach((col, index) => {
            record[col] = fields[index] || '';
        });
        
        console.log(`\n📄 Record ${i}:`);
        console.log('Dati:', record);
        
        // Controlla tipo esplicito
        const explicitType = detector.hasExplicitType(record);
        console.log(`Tipo esplicito: ${explicitType || 'nessuno'}`);
        
        // Se c'è tipo esplicito, mostra come verrebbe gestito
        if (explicitType) {
            console.log(`✅ Tipo esplicito trovato: ${explicitType}`);
        } else {
            console.log('⚠️ Nessun tipo esplicito, si userebbe rilevamento globale');
        }
    }
}

testRecordDetection().catch(console.error);