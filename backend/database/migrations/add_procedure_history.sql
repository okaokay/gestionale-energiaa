-- ============================================================================
-- STORICO PROCEDURE CONTRATTI
-- ============================================================================
-- Traccia tutte le modifiche alle procedure dei contratti con allegati

CREATE TABLE IF NOT EXISTS storico_procedure (
    id TEXT PRIMARY KEY,
    contratto_luce_id TEXT,
    contratto_gas_id TEXT,
    tipo_contratto TEXT NOT NULL CHECK(tipo_contratto IN ('luce', 'gas')),
    
    -- Informazioni procedura
    procedura_precedente TEXT,
    procedura_nuova TEXT NOT NULL CHECK(procedura_nuova IN (
        'Switch', 
        'Voltura', 
        'Subentro', 
        'Allaccio', 
        'Attivazione su presa morosa', 
        'Disattivazione', 
        'Voltura mortis causa'
    )),
    
    -- Dettagli modifica
    note TEXT,
    allegato_filename TEXT,
    allegato_path TEXT,
    allegato_mimetype TEXT,
    allegato_size INTEGER,
    
    -- Metadata
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contratto_luce_id) REFERENCES contratti_luce(id) ON DELETE CASCADE,
    FOREIGN KEY (contratto_gas_id) REFERENCES contratti_gas(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_storico_procedure_luce ON storico_procedure(contratto_luce_id);
CREATE INDEX IF NOT EXISTS idx_storico_procedure_gas ON storico_procedure(contratto_gas_id);
CREATE INDEX IF NOT EXISTS idx_storico_procedure_created_at ON storico_procedure(created_at DESC);

-- ============================================================================
-- VISTA UNIFICATA CONTRATTI (Gas + Luce)
-- ============================================================================
-- Unisce contratti gas e luce per una visualizzazione completa per cliente

CREATE VIEW IF NOT EXISTS vista_contratti_completa AS
SELECT 
    'luce' as tipo_fornitura,
    cl.id,
    cl.cliente_privato_id,
    cl.cliente_azienda_id,
    cl.tipo_cliente,
    cl.numero_contratto,
    cl.pod as pod_pdr,
    cl.fornitore,
    cl.commodity,
    cl.procedure,
    cl.data_stipula,
    cl.data_attivazione,
    cl.data_scadenza,
    cl.stato,
    cl.stato_procedura,
    cl.prezzo_energia as prezzo,
    cl.agente,
    cl.nome_offerta,
    cl.tipo_offerta,
    cl.note,
    cl.created_at,
    cl.created_by
FROM contratti_luce cl

UNION ALL

SELECT 
    'gas' as tipo_fornitura,
    cg.id,
    cg.cliente_privato_id,
    cg.cliente_azienda_id,
    cg.tipo_cliente,
    cg.numero_contratto,
    cg.pdr as pod_pdr,
    cg.fornitore,
    cg.commodity,
    cg.procedure,
    cg.data_stipula,
    cg.data_attivazione,
    cg.data_scadenza,
    cg.stato,
    cg.stato_procedura,
    cg.prezzo_gas as prezzo,
    cg.agente,
    cg.nome_offerta,
    cg.tipo_offerta,
    cg.note,
    cg.created_at,
    cg.created_by
FROM contratti_gas cg;


