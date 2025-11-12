/**
 * Modal COMPLETA Compilazione Manuale Contratto
 */

import { useState, useEffect } from 'react';
import { X, Save, FileText, User, Building2, Zap, Flame, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Props {
    templates: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ContractCompileManualModal({ templates, onClose, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const [selectedClientType, setSelectedClientType] = useState<'domestico' | 'business' | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [clienti, setClienti] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [searchCliente, setSearchCliente] = useState('');
    const [clientMode, setClientMode] = useState<'existing' | 'manual' | 'ai'>('existing');
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    // Carica clienti quando cambia il tipo
    useEffect(() => {
        loadClienti();
    }, [selectedClientType]);

    const loadClienti = async () => {
        try {
            const token = localStorage.getItem('token');
            const tipo = selectedClientType === 'domestico' ? 'privato' : 'azienda';
            const response = await axios.get(`/api/clienti?tipo=${tipo}&limit=200`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const clientiData = response.data.data || response.data || [];
            setClienti(Array.isArray(clientiData) ? clientiData : []);
        } catch (error) {
            console.error('Errore caricamento clienti:', error);
            setClienti([]);
        }
    };

    const handleSelectClientType = (tipo: 'domestico' | 'business') => {
        setSelectedClientType(tipo);
        setStep(2);
    };

    const handleSelectTemplate = (template: any) => {
        setSelectedTemplate(template);
        setStep(3);
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setUploadedDocs(prev => [...prev, ...files]);
    };

    const handleRemoveDoc = (index: number) => {
        setUploadedDocs(prev => prev.filter((_, i) => i !== index));
    };

    const handleAIExtraction = async () => {
        if (uploadedDocs.length === 0) {
            toast.error('Carica almeno un documento');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const formDataUpload = new FormData();
            
            uploadedDocs.forEach((file) => {
                formDataUpload.append('files', file);
            });

            const response = await axios.post(
                '/api/ai/extract-multiple',
                formDataUpload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.success && response.data.data) {
                setFormData(response.data.data);
                setClientMode('manual'); // Passa alla modalità manuale con dati pre-compilati
                toast.success('✅ Dati estratti dai documenti!');
                setStep(4);
            }
        } catch (error: any) {
            console.error('Errore estrazione AI:', error);
            toast.error('Errore durante l\'estrazione dei dati');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCliente = (cliente: any) => {
        setSelectedCliente(cliente);
        
        // Pre-compila dati dal cliente
        const preFilledData: any = {};
        
        if (selectedClientType === 'domestico') {
            preFilledData.nome_cliente = cliente.nome;
            preFilledData.cognome_cliente = cliente.cognome;
            preFilledData.codice_fiscale = cliente.codice_fiscale;
            preFilledData.indirizzo = `${cliente.via_residenza || ''} ${cliente.numero_civico_residenza || ''}`.trim();
            preFilledData.citta = cliente.citta_residenza;
            preFilledData.cap = cliente.cap_residenza;
            preFilledData.telefono = cliente.telefono_mobile || cliente.telefono_fisso;
            preFilledData.email = cliente.email_principale;
        } else {
            preFilledData.ragione_sociale = cliente.ragione_sociale;
            preFilledData.partita_iva = cliente.partita_iva;
            preFilledData.codice_fiscale = cliente.codice_fiscale;
            preFilledData.sede_legale = `${cliente.via || ''} ${cliente.numero_civico || ''}`.trim();
            preFilledData.citta = cliente.citta;
            preFilledData.cap = cliente.cap;
            preFilledData.pec = cliente.pec;
            preFilledData.telefono = cliente.telefono_referente;
            preFilledData.nome_referente = cliente.nome_referente;
            preFilledData.cognome_referente = cliente.cognome_referente;
        }
        
        setFormData(preFilledData);
        setStep(4);
    };

    // 🎲 GENERA DATI TEST COMPLETI
    const handleGeneraDatiTest = (tipo: 'luce' | 'gas' | 'dual') => {
        const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randomChoice = <T,>(arr: T[]) => arr[random(0, arr.length - 1)];
        const randomDecimal = (min: number, max: number, decimals: number = 2) => 
            (Math.random() * (max - min) + min).toFixed(decimals);
        
        const nomi = ['Mario', 'Luigi', 'Giuseppe', 'Giovanni', 'Andrea', 'Francesco', 'Marco', 'Antonio', 'Alessandro', 'Paolo'];
        const cognomi = ['Rossi', 'Bianchi', 'Verdi', 'Russo', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Bruno', 'Ricci'];
        const vie = ['Via Roma', 'Via Milano', 'Corso Italia', 'Via Garibaldi', 'Piazza Duomo', 'Via Dante', 'Via Mazzini', 'Corso Vittorio Emanuele'];
        const citta = [
            { nome: 'Milano', cap: '20100', provincia: 'MI' },
            { nome: 'Roma', cap: '00100', provincia: 'RM' },
            { nome: 'Torino', cap: '10100', provincia: 'TO' },
            { nome: 'Firenze', cap: '50100', provincia: 'FI' },
            { nome: 'Bologna', cap: '40100', provincia: 'BO' },
            { nome: 'Napoli', cap: '80100', provincia: 'NA' }
        ];
        const cittaScelta = randomChoice(citta);
        const cittaNascita = randomChoice(citta);
        
        const nome = selectedCliente?.nome || randomChoice(nomi);
        const cognome = selectedCliente?.cognome || randomChoice(cognomi);
        
        // DATA DI NASCITA realistica (tra 25 e 70 anni fa)
        const annoNascita = new Date().getFullYear() - random(25, 70);
        const meseNascita = String(random(1, 12)).padStart(2, '0');
        const giornoNascita = String(random(1, 28)).padStart(2, '0');
        const dataNascita = `${annoNascita}-${meseNascita}-${giornoNascita}`;
        
        const datiTest: any = {
            // ========== DATI ANAGRAFICI ==========
            nome: nome,
            cognome: cognome,
            // Codice fiscale: massimo 16 caratteri per il PDF ALPERIA
            codice_fiscale: selectedCliente?.codice_fiscale || `${cognome.substring(0,3).toUpperCase()}${nome.substring(0,3).toUpperCase()}${annoNascita.toString().substring(2)}${meseNascita}${giornoNascita}H501`,
            data_nascita: dataNascita,
            luogo_nascita: cittaNascita.nome,
            provincia_nascita: cittaNascita.provincia,
            
            // ========== INDIRIZZO FORNITURA (obbligatorio) ==========
            indirizzo_fornitura: `${randomChoice(vie)} ${random(1, 200)}`,
            civico_fornitura: String(random(1, 200)),
            cap_fornitura: cittaScelta.cap,
            comune_fornitura: cittaScelta.nome,
            provincia_fornitura: cittaScelta.provincia,
            
            // ========== INDIRIZZO RESIDENZA ==========
            indirizzo_residenza: `${randomChoice(vie)} ${random(1, 150)}`,
            civico_residenza: String(random(1, 150)),
            cap_residenza: cittaScelta.cap,
            comune_residenza: cittaScelta.nome,
            provincia_residenza: cittaScelta.provincia,
            
            // ========== CONTATTI ==========
            telefono: selectedCliente?.telefono_mobile || `+39 0${random(2, 9)} ${random(1000, 9999)} ${random(1000, 9999)}`,
            cellulare: `+39 3${random(20, 99)} ${random(100, 999)} ${random(1000, 9999)}`,
            email: selectedCliente?.email_principale || `${nome.toLowerCase()}.${cognome.toLowerCase()}@test.it`,
            pec: `${nome.toLowerCase()}.${cognome.toLowerCase()}@pec.it`,
            
            // ========== PAGAMENTO ==========
            iban: `IT${random(10, 99)}X${random(10000, 99999)}${random(10000, 99999)}${random(100000000, 999999999)}`,
            intestatario_conto: `${nome} ${cognome}`,
            modalita_pagamento: randomChoice(['Addebito SDD', 'Bollettino Postale', 'Bonifico Bancario']),
            
            // ========== CONSENSI ==========
            consenso_privacy: 'Sì',
            consenso_marketing: randomChoice(['Sì', 'No']),
        };
        
        // ========== DATI BUSINESS (se tipo business) ==========
        if (selectedClientType === 'business') {
            const ragSociali = ['Tech Solutions SRL', 'Green Energy SpA', 'Innovazione Digitale SRL', 'Consulenza Professionale SNC'];
            datiTest.ragione_sociale = selectedCliente?.ragione_sociale || randomChoice(ragSociali);
            datiTest.partita_iva = `${random(10000000, 99999999)}${random(100, 999)}`;
            datiTest.codice_ateco = `${random(10, 99)}.${random(10, 99)}.${random(10, 99)}`;
            datiTest.codice_sdi = String(random(1000000, 9999999)).toUpperCase();
            datiTest.pec_aziendale = `${datiTest.ragione_sociale.toLowerCase().replace(/ /g, '')}@pec.it`;
            
            // Legale rappresentante
            datiTest.nome_legale_rapp = randomChoice(nomi);
            datiTest.cognome_legale_rapp = randomChoice(cognomi);
            datiTest.cf_legale_rapp = `${datiTest.cognome_legale_rapp.substring(0,3).toUpperCase()}${datiTest.nome_legale_rapp.substring(0,3).toUpperCase()}${random(50, 80)}A01H501Z`;
            
            // Sede legale
            datiTest.indirizzo_sede_legale = `${randomChoice(vie)} ${random(1, 100)}`;
            datiTest.civico_sede_legale = String(random(1, 100));
            datiTest.cap_sede_legale = cittaScelta.cap;
            datiTest.comune_sede_legale = cittaScelta.nome;
            datiTest.provincia_sede_legale = cittaScelta.provincia;
        }
        
        // ========== DATI LUCE ==========
        if (tipo === 'luce' || tipo === 'dual') {
            // POD: massimo 11 caratteri (POD3=3 + POD7=8)
            // Formato: IT0 + 01E + 5 cifre = "IT001E12345" (11 caratteri)
            datiTest.pod = `IT0${random(10, 99)}E${random(10000, 99999)}`;
            datiTest.potenza_impegnata = `${randomDecimal(3, 6, 1)}`;
            datiTest.tensione_fornitura = randomChoice(['Monofase 230V', 'Trifase 400V']);
            datiTest.uso_luce = randomChoice(['Domestico', 'Domestico Residente', 'Altri Usi']);
            datiTest.mercato_luce = randomChoice(['Libero', 'Tutelato', 'Salvaguardia']);
            datiTest.attivita_luce = randomChoice(['Residenziale', 'Commerciale', 'Industriale']);
        }
        
        // ========== DATI GAS ==========
        if (tipo === 'gas' || tipo === 'dual') {
            datiTest.pdr = `${random(10000000000, 19999999999)}`;
            datiTest.matricola_contatore = `${random(100000, 999999)}`;
            datiTest.classe_contatore = randomChoice(['G4', 'G6', 'G10', 'G16']);
            datiTest.consumo_annuo_gas = `${random(500, 2000)}`;
            datiTest.uso_gas = randomChoice(['Cottura cibi e Acqua calda', 'Riscaldamento', 'Riscaldamento + Acqua calda', 'Uso condominiale']);
            datiTest.mercato_gas = randomChoice(['Libero', 'Tutelato']);
            datiTest.attivita_gas = randomChoice(['Residenziale', 'Commerciale', 'Industriale']);
        }
        
        // ========== FORNITORE/OFFERTA ==========
        if (selectedTemplate) {
            datiTest.nome_offerta = selectedTemplate.fornitore || 'ALPERIA';
            datiTest.fornitore = selectedTemplate.fornitore || 'ALPERIA';
        }
        
        // ========== NOTE ==========
        datiTest.note = `DATI TEST GENERATI AUTOMATICAMENTE - ${tipo.toUpperCase()} - ${new Date().toLocaleString('it-IT')}`;
        
        // Merge con dati esistenti (mantiene dati già inseriti)
        setFormData({ ...formData, ...datiTest });
        toast.success(`✅ ${Object.keys(datiTest).length} campi compilati per ${tipo.toUpperCase()}!`, { duration: 3000 });
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // 📝 Converti i nomi normalizzati ai nomi PDF originali
            const campi = getCampiForm();
            const datiPerBackend: any = {};
            
            Object.entries(formData).forEach(([nomeNormalizzato, valore]) => {
                // Trova il campo corrispondente per ottenere il nome PDF originale
                const campo = campi.find(c => c.nome === nomeNormalizzato);
                if (campo && campo.nomePDF) {
                    datiPerBackend[campo.nomePDF] = valore;
                } else {
                    // Se non trova il mapping, usa il nome normalizzato
                    datiPerBackend[nomeNormalizzato] = valore;
                }
            });
            
            const payload = {
                cliente_id: selectedCliente?.id || null, // Null se inserimento manuale/AI
                cliente_tipo: selectedClientType === 'domestico' ? 'privato' : 'azienda',
                template_id: selectedTemplate.id,
                fornitore: selectedTemplate.fornitore,
                dati_compilati: datiPerBackend // Usa i nomi PDF originali
            };

            console.log('📤 Invio dati contratto:', {
                cliente_id: payload.cliente_id,
                cliente_tipo: payload.cliente_tipo,
                template: selectedTemplate.nome,
                campi_compilati: Object.keys(formData).length
            });

            const response = await axios.post(
                '/api/contratti-compilazione/create-manual',
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('✅ Risposta server:', response.data);
            
            toast.success(
                payload.cliente_id 
                    ? 'Contratto creato con successo!' 
                    : '✅ Cliente e contratto creati con successo!'
            );
            onSuccess();
        } catch (error: any) {
            console.error('❌ Errore creazione contratto:', error);
            toast.error(error.response?.data?.message || 'Errore durante la creazione del contratto');
        } finally {
            setLoading(false);
        }
    };

    // 📋 GENERA CAMPI DINAMICI DAL PDF REALE
    const getCampiForm = () => {
        console.log('\n🔍 === GENERAZIONE CAMPI FORM ===');
        
        if (!selectedTemplate?.campi_estratti) {
            console.log('⚠️ Nessun campi_estratti trovato, uso fallback');
            return [
                { nome: 'nome', label: 'Nome', tipo: 'text', required: true },
                { nome: 'cognome', label: 'Cognome', tipo: 'text', required: true },
                { nome: 'codice_fiscale', label: 'Codice Fiscale', tipo: 'text', required: true },
                { nome: 'telefono', label: 'Telefono', tipo: 'tel', required: true },
                { nome: 'email', label: 'Email', tipo: 'email', required: true },
            ];
        }
        
        // campi_estratti potrebbe essere una stringa JSON o già un oggetto
        let campiEstratti = selectedTemplate.campi_estratti;
        if (typeof campiEstratti === 'string') {
            try {
                campiEstratti = JSON.parse(campiEstratti);
                console.log('✅ Parsed JSON campi_estratti');
            } catch (e) {
                console.error('❌ Errore parsing campi_estratti:', e);
                return [
                    { nome: 'nome', label: 'Nome', tipo: 'text', required: true },
                    { nome: 'cognome', label: 'Cognome', tipo: 'text', required: true },
                    { nome: 'codice_fiscale', label: 'Codice Fiscale', tipo: 'text', required: true },
                    { nome: 'telefono', label: 'Telefono', tipo: 'tel', required: true },
                    { nome: 'email', label: 'Email', tipo: 'email', required: true },
                ];
            }
        }
        
        // Ora campiEstratti dovrebbe essere un oggetto con { campi: {...}, totale_campi: 70, ... }
        const campiPDF = campiEstratti?.campi || {};
        
        console.log('📋 Campi PDF trovati:', Object.keys(campiPDF).length);
        console.log('📄 Primi 10 campi PDF:', Object.keys(campiPDF).slice(0, 10));
        
        if (Object.keys(campiPDF).length === 0) {
            console.log('⚠️ Nessun campo PDF trovato, uso fallback');
            return [
                { nome: 'nome', label: 'Nome', tipo: 'text', required: true },
                { nome: 'cognome', label: 'Cognome', tipo: 'text', required: true },
                { nome: 'codice_fiscale', label: 'Codice Fiscale', tipo: 'text', required: true },
                { nome: 'telefono', label: 'Telefono', tipo: 'tel', required: true },
                { nome: 'email', label: 'Email', tipo: 'email', required: true },
            ];
        }
        const campiForm: any[] = [];
        const nomiUsati = new Set<string>(); // Per evitare duplicati
        
        // Conversione intelligente dei campi PDF in campi form
        Object.entries(campiPDF).forEach(([nomeCampo, info]: any, index) => {
            // Salta campi di selezione (checkbox/radio) - gestiti separatamente
            if (info.tipo === 'PDFCheckBox' || info.tipo === 'PDFRadioGroup') {
                return;
            }
            
            // 🤖 USA I DATI ANALIZZATI DALL'AI (se disponibili)
            const nomeDescrittivo = info.nome_descrittivo || nomeCampo;
            const categoriaAI = info.categoria || null;
            const descrizioneAI = info.descrizione || '';
            
            // 🔧 NORMALIZZAZIONE MIGLIORATA del nome campo
            let nomeNormalizzato = nomeCampo
                .toLowerCase()
                .replace(/\s+/g, '_')           // Spazi -> underscore
                .replace(/[àáâãäå]/g, 'a')      // Caratteri accentati
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôõö]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[^a-z0-9_]/g, '');    // Rimuovi caratteri speciali
            
            // Se il nome normalizzato è vuoto o troppo corto (< 2 char), usa un fallback descrittivo
            if (!nomeNormalizzato || nomeNormalizzato.length < 2) {
                nomeNormalizzato = `campo_${index + 1}`;
            }
            
            // Se il nome inizia con un numero, aggiungi un prefisso
            if (/^\d/.test(nomeNormalizzato)) {
                nomeNormalizzato = `field_${nomeNormalizzato}`;
            }
            
            // 🎯 DETERMINA TIPO DI INPUT E DESCRIZIONE INTELLIGENTE
            let tipoInput = 'text';
            const maxLen = info.maxLength || 999;
            let descrizione = ''; // Descrizione aggiuntiva per campi ambigui
            
            // Riconoscimento tipo campo
            const nomeLC = nomeCampo.toLowerCase();
            if (nomeLC.includes('email') || nomeLC.includes('e-mail') || nomeLC.includes('pec')) {
                tipoInput = 'email';
            } else if (nomeLC.includes('telefon') || nomeLC.includes('cellul')) {
                tipoInput = 'tel';
            } else if (nomeLC.includes('data') || nomeLC.includes('nato') || nomeLC.includes('date') || nomeLC.includes('gg/mm')) {
                tipoInput = 'date';
            } else if (nomeLC.includes('note') || maxLen > 100) {
                tipoInput = 'textarea';
            }
            
            // 💡 USA DESCRIZIONE AI o FALLBACK INTELLIGENTE
            if (!descrizioneAI || descrizioneAI.trim() === '') {
                // Fallback: genera descrizione manualmente solo se AI non l'ha fornita
                if (nomeCampo.endsWith('_2')) {
                    // Campi con suffisso _2 → probabilmente sono per il luogo di fornitura o cointestatario
                    if (nomeLC.includes('cognome') || nomeLC.includes('nome')) {
                        descrizione = '(Cointestatario/Contitolare)';
                    } else if (nomeLC.includes('indirizzo') || nomeLC.includes('cap') || nomeLC.includes('comune') || nomeLC.includes('prov') || nomeLC.includes('n_')) {
                        descrizione = '(Indirizzo Fornitura)';
                    } else if (nomeLC.includes('pod') || nomeLC.includes('remi') || nomeLC.includes('potenza') || nomeLC.includes('fornitore')) {
                        descrizione = '(Dati Fornitura)';
                    } else if (nomeLC.includes('offerta') || nomeLC.includes('nome_2')) {
                        descrizione = '(Offerta Luce/Gas)';
                    }
                } else if (nomeCampo.endsWith('_3') || nomeCampo.endsWith('_4')) {
                    descrizione = '(Campo Aggiuntivo)';
                }
                
                // Campi DATA generici
                if (nomeCampo.startsWith('DATA_') || nomeCampo.includes('Date') && !descrizione) {
                    descrizione = '(Data - formato gg/mm/aaaa)';
                }
                
                // Campi undefined
                if (nomeNormalizzato.startsWith('campo_') || nomeNormalizzato.includes('undefined')) {
                    descrizione = `(Campo generico ${index + 1} - verificare sul PDF)`;
                }
            } else {
                // Usa la descrizione fornita dall'AI
                descrizione = descrizioneAI;
            }
            
            // Determina se è un campo probabilmente obbligatorio
            const required = 
                nomeLC.includes('nome') && !nomeLC.includes('_2') ||
                nomeLC.includes('cognome') && !nomeLC.includes('_2') ||
                nomeLC.includes('codice fiscale') ||
                nomeLC.includes('indirizzo') && !nomeLC.includes('_2') ||
                nomeLC.includes('comune') && !nomeLC.includes('_2') ||
                nomeLC.includes('cap') && !nomeLC.includes('_2') ||
                nomeLC.includes('email') ||
                nomeLC.includes('telefono');
            
            // 📝 PLACEHOLDER INTELLIGENTE
            let placeholder = '';
            if (maxLen <= 4 && maxLen > 0) {
                placeholder = `Max ${maxLen} caratteri`;
            } else if (tipoInput === 'date') {
                placeholder = 'gg/mm/aaaa';
            } else if (tipoInput === 'email') {
                placeholder = 'esempio@email.it';
            } else if (tipoInput === 'tel') {
                placeholder = '+39 333 1234567';
            } else if (nomeLC.includes('fiscale')) {
                placeholder = '16 caratteri';
            } else if (nomeLC.includes('pod')) {
                placeholder = 'IT001E12345678';
            } else if (nomeLC.includes('pdr')) {
                placeholder = '14 cifre';
            } else if (nomeLC.includes('iban')) {
                placeholder = 'IT60X0542811101000000123456';
            }
            
            // 🔒 Garantisci unicità del nome normalizzato
            let nomeFinale = nomeNormalizzato;
            let counter = 1;
            while (nomiUsati.has(nomeFinale)) {
                nomeFinale = `${nomeNormalizzato}_${counter}`;
                counter++;
            }
            nomiUsati.add(nomeFinale);
            
            // 📝 Log per debug (solo per i primi 5 campi)
            if (campiForm.length < 5) {
                console.log(`   Campo ${campiForm.length + 1}: "${nomeCampo}" -> "${nomeFinale}" (${tipoInput}, max:${maxLen})`);
            }
            
            campiForm.push({
                nome: nomeFinale,
                nomePDF: nomeCampo, // Nome originale dal PDF
                label: nomeDescrittivo, // 🤖 Usa il nome descrittivo fornito dall'AI
                tipo: tipoInput,
                required: required,
                maxLength: maxLen,
                placeholder: placeholder,
                descrizione: descrizione, // 💡 Descrizione contestuale
                categoriaAI: categoriaAI // 🏷️ Categoria suggerita dall'AI
            });
        });
        
        console.log(`✅ Generati ${campiForm.length} campi form`);
        
        // 🏷️ AGGIUNGI CATEGORIE ai campi per raggruppamento visivo
        const mappaCategorie: Record<string, string> = {
            'anagrafica': '👤 Dati Anagrafici',
            'residenza': '🏠 Residenza',
            'fornitura': '⚡ Indirizzo Fornitura',
            'pagamento': '💳 Dati Pagamento',
            'date': '📅 Date',
            'agenzia': '🏢 Dati Agenzia',
            'altro': '📋 Altri Campi'
        };
        
        campiForm.forEach(campo => {
            // 🤖 USA LA CATEGORIA AI se disponibile
            if (campo.categoriaAI && mappaCategorie[campo.categoriaAI]) {
                campo.categoria = mappaCategorie[campo.categoriaAI];
                return; // Salta la categorizzazione manuale
            }
            
            // Fallback: categorizzazione manuale
            const nomeLC = campo.nomePDF.toLowerCase();
            
            if (nomeLC.includes('cognome') || nomeLC.includes('nome') || nomeLC.includes('fiscal') || nomeLC.includes('nato') || nomeLC.includes('nascita') || nomeLC.includes('documento') || nomeLC.includes('identit')) {
                campo.categoria = '👤 Dati Anagrafici';
            } else if (nomeLC.includes('telefon') || nomeLC.includes('cellul') || nomeLC.includes('email') || nomeLC.includes('pec')) {
                campo.categoria = '📞 Contatti';
            } else if ((nomeLC.includes('indirizzo') || nomeLC.includes('residen') || nomeLC.includes('scala') || nomeLC.includes('interno') || nomeLC.includes('comune') || nomeLC.includes('cap') || nomeLC.includes('prov') || nomeLC.includes('n') || nomeLC.includes('via')) && !nomeLC.includes('_2')) {
                campo.categoria = '🏠 Residenza';
            } else if ((nomeLC.includes('indirizzo') || nomeLC.includes('fornitura') || nomeLC.includes('comune') || nomeLC.includes('cap') || nomeLC.includes('prov') || nomeLC.includes('n_2')) && nomeLC.includes('_2')) {
                campo.categoria = '⚡ Indirizzo Fornitura';
            } else if (nomeLC.includes('pod') || nomeLC.includes('pdr') || nomeLC.includes('consumo') || nomeLC.includes('potenza') || nomeLC.includes('remi') || nomeLC.includes('classe') || nomeLC.includes('matricola') || nomeLC.includes('fornitore') && nomeLC.includes('uscente')) {
                campo.categoria = '📊 Dati Tecnici Fornitura';
            } else if (nomeLC.includes('offerta') || nomeLC.includes('codice_offerta') || nomeLC.includes('codice offerta')) {
                campo.categoria = '💼 Offerta Commerciale';
            } else if (nomeLC.includes('iban') || nomeLC.includes('banca') || nomeLC.includes('titolare') || nomeLC.includes('conto') || nomeLC.includes('debitore')) {
                campo.categoria = '💳 Dati Pagamento';
            } else if (nomeLC.includes('data') || nomeLC.includes('date') || nomeLC.includes('attivazione') || nomeLC.includes('gg/mm')) {
                campo.categoria = '📅 Date';
            } else if (nomeLC.includes('agente') || nomeLC.includes('agenzia') || nomeLC.includes('presso')) {
                campo.categoria = '🏢 Dati Agenzia';
            } else if (nomeLC.includes('note')) {
                campo.categoria = '📝 Note';
            } else {
                campo.categoria = '📋 Altri Campi';
            }
        });
        
        // Ordina i campi per categoria e poi per importanza
        const ordineCat = [
            '👤 Dati Anagrafici',
            '📞 Contatti',
            '🏠 Residenza',
            '⚡ Indirizzo Fornitura',
            '📊 Dati Tecnici Fornitura',
            '💼 Offerta Commerciale',
            '💳 Dati Pagamento',
            '📅 Date',
            '🏢 Dati Agenzia',
            '📝 Note',
            '📋 Altri Campi'
        ];
        
        campiForm.sort((a, b) => {
            const catA = ordineCat.indexOf(a.categoria || '');
            const catB = ordineCat.indexOf(b.categoria || '');
            
            if (catA !== catB) {
                return catA - catB;
            }
            
            // All'interno della stessa categoria, ordina per campo base vs. _2
            const aHasSuffix = a.nomePDF.includes('_2') || a.nomePDF.includes('_3');
            const bHasSuffix = b.nomePDF.includes('_2') || b.nomePDF.includes('_3');
            
            if (aHasSuffix !== bHasSuffix) {
                return aHasSuffix ? 1 : -1;
            }
            
            return 0;
        });
        
        return campiForm;
    };
    
    // 📋 Estrae i campi di selezione (checkbox/radio) dal PDF
    const getCampiSelezione = () => {
        if (!selectedTemplate?.campi_estratti) return [];
        
        // Gestisce sia stringa JSON che oggetto già parsato
        let campiEstratti = selectedTemplate.campi_estratti;
        if (typeof campiEstratti === 'string') {
            try {
                campiEstratti = JSON.parse(campiEstratti);
            } catch (e) {
                console.error('❌ Errore parsing campi_estratti in getCampiSelezione:', e);
                return [];
            }
        }
        
        const campiPDF = campiEstratti?.campi || {};
        const campiSelezione: string[] = [];
        
        Object.entries(campiPDF).forEach(([nome, info]: any) => {
            if (info.tipo === 'PDFCheckBox' || info.tipo === 'PDFRadioGroup') {
                campiSelezione.push(nome);
            }
        });
        
        console.log(`✅ Trovati ${campiSelezione.length} campi di selezione`);
        return campiSelezione;
    };
    
    const campi = getCampiForm();
    const templatesFiltered = templates.filter(t => t.tipo_cliente === selectedClientType);
    const clientiFiltered = clienti.filter(c => 
        !searchCliente || 
        (selectedClientType === 'domestico' 
            ? `${c.nome} ${c.cognome}`.toLowerCase().includes(searchCliente.toLowerCase())
            : c.ragione_sociale?.toLowerCase().includes(searchCliente.toLowerCase())
        )
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText size={28} />
                        Compilazione Manuale Contratto
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Steps Indicator */}
                <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">
                        {[
                            { num: 1, label: 'Tipo Cliente' },
                            { num: 2, label: 'Modello' },
                            { num: 3, label: 'Cliente' },
                            { num: 4, label: 'Compila' }
                        ].map((s, idx) => (
                            <div key={s.num} className="flex items-center">
                                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                        step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200'
                                    }`}>
                                        {s.num}
                                    </div>
                                    <span className="font-semibold hidden md:block">{s.label}</span>
                                </div>
                                {idx < 3 && (
                                    <div className={`h-1 w-16 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Seleziona Tipo Cliente */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Seleziona il Tipo di Cliente</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                                <button
                                    onClick={() => handleSelectClientType('domestico')}
                                    className="p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-6 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                                            <User size={64} className="text-blue-600" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-2xl text-gray-900 mb-2">Domestico</h4>
                                            <p className="text-gray-600">
                                                Per clienti privati e uso domestico
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSelectClientType('business')}
                                    className="p-8 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-6 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                                            <Building2 size={64} className="text-purple-600" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-2xl text-gray-900 mb-2">Business</h4>
                                            <p className="text-gray-600">
                                                Per aziende e partite IVA
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Seleziona Modello */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800">
                                    Seleziona Modello {selectedClientType === 'domestico' ? 'Domestico' : 'Business'}
                                </h3>
                                <button onClick={() => setStep(1)} className="text-blue-600 hover:underline">
                                    ← Cambia Tipo
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templatesFiltered.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-4 mb-3">
                                            {/* Icone per tipo contratto */}
                                            {template.categoria === 'dual' ? (
                                                <div className="p-3 bg-gradient-to-br from-yellow-100 to-blue-100 rounded-lg flex gap-1">
                                                    <Zap size={24} className="text-yellow-600" />
                                                    <Flame size={24} className="text-blue-600" />
                                                </div>
                                            ) : template.categoria === 'luce' ? (
                                                <div className="p-3 bg-yellow-100 rounded-lg">
                                                    <Zap size={32} className="text-yellow-600" />
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-blue-100 rounded-lg">
                                                    <Flame size={32} className="text-blue-600" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h4 className="font-bold text-lg text-gray-900 mb-1">{template.nome}</h4>
                                                {/* FORNITORE IN EVIDENZA */}
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-semibold text-gray-500">FORNITORE:</span>
                                                    <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded text-sm font-bold text-gray-900">
                                                        {template.fornitore}
                                                    </span>
                                                </div>
                                                {/* Tipo Contratto */}
                                                <p className="text-xs text-gray-600">
                                                    {template.categoria === 'dual' && '⚡🔥 Luce + Gas'}
                                                    {template.categoria === 'luce' && '⚡ Solo Luce'}
                                                    {template.categoria === 'gas' && '🔥 Solo Gas'}
                                                </p>
                                            </div>
                                        </div>
                                        {template.predefinito === 1 && (
                                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                ⭐ Predefinito
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Dati Cliente - 3 MODALITÀ */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800">Dati Cliente</h3>
                                <button onClick={() => setStep(2)} className="text-blue-600 hover:underline">
                                    ← Cambia Modello
                                </button>
                            </div>

                            {/* TAB SELECTOR */}
                            <div className="flex gap-2 border-b border-gray-200">
                                <button
                                    onClick={() => setClientMode('existing')}
                                    className={`px-4 py-2 font-semibold transition-all ${
                                        clientMode === 'existing'
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    👤 Cliente Esistente
                                </button>
                                <button
                                    onClick={() => setClientMode('manual')}
                                    className={`px-4 py-2 font-semibold transition-all ${
                                        clientMode === 'manual'
                                            ? 'border-b-2 border-green-600 text-green-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    ✏️ Inserimento Manuale
                                </button>
                                <button
                                    onClick={() => setClientMode('ai')}
                                    className={`px-4 py-2 font-semibold transition-all ${
                                        clientMode === 'ai'
                                            ? 'border-b-2 border-purple-600 text-purple-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    🤖 Estrazione AI
                                </button>
                            </div>

                            {/* TAB 1: CLIENTE ESISTENTE */}
                            {clientMode === 'existing' && (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Cerca cliente..."
                                        value={searchCliente}
                                        onChange={(e) => setSearchCliente(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                        {clientiFiltered.map(cliente => (
                                            <button
                                                key={cliente.id}
                                                onClick={() => handleSelectCliente(cliente)}
                                                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {selectedClientType === 'domestico' ? (
                                                        <User size={24} className="text-blue-600" />
                                                    ) : (
                                                        <Building2 size={24} className="text-purple-600" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-gray-900">
                                                            {selectedClientType === 'domestico' 
                                                                ? `${cliente.nome} ${cliente.cognome}`
                                                                : cliente.ragione_sociale
                                                            }
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {cliente.codice_fiscale || cliente.partita_iva}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: INSERIMENTO MANUALE */}
                            {clientMode === 'manual' && (
                                <div className="space-y-3">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <p className="text-sm text-green-800">
                                            ✏️ <strong>Modalità manuale:</strong> Inserisci i dati del cliente direttamente nel prossimo step.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedCliente(null);
                                            setFormData({});
                                            setStep(4);
                                        }}
                                        className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                                    >
                                        ➡️ Procedi con Inserimento Manuale
                                    </button>
                                </div>
                            )}

                            {/* TAB 3: ESTRAZIONE AI */}
                            {clientMode === 'ai' && (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                                        <h4 className="font-bold text-purple-900 mb-2">🤖 Estrazione Intelligente con AI</h4>
                                        <p className="text-sm text-purple-800 mb-3">
                                            Carica uno o più documenti e l'AI estrarrà automaticamente tutti i dati disponibili:
                                        </p>
                                        <ul className="text-sm text-purple-700 space-y-1">
                                            <li>• 📄 <strong>Carta d'Identità</strong> → Nome, Cognome, Data di nascita, CF</li>
                                            <li>• 📋 <strong>Contratto Precedente</strong> → POD, PDR, Dati fornitura, Fornitore</li>
                                            <li>• 💡 <strong>Bolletta</strong> → POD, PDR, Consumi, Potenza, Indirizzo</li>
                                            <li>• 🏢 <strong>Visura/P.IVA</strong> → Ragione sociale, P.IVA, Sede legale</li>
                                        </ul>
                                    </div>

                                    {/* Upload Area */}
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-all">
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleDocumentUpload}
                                            className="hidden"
                                            id="doc-upload"
                                        />
                                        <label htmlFor="doc-upload" className="cursor-pointer">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-4 bg-purple-100 rounded-full">
                                                    <FileText size={32} className="text-purple-600" />
                                                </div>
                                                <p className="font-semibold text-gray-900">Clicca per caricare documenti</p>
                                                <p className="text-sm text-gray-600">PDF, JPG, PNG (max 10 file)</p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Documenti Caricati */}
                                    {uploadedDocs.length > 0 && (
                                        <div className="space-y-2">
                                            <h5 className="font-semibold text-gray-900">📎 Documenti caricati ({uploadedDocs.length})</h5>
                                            {uploadedDocs.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={20} className="text-gray-600" />
                                                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                                                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveDoc(index)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Bottone Estrazione */}
                                    {uploadedDocs.length > 0 && (
                                        <button
                                            onClick={handleAIExtraction}
                                            disabled={loading}
                                            className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                    Estrazione in corso...
                                                </>
                                            ) : (
                                                <>
                                                    🤖 Estrai Dati con AI
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Compila Dati */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800">Compila i Dati del Contratto</h3>
                                <button onClick={() => setStep(3)} className="text-blue-600 hover:underline">
                                    ← Cambia Cliente
                                </button>
                            </div>

                            {/* Alert se dati estratti da AI */}
                            {Object.keys(formData).length > 0 && clientMode === 'manual' && (
                                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-purple-500 rounded-lg">
                                            <CheckCircle size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-purple-900 mb-1">✨ Dati Estratti dall'AI</p>
                                            <p className="text-sm text-purple-800">
                                                L'intelligenza artificiale ha analizzato i documenti caricati ed estratto <strong>{Object.keys(formData).length} campi</strong>. 
                                                Verifica e completa i dati mancanti prima di procedere.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-800">
                                    <strong>Cliente:</strong> {
                                        selectedCliente
                                            ? (selectedClientType === 'domestico' 
                                                ? `${selectedCliente?.nome} ${selectedCliente?.cognome}`
                                                : selectedCliente?.ragione_sociale)
                                            : 'undefined undefined (Nuovo cliente da creare)'
                                    }
                                </p>
                                <p className="text-sm text-blue-800">
                                    <strong>Template:</strong> {selectedTemplate?.nome}
                                </p>
                            </div>

                            {/* 🎲 GENERA DATI TEST */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => handleGeneraDatiTest('luce')}
                                    className="flex-1 p-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Zap size={20} /> 🎲 Genera Dati Test LUCE
                                </button>
                                <button
                                    onClick={() => handleGeneraDatiTest('gas')}
                                    className="flex-1 p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Flame size={20} /> 🎲 Genera Dati Test GAS
                                </button>
                                <button
                                    onClick={() => handleGeneraDatiTest('dual')}
                                    className="flex-1 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Zap size={16} /><Flame size={16} /> 🎲 Test DUAL
                                </button>
                            </div>

                            {/* Info Campi */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-gray-700">
                                    📝 <strong>{campi.length} campi da compilare</strong> - 
                                    I campi contrassegnati con <span className="text-red-500">*</span> sono obbligatori.
                                </p>
                            </div>

                            {/* ⚠️ Alert Campi di Selezione (Checkbox/Radio) */}
                            {getCampiSelezione().length > 0 && (
                                <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-orange-500 rounded-lg flex-shrink-0">
                                            <AlertCircle size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-orange-900 mb-2">⚠️ Campi di Selezione Rilevati nel PDF</p>
                                            <p className="text-sm text-orange-800 mb-3">
                                                Il PDF contiene <strong>{getCampiSelezione().length} campi di selezione</strong> (checkbox/radio) che NON possono essere compilati automaticamente. 
                                                Dovrai selezionarli MANUALMENTE nel PDF dopo la generazione:
                                            </p>
                                            <div className="bg-white/60 rounded-lg p-3 max-h-40 overflow-y-auto">
                                                <div className="space-y-1">
                                                    {getCampiSelezione().map((campo, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                                            <span className="w-6 h-6 flex items-center justify-center bg-orange-200 rounded-full text-orange-900 font-bold text-xs flex-shrink-0">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="font-mono text-xs bg-orange-100 px-2 py-1 rounded flex-1">{campo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-orange-700 mt-3 italic font-semibold">
                                                💡 Questi campi saranno presenti nel PDF generato ma dovrai selezionarli tu (es: "Tipo Richiesta": Switch/Subentro/Voltura/Nuova Attivazione)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 📋 CAMPI RAGGRUPPATI PER CATEGORIA */}
                            <div className="space-y-6">
                                {(() => {
                                    const campiPerCategoria: Record<string, any[]> = {};
                                    campi.forEach((campo: any) => {
                                        const cat = campo.categoria || '📋 Altri Campi';
                                        if (!campiPerCategoria[cat]) {
                                            campiPerCategoria[cat] = [];
                                        }
                                        campiPerCategoria[cat].push(campo);
                                    });
                                    
                                    return Object.entries(campiPerCategoria).map(([categoria, campiCat]) => (
                                        <div key={categoria} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                            <h4 className="text-md font-bold text-gray-700 mb-4 pb-2 border-b border-gray-300">
                                                {categoria}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {campiCat.map((campo: any) => (
                                                    <div key={campo.nome} className={campo.tipo === 'textarea' || campo.nome.includes('note') ? 'md:col-span-2' : ''}>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                            {campo.label}
                                                            {campo.required && <span className="text-red-500 ml-1">*</span>}
                                                        </label>
                                                        {/* 💡 Mostra descrizione contestuale se presente */}
                                                        {campo.descrizione && (
                                                            <p className="text-xs text-gray-500 mb-2 italic">
                                                                {campo.descrizione}
                                                            </p>
                                                        )}
                                        {campo.tipo === 'textarea' || (campo.tipo === 'text' && campo.nome.includes('note')) ? (
                                            <textarea
                                                value={formData[campo.nome] || ''}
                                                onChange={(e) => setFormData({ ...formData, [campo.nome]: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                rows={3}
                                                required={campo.required}
                                            />
                                        ) : (
                                            <input
                                                type={campo.tipo}
                                                value={formData[campo.nome] || ''}
                                                onChange={(e) => setFormData({ ...formData, [campo.nome]: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required={campo.required}
                                            />
                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
                        disabled={loading}
                    >
                        Annulla
                    </button>
                    {step === 4 && (
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Creazione...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Crea Contratto
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

