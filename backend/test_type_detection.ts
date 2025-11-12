import * as fs from 'fs';
import * as path from 'path';
import { RecordTypeDetector } from './services/recordTypeDetector';

async function testTypeDetection() {
    console.log('🔍 TEST RILEVAMENTO TIPO RECORD');
    console.log('===============================\n');

    try {
        const detector = new RecordTypeDetector();
        
        // Leggi il file CSV
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        console.log('📄 File CSV caricato:', csvPath);
        console.log('📊 Righe totali:', lines.length);
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('\n📋 Headers trovati:');
        headers.forEach((header, index) => {
            console.log(`  ${index + 1}. ${header}`);
        });
        
        // Test rilevamento automatico basato sui headers
        console.log('\n🤖 RILEVAMENTO AUTOMATICO BASATO SUI HEADERS:');
        console.log('----------------------------------------------');
        const autoDetection = detector.detectRecordType(headers);
        console.log('✅ Tipo rilevato:', autoDetection.type);
        console.log('📊 Confidenza:', autoDetection.confidence + '%');
        console.log('🎯 Campi rilevati:', autoDetection.detectedFields);
        console.log('❌ Campi obbligatori mancanti:', autoDetection.missingRequiredFields);
        if (autoDetection.suggestions) {
            console.log('💡 Suggerimenti:', autoDetection.suggestions);
        }
        
        // Test rilevamento esplicito per ogni riga
        console.log('\n🎯 RILEVAMENTO ESPLICITO PER OGNI RIGA:');
        console.log('--------------------------------------');
        
        for (let i = 1; i < Math.min(6, lines.length); i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const record: any = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            
            console.log(`\n📝 Riga ${i}:`);
            console.log(`   tipo_record: "${record.tipo_record}"`);
            console.log(`   nome: "${record.nome}"`);
            console.log(`   cognome: "${record.cognome}"`);
            
            const explicitType = detector.hasExplicitType(record);
            console.log(`   🎯 Tipo esplicito rilevato: ${explicitType || 'NESSUNO'}`);
            
            if (explicitType) {
                const requiredFields = detector.getRequiredFields(explicitType);
                console.log(`   📋 Campi richiesti per ${explicitType}:`, requiredFields);
                
                const missingFields = requiredFields.filter(field => !record[field] || record[field] === '');
                if (missingFields.length > 0) {
                    console.log(`   ❌ Campi mancanti:`, missingFields);
                } else {
                    console.log(`   ✅ Tutti i campi richiesti presenti`);
                }
            }
        }
        
        // Test tipi supportati
        console.log('\n📚 TIPI SUPPORTATI:');
        console.log('-------------------');
        const supportedTypes = detector.getSupportedTypes();
        supportedTypes.forEach(type => {
            const requiredFields = detector.getRequiredFields(type);
            console.log(`  - ${type}: campi richiesti [${requiredFields.join(', ')}]`);
        });
        
    } catch (error: any) {
        console.error('❌ Errore durante il test:', error.message);
        console.error(error.stack);
    }
}

testTypeDetection();