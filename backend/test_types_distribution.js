const fs = require('fs');

function testTypesDistribution() {
    console.log('🧪 TEST DISTRIBUZIONE TIPI');
    console.log('===========================');
    
    // Leggi il file CSV
    const csvContent = fs.readFileSync('./test_contratti_corretto.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📁 File CSV: ${lines.length} righe totali`);
    
    // Estrai header
    const header = lines[0].split(',');
    console.log('📋 Header:', header[0]); // Solo il primo campo (tipo_record)
    
    // Analizza tutti i record
    const typeCounts = {};
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const record = {};
        
        header.forEach((col, index) => {
            record[col] = values[index] || '';
        });
        
        const tipo = record.tipo_record || 'unknown';
        typeCounts[tipo] = (typeCounts[tipo] || 0) + 1;
        records.push({
            index: i,
            tipo: tipo,
            nome: record.nome || record.ragione_sociale || 'N/A',
            pod: record.pod || 'N/A',
            pdr: record.pdr || 'N/A'
        });
    }
    
    console.log('\n📊 DISTRIBUZIONE TIPI:');
    console.log('======================');
    Object.entries(typeCounts).forEach(([tipo, count]) => {
        console.log(`${tipo}: ${count} record`);
    });
    
    console.log('\n📝 DETTAGLIO RECORD:');
    console.log('====================');
    records.forEach(record => {
        console.log(`Record ${record.index}: ${record.tipo} | ${record.nome} | POD:${record.pod} | PDR:${record.pdr}`);
    });
    
    console.log('\n✅ Test completato!');
    return { typeCounts, records };
}

testTypesDistribution();