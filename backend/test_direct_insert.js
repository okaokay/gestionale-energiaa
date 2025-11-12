const { UnifiedImportService } = require('./services/unifiedImportService');
const DatabasePool = require('./config/database');

async function testDirectInsert() {
    console.log('🔍 Test Inserimento Diretto Cliente');
    console.log('===================================\n');

    try {
        // Inizializza il servizio
        const pool = new DatabasePool();
        const importService = new UnifiedImportService(pool);

        // Test record come dovrebbe essere strutturato
        const testRecord = {
            tipo_record: 'cliente_privato',
            nome: 'Mario',
            cognome: 'Rossi',
            email_principale: 'mario.rossi@test.com'
        };

        console.log('📝 Test record:', JSON.stringify(testRecord, null, 2));

        // Test 1: Record diretto
        console.log('\n🧪 Test 1: Record diretto');
        try {
            const result1 = await importService.insertClientePrivato(testRecord);
            console.log('Risultato 1:', result1);
        } catch (error) {
            console.error('Errore 1:', error.message);
        }

        // Test 2: Record con originalData
        console.log('\n🧪 Test 2: Record con originalData');
        const testRecord2 = {
            originalData: {
                nome: 'Mario',
                cognome: 'Rossi',
                email_principale: 'mario.rossi@test.com'
            }
        };
        try {
            const result2 = await importService.insertClientePrivato(testRecord2);
            console.log('Risultato 2:', result2);
        } catch (error) {
            console.error('Errore 2:', error.message);
        }

        // Test 3: Record con normalizedData
        console.log('\n🧪 Test 3: Record con normalizedData');
        const testRecord3 = {
            normalizedData: {
                nome: 'Mario',
                cognome: 'Rossi',
                email_principale: 'mario.rossi@test.com'
            }
        };
        try {
            const result3 = await importService.insertClientePrivato(testRecord3);
            console.log('Risultato 3:', result3);
        } catch (error) {
            console.error('Errore 3:', error.message);
        }

        console.log('\n✅ Test completato!');

    } catch (error) {
        console.error('\n❌ Errore durante il test:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testDirectInsert();