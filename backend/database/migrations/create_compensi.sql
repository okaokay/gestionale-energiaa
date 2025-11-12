-- Tabella per gestire i compensi degli agenti
CREATE TABLE IF NOT EXISTS compensi (
    id TEXT PRIMARY KEY,
    agente_id TEXT NOT NULL,
    cliente_id TEXT,
    cliente_tipo TEXT CHECK(cliente_tipo IN ('privato', 'azienda')),
    contratto_id TEXT,
    contratto_tipo TEXT CHECK(contratto_tipo IN ('luce', 'gas')),
    importo DECIMAL(10, 2) NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('commissione_contratto', 'bonus', 'premio', 'altro')),
    descrizione TEXT,
    stato TEXT DEFAULT 'maturato' CHECK(stato IN ('maturato', 'pagato', 'annullato')),
    data_maturazione TEXT,
    data_pagamento TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agente_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clienti_privati(id) ON DELETE SET NULL
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_compensi_agente ON compensi(agente_id);
CREATE INDEX IF NOT EXISTS idx_compensi_cliente ON compensi(cliente_id, cliente_tipo);
CREATE INDEX IF NOT EXISTS idx_compensi_contratto ON compensi(contratto_id, contratto_tipo);
CREATE INDEX IF NOT EXISTS idx_compensi_stato ON compensi(stato);
CREATE INDEX IF NOT EXISTS idx_compensi_data_maturazione ON compensi(data_maturazione);

