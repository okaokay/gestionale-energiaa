-- Schema Database Gestionale Energia
-- Creato per gestione completa agenzia luce e gas

-- Estensioni PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Per ricerca full-text

-- Tabella utenti con ruoli
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    ruolo VARCHAR(50) NOT NULL CHECK (ruolo IN ('super_admin', 'admin', 'operatore', 'visualizzatore')),
    attivo BOOLEAN DEFAULT true,
    ultimo_accesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice per ricerca email
CREATE INDEX idx_users_email ON users(email);

-- Tabella clienti privati
CREATE TABLE clienti_privati (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    codice_fiscale VARCHAR(16) UNIQUE NOT NULL,
    data_nascita DATE NOT NULL,
    email_principale VARCHAR(255) NOT NULL,
    email_secondaria VARCHAR(255),
    telefono_fisso VARCHAR(20),
    telefono_mobile VARCHAR(20) NOT NULL,
    pec VARCHAR(255),
    
    -- Indirizzo residenza
    via_residenza VARCHAR(255) NOT NULL,
    civico_residenza VARCHAR(10) NOT NULL,
    cap_residenza VARCHAR(5) NOT NULL,
    citta_residenza VARCHAR(100) NOT NULL,
    provincia_residenza VARCHAR(2) NOT NULL,
    
    -- Indirizzo fornitura (opzionale se diverso)
    via_fornitura VARCHAR(255),
    civico_fornitura VARCHAR(10),
    cap_fornitura VARCHAR(5),
    citta_fornitura VARCHAR(100),
    provincia_fornitura VARCHAR(2),
    
    -- Documento identità
    tipo_documento VARCHAR(50) NOT NULL,
    numero_documento VARCHAR(50) NOT NULL,
    ente_rilascio VARCHAR(100) NOT NULL,
    data_scadenza_documento DATE NOT NULL,
    
    -- Dati bancari
    iban VARCHAR(34),
    
    -- Preferenze comunicazione
    preferenza_email BOOLEAN DEFAULT true,
    preferenza_sms BOOLEAN DEFAULT true,
    preferenza_telefono BOOLEAN DEFAULT true,
    
    -- Note e metadati
    note TEXT,
    consenso_privacy BOOLEAN DEFAULT false,
    consenso_marketing BOOLEAN DEFAULT false,
    data_consenso TIMESTAMP,
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clienti_privati_cf ON clienti_privati(codice_fiscale);
CREATE INDEX idx_clienti_privati_email ON clienti_privati(email_principale);
CREATE INDEX idx_clienti_privati_nome_cognome ON clienti_privati(nome, cognome);

-- Tabella clienti aziende
CREATE TABLE clienti_aziende (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ragione_sociale VARCHAR(255) NOT NULL,
    partita_iva VARCHAR(11) UNIQUE NOT NULL,
    codice_fiscale VARCHAR(16) NOT NULL,
    codice_ateco VARCHAR(10) NOT NULL,
    descrizione_ateco VARCHAR(255),
    pec_aziendale VARCHAR(255) NOT NULL,
    
    -- Sede legale
    via_sede_legale VARCHAR(255) NOT NULL,
    civico_sede_legale VARCHAR(10) NOT NULL,
    cap_sede_legale VARCHAR(5) NOT NULL,
    citta_sede_legale VARCHAR(100) NOT NULL,
    provincia_sede_legale VARCHAR(2) NOT NULL,
    
    -- Sede operativa (opzionale)
    via_sede_operativa VARCHAR(255),
    civico_sede_operativa VARCHAR(10),
    cap_sede_operativa VARCHAR(5),
    citta_sede_operativa VARCHAR(100),
    provincia_sede_operativa VARCHAR(2),
    
    -- Referente aziendale
    nome_referente VARCHAR(100) NOT NULL,
    cognome_referente VARCHAR(100) NOT NULL,
    ruolo_referente VARCHAR(100),
    email_referente VARCHAR(255) NOT NULL,
    telefono_referente VARCHAR(20) NOT NULL,
    
    -- Dati aziendali
    dimensione_azienda VARCHAR(50) CHECK (dimensione_azienda IN ('micro', 'piccola', 'media', 'grande')),
    settore_merceologico VARCHAR(255),
    fatturato_annuo DECIMAL(15, 2),
    
    -- Dati bancari
    iban_aziendale VARCHAR(34),
    codice_sdi VARCHAR(7),
    
    -- Note e metadati
    note TEXT,
    consenso_privacy BOOLEAN DEFAULT false,
    consenso_marketing BOOLEAN DEFAULT false,
    data_consenso TIMESTAMP,
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clienti_aziende_piva ON clienti_aziende(partita_iva);
CREATE INDEX idx_clienti_aziende_ateco ON clienti_aziende(codice_ateco);
CREATE INDEX idx_clienti_aziende_ragione ON clienti_aziende(ragione_sociale);

-- Tabella contratti luce
CREATE TABLE contratti_luce (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Riferimento cliente
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE CASCADE,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE CASCADE,
    tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN ('privato', 'azienda')),
    
    -- Dati contratto
    numero_contratto VARCHAR(100) UNIQUE NOT NULL,
    pod VARCHAR(14) UNIQUE NOT NULL,
    fornitore VARCHAR(255) NOT NULL,
    data_attivazione DATE NOT NULL,
    data_scadenza DATE NOT NULL,
    
    -- Tipologia mercato
    tipologia_mercato VARCHAR(50) CHECK (tipologia_mercato IN ('libero', 'tutelato', 'maggior_tutela')),
    
    -- Dati tecnici
    potenza_impegnata DECIMAL(10, 2) NOT NULL, -- kW
    consumo_annuo_stimato INTEGER, -- kWh
    consumo_annuo_reale INTEGER, -- kWh
    fascia_oraria VARCHAR(50) CHECK (fascia_oraria IN ('monoraria', 'bioraria', 'trioraria')),
    
    -- Dati economici
    prezzo_energia DECIMAL(10, 6) NOT NULL, -- €/kWh
    costo_fisso_mensile DECIMAL(10, 2),
    tipo_tariffa VARCHAR(50) CHECK (tipo_tariffa IN ('fisso', 'indicizzato', 'variabile')),
    
    -- Bonus e note
    bonus_sociale BOOLEAN DEFAULT false,
    note TEXT,
    
    -- Stato contratto
    stato VARCHAR(50) DEFAULT 'attivo' CHECK (stato IN ('attivo', 'scaduto', 'cessato', 'in_rinnovo')),
    
    -- Alert scadenza
    alert_60gg_inviato BOOLEAN DEFAULT false,
    alert_30gg_inviato BOOLEAN DEFAULT false,
    alert_15gg_inviato BOOLEAN DEFAULT false,
    alert_7gg_inviato BOOLEAN DEFAULT false,
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: deve essere associato a un solo tipo di cliente
    CHECK (
        (cliente_privato_id IS NOT NULL AND cliente_azienda_id IS NULL) OR
        (cliente_privato_id IS NULL AND cliente_azienda_id IS NOT NULL)
    )
);

CREATE INDEX idx_contratti_luce_pod ON contratti_luce(pod);
CREATE INDEX idx_contratti_luce_scadenza ON contratti_luce(data_scadenza);
CREATE INDEX idx_contratti_luce_stato ON contratti_luce(stato);
CREATE INDEX idx_contratti_luce_cliente_privato ON contratti_luce(cliente_privato_id);
CREATE INDEX idx_contratti_luce_cliente_azienda ON contratti_luce(cliente_azienda_id);

-- Tabella contratti gas
CREATE TABLE contratti_gas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Riferimento cliente
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE CASCADE,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE CASCADE,
    tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN ('privato', 'azienda')),
    
    -- Dati contratto
    numero_contratto VARCHAR(100) UNIQUE NOT NULL,
    pdr VARCHAR(14) UNIQUE NOT NULL,
    fornitore VARCHAR(255) NOT NULL,
    data_attivazione DATE NOT NULL,
    data_scadenza DATE NOT NULL,
    
    -- Tipologia mercato
    tipologia_mercato VARCHAR(50) CHECK (tipologia_mercato IN ('libero', 'tutelato')),
    
    -- Dati tecnici
    classe_contatore VARCHAR(10),
    consumo_annuo_smc INTEGER, -- Standard metri cubi
    coefficiente_c DECIMAL(6, 4), -- Conversione Smc/kWh
    zona_tariffaria VARCHAR(50),
    
    -- Dati economici
    prezzo_gas DECIMAL(10, 6) NOT NULL, -- €/Smc
    costo_fisso_mensile DECIMAL(10, 2),
    tipo_tariffa VARCHAR(50) CHECK (tipo_tariffa IN ('fisso', 'indicizzato_psv', 'indicizzato_ttf', 'variabile')),
    
    -- Note
    note TEXT,
    
    -- Stato contratto
    stato VARCHAR(50) DEFAULT 'attivo' CHECK (stato IN ('attivo', 'scaduto', 'cessato', 'in_rinnovo')),
    
    -- Alert scadenza
    alert_60gg_inviato BOOLEAN DEFAULT false,
    alert_30gg_inviato BOOLEAN DEFAULT false,
    alert_15gg_inviato BOOLEAN DEFAULT false,
    alert_7gg_inviato BOOLEAN DEFAULT false,
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: deve essere associato a un solo tipo di cliente
    CHECK (
        (cliente_privato_id IS NOT NULL AND cliente_azienda_id IS NULL) OR
        (cliente_privato_id IS NULL AND cliente_azienda_id IS NOT NULL)
    )
);

CREATE INDEX idx_contratti_gas_pdr ON contratti_gas(pdr);
CREATE INDEX idx_contratti_gas_scadenza ON contratti_gas(data_scadenza);
CREATE INDEX idx_contratti_gas_stato ON contratti_gas(stato);
CREATE INDEX idx_contratti_gas_cliente_privato ON contratti_gas(cliente_privato_id);
CREATE INDEX idx_contratti_gas_cliente_azienda ON contratti_gas(cliente_azienda_id);

-- Tabella storico prezzi contratti
CREATE TABLE storico_prezzi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contratto_luce_id UUID REFERENCES contratti_luce(id) ON DELETE CASCADE,
    contratto_gas_id UUID REFERENCES contratti_gas(id) ON DELETE CASCADE,
    tipo_contratto VARCHAR(10) CHECK (tipo_contratto IN ('luce', 'gas')),
    data_variazione DATE NOT NULL,
    prezzo_precedente DECIMAL(10, 6),
    prezzo_nuovo DECIMAL(10, 6) NOT NULL,
    motivo_variazione TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella offerte (caricate da PDF)
CREATE TABLE offerte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dati offerta
    nome_offerta VARCHAR(255) NOT NULL,
    fornitore VARCHAR(255) NOT NULL,
    tipo_energia VARCHAR(20) CHECK (tipo_energia IN ('luce', 'gas', 'dual')),
    data_inizio_validita DATE NOT NULL,
    data_fine_validita DATE NOT NULL,
    
    -- Dati economici
    prezzo_luce DECIMAL(10, 6), -- €/kWh
    prezzo_gas DECIMAL(10, 6), -- €/Smc
    costo_fisso_mensile_luce DECIMAL(10, 2),
    costo_fisso_mensile_gas DECIMAL(10, 2),
    tipo_tariffa VARCHAR(50),
    durata_vincolo_mesi INTEGER,
    
    -- Requisiti eligibilità
    target_clienti VARCHAR(20) CHECK (target_clienti IN ('privati', 'aziende', 'entrambi')),
    consumo_minimo_kwh INTEGER,
    consumo_massimo_kwh INTEGER,
    consumo_minimo_smc INTEGER,
    consumo_massimo_smc INTEGER,
    potenza_minima_kw DECIMAL(10, 2),
    potenza_massima_kw DECIMAL(10, 2),
    
    -- Codici ATECO ammessi (per aziende) - array JSON
    codici_ateco_ammessi JSONB,
    codici_ateco_esclusi JSONB,
    zone_geografiche JSONB,
    
    -- Bonus e condizioni
    bonus_attivazione DECIMAL(10, 2),
    incentivi_descrizione TEXT,
    penale_recesso DECIMAL(10, 2),
    condizioni_particolari TEXT,
    
    -- File PDF originale
    pdf_filename VARCHAR(255),
    pdf_path TEXT,
    
    -- Dati analisi AI
    analizzato_da_ai BOOLEAN DEFAULT false,
    dati_ai_estratti JSONB,
    confidence_score DECIMAL(5, 2),
    
    -- Stato offerta
    stato VARCHAR(50) DEFAULT 'attiva' CHECK (stato IN ('attiva', 'scaduta', 'archiviata')),
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offerte_fornitore ON offerte(fornitore);
CREATE INDEX idx_offerte_tipo_energia ON offerte(tipo_energia);
CREATE INDEX idx_offerte_validita ON offerte(data_inizio_validita, data_fine_validita);
CREATE INDEX idx_offerte_stato ON offerte(stato);

-- Tabella matching AI (risultati comparazione)
CREATE TABLE ai_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offerta_id UUID REFERENCES offerte(id) ON DELETE CASCADE,
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE CASCADE,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE CASCADE,
    tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN ('privato', 'azienda')),
    
    -- Contratto attuale del cliente
    contratto_luce_id UUID REFERENCES contratti_luce(id) ON DELETE SET NULL,
    contratto_gas_id UUID REFERENCES contratti_gas(id) ON DELETE SET NULL,
    
    -- Dati matching
    score_matching INTEGER NOT NULL CHECK (score_matching >= 0 AND score_matching <= 100),
    categoria_lead VARCHAR(20) CHECK (categoria_lead IN ('hot', 'warm', 'cold')),
    
    -- Calcoli risparmio
    risparmio_stimato_annuo DECIMAL(10, 2),
    percentuale_risparmio DECIMAL(5, 2),
    giorni_a_scadenza INTEGER,
    
    -- Dettagli analisi
    dettagli_matching JSONB,
    
    -- Stato gestione lead
    stato_contatto VARCHAR(50) DEFAULT 'non_contattato' CHECK (stato_contatto IN ('non_contattato', 'contattato', 'interessato', 'non_interessato', 'convertito', 'in_trattativa')),
    data_primo_contatto TIMESTAMP,
    data_ultimo_contatto TIMESTAMP,
    note_venditore TEXT,
    
    -- Follow-up
    data_prossimo_followup DATE,
    
    -- Campi tecnici
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_matches_offerta ON ai_matches(offerta_id);
CREATE INDEX idx_ai_matches_score ON ai_matches(score_matching DESC);
CREATE INDEX idx_ai_matches_categoria ON ai_matches(categoria_lead);
CREATE INDEX idx_ai_matches_stato ON ai_matches(stato_contatto);

-- Tabella template email
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_template VARCHAR(100) UNIQUE NOT NULL,
    tipologia VARCHAR(50) CHECK (tipologia IN ('scadenza', 'promozionale', 'informativa', 'followup', 'benvenuto')),
    target_clienti VARCHAR(20) CHECK (target_clienti IN ('privati', 'aziende', 'entrambi')),
    oggetto VARCHAR(255) NOT NULL,
    corpo_html TEXT NOT NULL,
    corpo_text TEXT NOT NULL,
    variabili_disponibili JSONB, -- Lista variabili template: {cliente_nome}, {data_scadenza}, ecc.
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella campagne email
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_campagna VARCHAR(255) NOT NULL,
    tipologia VARCHAR(50) CHECK (tipologia IN ('scadenza', 'promozionale', 'informativa', 'followup')),
    template_id UUID REFERENCES email_templates(id),
    
    -- Targeting
    target_clienti VARCHAR(20) CHECK (target_clienti IN ('privati', 'aziende', 'entrambi')),
    filtri_targeting JSONB, -- Filtri applicati per targeting
    offerta_id UUID REFERENCES offerte(id), -- Se campagna promozionale
    
    -- Scheduling
    data_schedulata TIMESTAMP,
    data_invio_effettivo TIMESTAMP,
    stato VARCHAR(50) DEFAULT 'bozza' CHECK (stato IN ('bozza', 'schedulata', 'in_invio', 'completata', 'annullata')),
    
    -- Statistiche
    totale_destinatari INTEGER DEFAULT 0,
    invii_riusciti INTEGER DEFAULT 0,
    invii_falliti INTEGER DEFAULT 0,
    aperture_totali INTEGER DEFAULT 0,
    click_totali INTEGER DEFAULT 0,
    conversioni INTEGER DEFAULT 0,
    
    -- A/B Testing
    variante_test VARCHAR(1) CHECK (variante_test IN ('A', 'B')),
    oggetto_variante_b VARCHAR(255),
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_campaigns_stato ON email_campaigns(stato);
CREATE INDEX idx_email_campaigns_data_schedulata ON email_campaigns(data_schedulata);

-- Tabella log invii email
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE SET NULL,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE SET NULL,
    
    -- Dati invio
    email_destinatario VARCHAR(255) NOT NULL,
    oggetto VARCHAR(255) NOT NULL,
    stato_invio VARCHAR(50) CHECK (stato_invio IN ('inviato', 'fallito', 'rimbalzato', 'spam')),
    errore_invio TEXT,
    
    -- Tracking
    aperta BOOLEAN DEFAULT false,
    data_apertura TIMESTAMP,
    numero_aperture INTEGER DEFAULT 0,
    click_effettuati INTEGER DEFAULT 0,
    ultimo_click TIMESTAMP,
    
    -- Opt-out
    unsubscribed BOOLEAN DEFAULT false,
    data_unsubscribe TIMESTAMP,
    
    -- Campi tecnici
    inviato_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX idx_email_logs_stato ON email_logs(stato_invio);
CREATE INDEX idx_email_logs_aperta ON email_logs(aperta);

-- Tabella documenti
CREATE TABLE documenti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE CASCADE,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE CASCADE,
    contratto_luce_id UUID REFERENCES contratti_luce(id) ON DELETE CASCADE,
    contratto_gas_id UUID REFERENCES contratti_gas(id) ON DELETE CASCADE,
    
    -- Dati documento
    nome_file VARCHAR(255) NOT NULL,
    percorso_file TEXT NOT NULL,
    tipo_documento VARCHAR(50) CHECK (tipo_documento IN ('contratto', 'identita', 'visura', 'bolletta', 'comunicazione', 'altro')),
    mime_type VARCHAR(100),
    dimensione_bytes BIGINT,
    
    -- OCR e indicizzazione
    testo_estratto TEXT,
    indicizzato BOOLEAN DEFAULT false,
    
    -- Firma digitale
    firmato_digitalmente BOOLEAN DEFAULT false,
    data_firma TIMESTAMP,
    firmatario VARCHAR(255),
    
    -- Campi tecnici
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documenti_tipo ON documenti(tipo_documento);
CREATE INDEX idx_documenti_cliente_privato ON documenti(cliente_privato_id);
CREATE INDEX idx_documenti_cliente_azienda ON documenti(cliente_azienda_id);

-- Tabella task e reminder
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    tipo_task VARCHAR(50) CHECK (tipo_task IN ('chiamata', 'email', 'appuntamento', 'rinnovo', 'followup', 'altro')),
    priorita VARCHAR(20) CHECK (priorita IN ('bassa', 'media', 'alta', 'urgente')) DEFAULT 'media',
    
    -- Associazioni
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE CASCADE,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE CASCADE,
    contratto_luce_id UUID REFERENCES contratti_luce(id) ON DELETE CASCADE,
    contratto_gas_id UUID REFERENCES contratti_gas(id) ON DELETE CASCADE,
    ai_match_id UUID REFERENCES ai_matches(id) ON DELETE CASCADE,
    
    -- Scheduling
    data_scadenza TIMESTAMP NOT NULL,
    completato BOOLEAN DEFAULT false,
    data_completamento TIMESTAMP,
    
    -- Assegnazione
    assegnato_a UUID REFERENCES users(id),
    
    -- Note
    note_completamento TEXT,
    
    -- Campi tecnici
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_data_scadenza ON tasks(data_scadenza);
CREATE INDEX idx_tasks_completato ON tasks(completato);
CREATE INDEX idx_tasks_assegnato ON tasks(assegnato_a);

-- Tabella audit log (GDPR compliant)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    azione VARCHAR(100) NOT NULL,
    tabella_interessata VARCHAR(100),
    record_id UUID,
    dettagli_azione JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_tabella ON audit_logs(tabella_interessata, record_id);

-- Tabella consensi GDPR
CREATE TABLE consensi_gdpr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_privato_id UUID REFERENCES clienti_privati(id) ON DELETE CASCADE,
    cliente_azienda_id UUID REFERENCES clienti_aziende(id) ON DELETE CASCADE,
    tipo_consenso VARCHAR(50) NOT NULL CHECK (tipo_consenso IN ('privacy', 'marketing', 'profilazione', 'terze_parti')),
    consenso_dato BOOLEAN NOT NULL,
    data_consenso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modalita_acquisizione VARCHAR(100), -- web, telefono, email, cartaceo
    testo_informativa TEXT,
    ip_address VARCHAR(45),
    revocato BOOLEAN DEFAULT false,
    data_revoca TIMESTAMP
);

CREATE INDEX idx_consensi_cliente_privato ON consensi_gdpr(cliente_privato_id);
CREATE INDEX idx_consensi_cliente_azienda ON consensi_gdpr(cliente_azienda_id);

-- Tabella configurazioni sistema
CREATE TABLE configurazioni (
    chiave VARCHAR(100) PRIMARY KEY,
    valore TEXT,
    descrizione TEXT,
    tipo_dato VARCHAR(50) CHECK (tipo_dato IN ('string', 'number', 'boolean', 'json')),
    modificabile BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserimento configurazioni default
INSERT INTO configurazioni (chiave, valore, descrizione, tipo_dato, modificabile) VALUES
('ollama_api_url', 'http://185.31.67.249/api/chat', 'URL API Ollama per analisi AI', 'string', true),
('ollama_model', 'llama3:8b', 'Modello Ollama da utilizzare', 'string', true),
('alert_scadenza_giorni', '60,30,15,7', 'Giorni prima scadenza per alert', 'string', true),
('email_test_mode', 'false', 'Modalità test email (non invia realmente)', 'boolean', true),
('max_upload_size_mb', '10', 'Dimensione massima upload file (MB)', 'number', true);

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per updated_at su tutte le tabelle rilevanti
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clienti_privati_updated_at BEFORE UPDATE ON clienti_privati FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clienti_aziende_updated_at BEFORE UPDATE ON clienti_aziende FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contratti_luce_updated_at BEFORE UPDATE ON contratti_luce FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contratti_gas_updated_at BEFORE UPDATE ON contratti_gas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offerte_updated_at BEFORE UPDATE ON offerte FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_matches_updated_at BEFORE UPDATE ON ai_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configurazioni_updated_at BEFORE UPDATE ON configurazioni FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista per clienti con contratti in scadenza
CREATE VIEW v_clienti_contratti_in_scadenza AS
SELECT 
    'privato' as tipo_cliente,
    cp.id as cliente_id,
    cp.nome,
    cp.cognome,
    cp.email_principale as email,
    cp.telefono_mobile as telefono,
    'luce' as tipo_contratto,
    cl.id as contratto_id,
    cl.numero_contratto,
    cl.fornitore,
    cl.data_scadenza,
    cl.data_scadenza - CURRENT_DATE as giorni_a_scadenza
FROM clienti_privati cp
JOIN contratti_luce cl ON cp.id = cl.cliente_privato_id
WHERE cl.stato = 'attivo' AND cl.data_scadenza > CURRENT_DATE AND cl.data_scadenza <= CURRENT_DATE + INTERVAL '90 days'

UNION ALL

SELECT 
    'privato' as tipo_cliente,
    cp.id as cliente_id,
    cp.nome,
    cp.cognome,
    cp.email_principale as email,
    cp.telefono_mobile as telefono,
    'gas' as tipo_contratto,
    cg.id as contratto_id,
    cg.numero_contratto,
    cg.fornitore,
    cg.data_scadenza,
    cg.data_scadenza - CURRENT_DATE as giorni_a_scadenza
FROM clienti_privati cp
JOIN contratti_gas cg ON cp.id = cg.cliente_privato_id
WHERE cg.stato = 'attivo' AND cg.data_scadenza > CURRENT_DATE AND cg.data_scadenza <= CURRENT_DATE + INTERVAL '90 days'

UNION ALL

SELECT 
    'azienda' as tipo_cliente,
    ca.id as cliente_id,
    ca.ragione_sociale as nome,
    ca.nome_referente || ' ' || ca.cognome_referente as cognome,
    ca.email_referente as email,
    ca.telefono_referente as telefono,
    'luce' as tipo_contratto,
    cl.id as contratto_id,
    cl.numero_contratto,
    cl.fornitore,
    cl.data_scadenza,
    cl.data_scadenza - CURRENT_DATE as giorni_a_scadenza
FROM clienti_aziende ca
JOIN contratti_luce cl ON ca.id = cl.cliente_azienda_id
WHERE cl.stato = 'attivo' AND cl.data_scadenza > CURRENT_DATE AND cl.data_scadenza <= CURRENT_DATE + INTERVAL '90 days'

UNION ALL

SELECT 
    'azienda' as tipo_cliente,
    ca.id as cliente_id,
    ca.ragione_sociale as nome,
    ca.nome_referente || ' ' || ca.cognome_referente as cognome,
    ca.email_referente as email,
    ca.telefono_referente as telefono,
    'gas' as tipo_contratto,
    cg.id as contratto_id,
    cg.numero_contratto,
    cg.fornitore,
    cg.data_scadenza,
    cg.data_scadenza - CURRENT_DATE as giorni_a_scadenza
FROM clienti_aziende ca
JOIN contratti_gas cg ON ca.id = cg.cliente_azienda_id
WHERE cg.stato = 'attivo' AND cg.data_scadenza > CURRENT_DATE AND cg.data_scadenza <= CURRENT_DATE + INTERVAL '90 days';

-- Vista statistiche dashboard
CREATE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM clienti_privati) as totale_clienti_privati,
    (SELECT COUNT(*) FROM clienti_aziende) as totale_clienti_aziende,
    (SELECT COUNT(*) FROM contratti_luce WHERE stato = 'attivo') as contratti_luce_attivi,
    (SELECT COUNT(*) FROM contratti_gas WHERE stato = 'attivo') as contratti_gas_attivi,
    (SELECT COUNT(*) FROM contratti_luce WHERE stato = 'attivo' AND data_scadenza <= CURRENT_DATE + INTERVAL '7 days') as scadenze_luce_7gg,
    (SELECT COUNT(*) FROM contratti_gas WHERE stato = 'attivo' AND data_scadenza <= CURRENT_DATE + INTERVAL '7 days') as scadenze_gas_7gg,
    (SELECT COUNT(*) FROM contratti_luce WHERE stato = 'attivo' AND data_scadenza <= CURRENT_DATE + INTERVAL '30 days') as scadenze_luce_30gg,
    (SELECT COUNT(*) FROM contratti_gas WHERE stato = 'attivo' AND data_scadenza <= CURRENT_DATE + INTERVAL '30 days') as scadenze_gas_30gg,
    (SELECT COUNT(*) FROM offerte WHERE stato = 'attiva') as offerte_attive,
    (SELECT COUNT(*) FROM ai_matches WHERE categoria_lead = 'hot') as hot_leads,
    (SELECT COUNT(*) FROM ai_matches WHERE categoria_lead = 'warm') as warm_leads,
    (SELECT COUNT(*) FROM tasks WHERE NOT completato AND data_scadenza <= CURRENT_DATE + INTERVAL '7 days') as tasks_urgenti;

