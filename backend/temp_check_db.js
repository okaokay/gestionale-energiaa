
            const { pool } = require('./config/database');
            
            async function checkDB() {
                try {
                    const clientiPrivati = await pool.query('SELECT COUNT(*) as count FROM clienti_privati');
                    const clientiAziende = await pool.query('SELECT COUNT(*) as count FROM clienti_aziende');
                    const contrattiLuce = await pool.query('SELECT COUNT(*) as count FROM contratti_luce');
                    const contrattiGas = await pool.query('SELECT COUNT(*) as count FROM contratti_gas');
                    
                    console.log('📊 clienti_privati:', clientiPrivati[0].count, 'record');
                    console.log('📊 clienti_aziende:', clientiAziende[0].count, 'record');
                    console.log('📊 contratti_luce:', contrattiLuce[0].count, 'record');
                    console.log('📊 contratti_gas:', contrattiGas[0].count, 'record');
                } catch (error) {
                    console.error('❌ Errore verifica DB:', error.message);
                }
                process.exit(0);
            }
            
            checkDB();
        