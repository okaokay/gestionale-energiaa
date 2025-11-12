const fs = require('fs');
const path = require('path');

// Simuliamo il parser reale
class UnifiedCsvParser {
    constructor() {
        this.detector = new RecordTypeDetector();
    }

    async parseFile(filePath, options = {}) {
        console.log('🔍 PARSING FILE:', filePath);
        console.log('📋 Opzioni:', options);
        
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('File CSV vuoto');
        }
        
        // Estrai header
        const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
        console.log('📋 Header:', header);
        
        // Analizza il primo record per rilevamento globale
        let globalDetection = null;
        if (options.autoDetectType && !options.forceType && lines.length > 1) {
            const firstRecord = this.parseRecord(lines[1], header);
            const availableFields = Object.keys(firstRecord).filter(key => firstRecord[key] && firstRecord[key].trim());
            
            console.log('🔍 Campi disponibili dal primo record:', availableFields);
            globalDetection = this.detector.detectRecordType(availableFields);
            console.log('🌍 Rilevamento globale:', globalDetection);
        }
        
        // Processa tutti i record
        const records = [];
        for (let i = 1; i < lines.length; i++) {
            const record = this.parseRecord(lines[i], header);
            const processedRecord = this.processRecord(record, options, globalDetection);
            records.push(processedRecord);
            
            if (i <= 3) {
                console.log(`\n📄 Record ${i}:`);
                console.log('  Dati originali:', record);
                console.log('  Record processato:', {
                    detectedType: processedRecord.detectedType,
                    confidence: processedRecord.confidence,
                    hasExplicitType: !!processedRecord.explicitType
                });
            }
        }
        
        return {
            header,
            records,
            globalDetection,
            totalRecords: records.length
        };
    }
    
    parseRecord(line, header) {
        const values = line.split(',').map(val => val.trim().replace(/"/g, ''));
        const record = {};
        
        header.forEach((col, index) => {
            record[col] = values[index] || '';
        });
        
        return record;
    }
    
    processRecord(record, options, globalDetection) {
        // Controlla tipo esplicito
        const explicitType = this.getExplicitType(record);
        
        let detectedType = null;
        let confidence = 0;
        
        if (explicitType) {
            detectedType = explicitType;
            confidence = 100;
        } else if (options.forceType) {
            detectedType = options.forceType;
            confidence = 100;
        } else if (globalDetection) {
            detectedType = globalDetection.type;
            confidence = globalDetection.confidence;
        } else {
            // Rilevamento per singolo record
            const availableFields = Object.keys(record).filter(key => record[key] && record[key].trim());
            const detection = this.detector.detectRecordType(availableFields);
            detectedType = detection.type;
            confidence = detection.confidence;
        }
        
        return {
            ...record,
            detectedType,
            confidence,
            explicitType
        };
    }
    
    getExplicitType(record) {
        return record.tipo_record || record.type || record.record_type || null;
    }
}

class RecordTypeDetector {
    constructor() {
        this.patterns = [
            {
                type: 'cliente_privato',
                requiredFields: ['nome', 'cognome', 'codice_fiscale'],
                optionalFields: ['email_principale', 'telefono_mobile'],
                weight: 10
            },
            {
                type: 'cliente_azienda', 
                requiredFields: ['ragione_sociale', 'partita_iva'],
                optionalFields: ['email_principale', 'telefono_mobile'],
                weight: 10
            },
            {
                type: 'contratto_luce',
                requiredFields: ['pod', 'fornitore'],
                optionalFields: ['numero_contratto', 'data_attivazione'],
                weight: 10
            },
            {
                type: 'contratto_gas',
                requiredFields: ['pdr', 'fornitore'],
                optionalFields: ['numero_contratto', 'data_attivazione'],
                weight: 10
            }
        ];
    }
    
    detectRecordType(fields) {
        const normalizedFields = fields.map(f => f.toLowerCase().trim());
        
        let bestMatch = null;
        let bestScore = -1;
        
        for (const pattern of this.patterns) {
            let score = 0;
            let requiredMatches = 0;
            
            // Controlla campi obbligatori
            for (const required of pattern.requiredFields) {
                if (normalizedFields.includes(required)) {
                    score += pattern.weight * 2;
                    requiredMatches++;
                } else {
                    score -= pattern.weight;
                }
            }
            
            // Controlla campi opzionali
            for (const optional of pattern.optionalFields) {
                if (normalizedFields.includes(optional)) {
                    score += pattern.weight;
                }
            }
            
            if (score > bestScore && requiredMatches === pattern.requiredFields.length) {
                bestScore = score;
                bestMatch = pattern;
            }
        }
        
        if (bestMatch) {
            const maxScore = bestMatch.weight * (bestMatch.requiredFields.length * 2 + bestMatch.optionalFields.length);
            const confidence = Math.min(100, Math.round((bestScore / maxScore) * 100));
            
            return {
                type: bestMatch.type,
                confidence: confidence
            };
        }
        
        return {
            type: 'unknown',
            confidence: 0
        };
    }
}

async function testRealParser() {
    console.log('🧪 TEST PARSER REALE');
    console.log('====================');
    
    const parser = new UnifiedCsvParser();
    
    // Test con autoDetectType = true
    console.log('\n🔍 TEST 1: autoDetectType = true');
    console.log('================================');
    
    const result1 = await parser.parseFile('./test_contratti_corretto.csv', {
        autoDetectType: true,
        skipValidation: false
    });
    
    console.log('\n📊 RISULTATI:');
    console.log(`Totale record: ${result1.totalRecords}`);
    
    // Conta i tipi rilevati
    const typeCounts = {};
    result1.records.forEach(record => {
        const type = record.detectedType || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    console.log('\n📈 Distribuzione tipi:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} record`);
    });
    
    // Test con forceType
    console.log('\n🔍 TEST 2: forceType = "contratti"');
    console.log('==================================');
    
    const result2 = await parser.parseFile('./test_contratti_corretto.csv', {
        forceType: 'contratti',
        autoDetectType: false
    });
    
    console.log('Tutti i record avranno tipo "contratti"');
    console.log(`Primo record tipo: ${result2.records[0].detectedType}`);
}

testRealParser().catch(console.error);