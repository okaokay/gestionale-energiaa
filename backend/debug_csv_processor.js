const CSVToJSONProcessor = require('./csv_to_json_processor');

// Test CSV con un solo record
const testCsv = `tipo_cliente,nome,cognome,codice_fiscale,email,telefono,indirizzo,citta,cap,provincia,data_nascita,luogo_nascita,documento_tipo,documento_numero,documento_scadenza,ragione_sociale,partita_iva,rappresentante_legale,settore_attivita,pod,tipo_contratto_luce,potenza_impegnata,tensione,data_inizio_luce,data_fine_luce,prezzo_energia,prezzo_trasporto,stato_luce,note_luce,pdr,tipo_contratto_gas,classe_prelievo,consumo_annuo_stimato,data_inizio_gas,data_fine_gas,prezzo_materia_prima,prezzo_trasporto_gas,stato_gas,note_gas
privato,Giuseppe,Verdi,VRDGPP80A01H501Z,giuseppe.verdi@email.com,3331234567,Via Roma 123,Milano,20100,MI,1980-01-01,Milano,CI,AB123456,2025-12-31,,,,,IT001E12345678901234567890123456,standard,3.0,230V,2024-01-01,,0.25,0.15,attivo,Contratto luce standard,IT001G12345678901234567890123456,standard,C1,1200,2024-01-01,,0.80,0.20,attivo,Contratto gas standard`;

console.log('🔍 Testando il processore CSV...');

const processor = new CSVToJSONProcessor();

try {
    console.log('📝 Processando CSV...');
    const result = processor.processCSV(testCsv);
    
    if (result.success) {
        console.log('✅ Successo!');
        console.log('Risultati:', result.data);
    } else {
        console.log('❌ Errore:', result.message);
    }
} catch (error) {
    console.error('💥 Errore durante il processing:', error.message);
    console.error('Stack trace:', error.stack);
} finally {
    processor.close();
}