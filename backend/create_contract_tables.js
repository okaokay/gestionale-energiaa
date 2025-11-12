const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Script per creare le tabelle dei contratti mancanti
async function createContractTables() {
    console.log('🔧 CREAZIONE TABELLE CONTRATTI');
    console.log('===============================');
    
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Database non trovato:', dbPath);
        return;
    }
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Verifica tabelle esistenti
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const existingTables = tables.map(t => t.name);
        console.log('Tabelle esistenti:', existingTables.join(', '));
        
        // Crea tabella contratti_luce se non esiste
        if (!existingTables.includes('contratti_luce')) {
            console.log('\\n📋 Creazione tabella contratti_luce...');
            
            const createContrattiLuceSQL = `
                CREATE TABLE contratti_luce (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    
                    -- Riferimento cliente
                    cliente_id INTEGER REFERENCES clienti_privati(id) ON DELETE CASCADE,
                    tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'privato',
                    
                    -- Dati contratto
                    numero_contratto VARCHAR(100),
                    pod VARCHAR(14) UNIQUE NOT NULL,
                    fornitore VARCHAR(255) NOT NULL,
                    data_attivazione DATE NOT NULL,
                    data_scadenza DATE NOT NULL,
                    
                    -- Tipologia mercato
                    tipologia_mercato VARCHAR(50) DEFAULT 'libero',
                    
                    -- Dati tecnici
                    potenza_impegnata DECIMAL(10, 2), -- kW
                    consumo_annuo_stimato INTEGER, -- kWh
                    consumo_annuo_reale INTEGER, -- kWh
                    fascia_oraria VARCHAR(50) DEFAULT 'monoraria',
                    
                    -- Dati economici
                    prezzo_energia DECIMAL(10, 6) NOT NULL, -- €/kWh
                    costo_fisso_mensile DECIMAL(10, 2),
                    tipo_tariffa VARCHAR(50) DEFAULT 'fisso',
                    
                    -- Bonus e note
                    bonus_sociale BOOLEAN DEFAULT false,
                    note TEXT,
                    
                    -- Stato contratto
                    stato VARCHAR(50) DEFAULT 'attivo',
                    
                    -- Alert scadenza
                    alert_60gg_inviato BOOLEAN DEFAULT false,
                    alert_30gg_inviato BOOLEAN DEFAULT false,
                    alert_15gg_inviato BOOLEAN DEFAULT false,
                    alert_7gg_inviato BOOLEAN DEFAULT false,
                    
                    -- Campi tecnici
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            await new Promise((resolve, reject) => {
                db.run(createContrattiLuceSQL, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            // Crea indici per contratti_luce
            const indices = [
                'CREATE INDEX idx_contratti_luce_pod ON contratti_luce(pod)',
                'CREATE INDEX idx_contratti_luce_scadenza ON contratti_luce(data_scadenza)',
                'CREATE INDEX idx_contratti_luce_stato ON contratti_luce(stato)',
                'CREATE INDEX idx_contratti_luce_cliente ON contratti_luce(cliente_id)'
            ];
            
            for (const indexSQL of indices) {
                await new Promise((resolve, reject) => {
                    db.run(indexSQL, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            
            console.log('✅ Tabella contratti_luce creata con successo');
        } else {
            console.log('ℹ️ Tabella contratti_luce già esistente');
        }
        
        // Crea tabella contratti_gas se non esiste
        if (!existingTables.includes('contratti_gas')) {
            console.log('\\n📋 Creazione tabella contratti_gas...');
            
            const createContrattiGasSQL = `
                CREATE TABLE contratti_gas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    
                    -- Riferimento cliente
                    cliente_id INTEGER REFERENCES clienti_privati(id) ON DELETE CASCADE,
                    tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'privato',
                    
                    -- Dati contratto
                    numero_contratto VARCHAR(100),
                    pdr VARCHAR(14) UNIQUE NOT NULL,
                    fornitore VARCHAR(255) NOT NULL,
                    data_attivazione DATE NOT NULL,
                    data_scadenza DATE NOT NULL,
                    
                    -- Tipologia mercato
                    tipologia_mercato VARCHAR(50) DEFAULT 'libero',
                    
                    -- Dati tecnici
                    classe_contatore VARCHAR(10),
                    consumo_annuo_smc INTEGER, -- Standard metri cubi
                    coefficiente_c DECIMAL(6, 4), -- Conversione Smc/kWh
                    zona_tariffaria VARCHAR(50),
                    
                    -- Dati economici
                    prezzo_gas DECIMAL(10, 6) NOT NULL, -- €/Smc
                    costo_fisso_mensile DECIMAL(10, 2),
                    tipo_tariffa VARCHAR(50) DEFAULT 'fisso',
                    
                    -- Note
                    note TEXT,
                    
                    -- Stato contratto
                    stato VARCHAR(50) DEFAULT 'attivo',
                    
                    -- Alert scadenza
                    alert_60gg_inviato BOOLEAN DEFAULT false,
                    alert_30gg_inviato BOOLEAN DEFAULT false,
                    alert_15gg_inviato BOOLEAN DEFAULT false,
                    alert_7gg_inviato BOOLEAN DEFAULT false,
                    
                    -- Campi tecnici
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            await new Promise((resolve, reject) => {
                db.run(createContrattiGasSQL, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            // Crea indici per contratti_gas
            const indices = [
                'CREATE INDEX idx_contratti_gas_pdr ON contratti_gas(pdr)',
                'CREATE INDEX idx_contratti_gas_scadenza ON contratti_gas(data_scadenza)',
                'CREATE INDEX idx_contratti_gas_stato ON contratti_gas(stato)',
                'CREATE INDEX idx_contratti_gas_cliente ON contratti_gas(cliente_id)'
            ];
            
            for (const indexSQL of indices) {
                await new Promise((resolve, reject) => {
                    db.run(indexSQL, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            
            console.log('✅ Tabella contratti_gas creata con successo');
        } else {
            console.log('ℹ️ Tabella contratti_gas già esistente');
        }
        
        // Verifica finale
        console.log('\\n🔍 VERIFICA FINALE');
        console.log('------------------');
        
        const finalTables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const finalTableNames = finalTables.map(t => t.name);
        console.log('Tabelle finali:', finalTableNames.join(', '));
        
        const hasContrattiLuce = finalTableNames.includes('contratti_luce');
        const hasContrattiGas = finalTableNames.includes('contratti_gas');
        
        console.log(`contratti_luce: ${hasContrattiLuce ? '✅' : '❌'}`);
        console.log(`contratti_gas: ${hasContrattiGas ? '✅' : '❌'}`);
        
        if (hasContrattiLuce && hasContrattiGas) {
            console.log('\\n🎉 Tutte le tabelle dei contratti sono state create con successo!');
            console.log('Ora l\'import dei contratti dovrebbe funzionare correttamente.');
        } else {
            console.log('\\n❌ Alcune tabelle non sono state create correttamente.');
        }
        
    } catch (error) {
        console.error('❌ Errore durante la creazione delle tabelle:', error);
    } finally {
        db.close();
    }
}

// Esegui lo script
createContractTables().catch(console.error);