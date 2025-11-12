/**
 * Pagina lista clienti - UX/UI Avanzata
 * Modalità visualizzazione multiple, filtri avanzati, azioni bulk
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clientiAPI, contrattiAPI, storicoAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useRefreshStore } from '../store/refreshStore';
import toast from 'react-hot-toast';
import EmailComposeModal from '../components/EmailComposeModal';
import ImportClientiModal from '../components/ImportClientiModal';
import WooCommerceImportModal from '../components/WooCommerceImportModal';
import UnifiedImportModal from '../components/UnifiedImportModal';
import CreateAgentModal from '../components/CreateAgentModal';
import StatoContrattoModal from '../components/StatoContrattoModal';
import AssegnaAgenteAvanzatoModal from '../components/AssegnaAgenteAvanzatoModal';
import {
    Search,
    Plus,
    Building2,
    User,
    UserPlus,
    Filter,
    Download,
    Upload,
    Mail,
    Phone,
    FileText,
    Grid3x3,
    List,
    LayoutGrid,
    Table,
    ChevronDown,
    X,
    Eye,
    Edit,
    Trash2,
    MapPin,
    Calendar,
    CheckSquare,
    Square,
    MoreVertical,
    TrendingUp,
    Users,
    Briefcase,
    UserCheck,
    MessageCircle,
    FileSignature,
    StickyNote,
    ClipboardList,
    Send,
    PhoneCall,
    MessageSquare,
    Zap,
    Flame,
    RefreshCw,
    Lightbulb
} from 'lucide-react';

type ViewMode = 'cards' | 'list' | 'table' | 'grid';

interface FilterState {
    search: string;
    tipo: string;
    citta: string;
    provincia: string;
    haContratti: string;
    consensoMarketing: string;
    newsletter: string;
    dataQuality: string;
}

export default function ClientiPage() {
    // 🔐 Controllo ruolo utente
    const { user } = useAuthStore();
    const location = useLocation();
    const { clientiRefreshKey } = useRefreshStore();
    const isSuperAdmin = user?.ruolo === 'super_admin';
    const isAdmin = user?.ruolo === 'admin' || isSuperAdmin;
    const isOperatore = user?.ruolo === 'operatore';
    
    const [clienti, setClienti] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    
    // Newsletter
    const [newsletter, setNewsletter] = useState<any[]>([]);
    
    // Agenti
    const [agenti, setAgenti] = useState<any[]>([]);
    const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
    
    // Modale Email
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedClientForEmail, setSelectedClientForEmail] = useState<any>(null);
    const [showCSVImportModal, setShowCSVImportModal] = useState(false);
    const [showWooCommerceImportModal, setShowWooCommerceImportModal] = useState(false);
    const [showUnifiedImportModal, setShowUnifiedImportModal] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    
    // Modale Cambio Stato Contratto
    const [showStatoModal, setShowStatoModal] = useState(false);
    const [clientePerStato, setClientePerStato] = useState<any>(null);
    const [nuovoStatoSelezionato, setNuovoStatoSelezionato] = useState<string>('');
    const [contrattiCliente, setContrattiCliente] = useState<any[]>([]);
    
    // Modale Assegnazione Agente Avanzata
    const [showAssegnaAgenteModal, setShowAssegnaAgenteModal] = useState(false);
    const [clientePerAssegnazione, setClientePerAssegnazione] = useState<any>(null);
    
    // Stati contratti per dropdown (mappa idContratto -> stato)
    const [contrattiStati, setContrattiStati] = useState<{[contractId: string]: string}>({});
    // Dettagli contratti per cliente (mappa tipo_idCliente -> array contratti)
    const [contrattiDettagli, setContrattiDettagli] = useState<{[clienteKey: string]: any[]}>({});

    // Paginazione
    const [page, setPage] = useState(1);
    const [limit] = useState(200);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Filtri
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        tipo: '',
        citta: '',
        provincia: '',
        haContratti: '',
        consensoMarketing: '',
        newsletter: '',
        dataQuality: ''
    });

    // Statistiche
    const [stats, setStats] = useState({
        totale: 0,
        privati: 0,
        aziende: 0,
        conContratti: 0
    });
    // Flag per indicare che i KPI provengono dal backend
    const [hasServerTotals, setHasServerTotals] = useState(false);

    // Carica newsletter e agenti all'avvio
    useEffect(() => {
        loadNewsletter();
        loadAgenti();
    }, []);

    // 🔄 Caricamento iniziale quando si arriva alla pagina clienti
    useEffect(() => {
        if (location.pathname === '/clienti') {
            console.log('🔄 Caricamento iniziale pagina clienti');
            loadClienti({ page: 1, append: false });
        }
    }, [location.pathname]); // Carica solo quando si cambia pathname
    
    // 🔄 Ricarica quando i filtri cambiano (ma non al primo caricamento)
    useEffect(() => {
        // Evita il caricamento al primo render se i filtri sono vuoti
        const hasActiveFilters = Object.values(filters).some(value => value !== '');
        if (hasActiveFilters) {
            console.log('🔄 Filters changed');
            setPage(1);
            loadClienti({ page: 1, append: false });
        }
    }, [filters]);

    // 🔄 Quando cambia la lista clienti, carica i contratti per ciascun cliente visibile (solo per Super Admin)
    useEffect(() => {
        // Mappa stati DB -> etichette umane coerenti con trigger backend
        const statoToLabel = (s: string) => {
            const map: Record<string, string> = {
                'in_compilazione': 'In compilazione',
                'documenti_da_validare': 'Documenti da validare',
                'documenti_da_correggere': 'Documenti da correggere',
                'precheck_ko': 'Precheck KO',
                'credit_check_ko': 'Credit KO',
                'in_attesa_di_postalizzazione_lettera': 'In attesa',
                'da_attivare': 'Da attivare',
                'attivo': 'Attivo',
                'chiusa': 'Chiusa'
            };
            return map[s] || s;
        };

        const loadContrattiVisibili = async () => {
            if (!isSuperAdmin || clienti.length === 0) return;
            try {
                const updates: {[k: string]: any[]} = {};
                const statoById: {[k: string]: string} = {};
                await Promise.all(
                    clienti
                        .filter((c: any) => ((c.contratti_luce || 0) + (c.contratti_gas || 0)) > 0)
                        .map(async (c: any) => {
                            const key = `${c.tipo}_${c.id}`;
                            // Evita richieste duplicate se già caricati
                            if (contrattiDettagli[key]?.length) return;
                            const res = await contrattiAPI.getByCliente(c.tipo, String(c.id));
                            const arr = (res.data?.data || []) as any[];
                            updates[key] = arr;
                            arr.forEach(ct => { statoById[String(ct.id)] = statoToLabel(ct.stato || ''); });
                        })
                );
                if (Object.keys(updates).length > 0) {
                    setContrattiDettagli(prev => ({ ...prev, ...updates }));
                }
                if (Object.keys(statoById).length > 0) {
                    setContrattiStati(prev => ({ ...prev, ...statoById }));
                }
            } catch (err) {
                console.error('Errore caricamento contratti visibili:', err);
            }
        };
        loadContrattiVisibili();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clienti, isSuperAdmin]);
    
    // 🔄 Ricarica quando il refreshKey cambia (triggato da altre pagine)
    useEffect(() => {
        if (clientiRefreshKey > 0 && location.pathname === '/clienti') {
            console.log('🔄 RefreshKey triggered reload:', clientiRefreshKey);
            setPage(1);
            loadClienti({ page: 1, append: false });
        }
    }, [clientiRefreshKey]);

    useEffect(() => {
        calculateStats();
    }, [clienti]);

    // Chiudi menu azioni quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Non chiudere se click è dentro un menu dropdown o sul trigger
            if (!target.closest('.action-menu-dropdown') && !target.closest('.action-menu-trigger')) {
                setOpenActionMenu(null);
            }
        };

        if (openActionMenu) {
            // Usa timeout per evitare che si chiuda immediatamente
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 0);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [openActionMenu]);

    // === CARICAMENTO DATI ===
    
    const loadNewsletter = async () => {
        try {
            const response = await clientiAPI.getNewsletter();
            setNewsletter(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento newsletter:', error);
        }
    };

    const loadAgenti = async () => {
        try {
            const response = await fetch('/api/agenti', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setAgenti(data.data || []);
            }
        } catch (error) {
            console.error('Errore caricamento agenti:', error);
        }
    };

    const handleAssignAgent = async (clienteId: number | string, clienteTipo: string, agentId: number | string, commissione?: number) => {
        // Trova il cliente per verificare se ha contratti
        const cliente = clienti.find(c => c.id === clienteId && c.tipo === clienteTipo);
        if (!cliente) {
            toast.error('Cliente non trovato');
            return;
        }

        // Usa sempre la modale avanzata per tutti i clienti
        setClientePerAssegnazione({ ...cliente, agentId });
        setShowAssegnaAgenteModal(true);
        return;

        try {
            const payload = {
                cliente_id: clienteId,
                cliente_tipo: clienteTipo,
                new_agent_id: agentId,
                commissione_pattuita: commissione || null,
                motivo: 'Assegnazione da interfaccia'
            };
            
            console.log('📤 Invio assegnazione agente:', payload);
            
            const response = await fetch('/api/agenti/assign-cliente', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                toast.success(commissione ? `Cliente assegnato con commissione di €${commissione}!` : 'Cliente assegnato con successo!');
                loadClienti(); // Ricarica lista
            } else {
                toast.error(data.message || 'Errore assegnazione');
            }
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante l\'assegnazione');
        }
    };

    // Gestione cambio stato cliente - supporta tipoContratto (luce/gas) e filtra i contratti
    const handleChangeStato = async (
        clienteId: number,
        clienteTipo: 'privato' | 'azienda',
        nuovoStato: string,
        tipoContratto?: 'luce' | 'gas'
    ) => {
        try {
            const cliente = clienti.find(c => c.id === clienteId && c.tipo === clienteTipo);
            if (!cliente) return;
            
            const { contrattiAPI } = await import('../services/api');
            const response = await contrattiAPI.getByCliente(clienteTipo, String(clienteId));
            const contrattiAll = response.data.data || [];
            
            const contrattiFiltrati = tipoContratto
                ? contrattiAll.filter((c: any) => c?.tipo_contratto === tipoContratto)
                : contrattiAll;
            
            if (tipoContratto && contrattiFiltrati.length === 0) {
                toast.error(`Questo cliente non ha contratti ${tipoContratto === 'luce' ? 'LUCE' : 'GAS'}`);
                return;
            }
            if (!tipoContratto && contrattiFiltrati.length === 0) {
                toast.error('Questo cliente non ha contratti');
                return;
            }
            
            // Salva i dati e apri la modale
            setClientePerStato(cliente);
            setNuovoStatoSelezionato(nuovoStato);
            setContrattiCliente(contrattiFiltrati);
            setShowStatoModal(true);
            
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante il caricamento dei contratti');
        }
    };
    
    const handleUpdateStatoContratto = async (contrattoId: string, tipoContratto: 'luce' | 'gas', nuovoStato: string) => {
        const { contrattiAPI, storicoAPI } = await import('../services/api');
        
        // 1. Ottieni il contratto per lo stato precedente
        const contrattoResponse = await contrattiAPI.getByCliente(clientePerStato.tipo, String(clientePerStato.id));
        const contratto = contrattoResponse.data.data.find((c: any) => c.id === contrattoId);
        const statoPrecedente = contratto?.stato || 'N/A';
        
        // 2. Aggiorna lo stato del contratto
        await contrattiAPI.update(tipoContratto, contrattoId, { stato: nuovoStato });
        // Aggiorna stato locale per riflettere la modifica immediatamente
        setContrattiStati(prev => ({ ...prev, [contrattoId]: nuovoStato }));
        // Aggiorna il dettaglio del contratto nella mappa locale
        const key = `${clientePerStato.tipo}_${clientePerStato.id}`;
        if (contrattiDettagli[key]) {
            setContrattiDettagli(prev => ({
                ...prev,
                [key]: prev[key].map(ct => ct.id === contrattoId ? { ...ct, stato: nuovoStato } : ct)
            }));
        }
        
        // 3. Registra nello storico
        const formData = new FormData();
        formData.append('procedura_precedente', contratto?.procedure || 'Switch');
        formData.append('procedura_nuova', contratto?.procedure || 'Switch');
        formData.append('stato_precedente', statoPrecedente);
        formData.append('stato_nuovo', nuovoStato);
        formData.append('note', `Stato modificato dalla lista clienti`);
        
        await storicoAPI.addProcedura(tipoContratto, contrattoId, formData);
        
        // 4. Ricarica la lista clienti
        console.log('✅ Refresh clienti dopo cambio stato dalla lista');
        loadClienti();
    };

    const loadClienti = async (opts?: { page?: number; append?: boolean }) => {
        try {
            const currentPage = opts?.page ?? page ?? 1;
            const append = opts?.append ?? false;
            if (!append) {
                setLoading(true);
                // Reset dei dati durante il caricamento per evitare visualizzazioni inconsistenti
                setClienti([]);
                setContrattiStati({});
                setContrattiDettagli({});
            } else {
                setLoadingMore(true);
            }
            console.log('🔄 loadClienti chiamato - timestamp:', new Date().toISOString());
            
            const response = await clientiAPI.getAll({ 
                search: filters.search, 
                tipo: filters.tipo, 
                contratti: filters.haContratti || undefined,
                limit,
                page: currentPage,
                _t: Date.now() // Cache busting
            });
            const allClienti = response.data.data.clienti;
            const pagination = response?.data?.data?.pagination || {};
            setTotal(pagination.total || (Array.isArray(allClienti) ? allClienti.length : 0));
            setTotalPages(pagination.totalPages || 1);
            setPage(currentPage);
            
            console.log('📦 Clienti ricevuti dal backend:', allClienti.length);
            const toni = allClienti.find((c: any) => 
                c.nome?.includes('TONI') || c.cognome?.includes('CAROSELLA')
            );
            if (toni) {
                console.log('🔍 TONI TROVATO:');
                console.log('   Nome:', toni.nome, toni.cognome);
                console.log('   Stato:', toni.stato);
                console.log('   ID:', toni.id);
            }
            
            // Aggiorna KPI con i totali dal backend (non limitati dalla pagina)
            const totals = response?.data?.data?.totals;
            if (totals && typeof totals === 'object') {
                setStats({
                    totale: totals.totale ?? 0,
                    privati: totals.privati ?? 0,
                    aziende: totals.aziende ?? 0,
                    conContratti: totals.conContratti ?? 0
                });
                setHasServerTotals(true);
            }

            // Applica filtri lato client
            let filtered = allClienti;
            
            if (filters.citta) {
                filtered = filtered.filter((c: any) => 
                    (c.citta || '').toLowerCase().includes(filters.citta.toLowerCase())
                );
            }
            
            if (filters.provincia) {
                filtered = filtered.filter((c: any) => 
                    (c.provincia || '').toLowerCase() === filters.provincia.toLowerCase()
                );
            }
            // Filtro combinazioni contratti (luce/gas/entrambi) lato client
            // Evita doppio filtro se già applicato lato server
            if (!filters.haContratti) {
                // Nessun filtro lato server: opzionale filtro locale
                // (manteniamo compatibilità in caso di sorgenti alternative)
                // Nota: quando filters.haContratti è impostato, il backend filtra già
            }

            if (filters.consensoMarketing) {
                filtered = filtered.filter((c: any) => {
                    if (filters.consensoMarketing === 'si') return c.consenso_marketing === 1;
                    if (filters.consensoMarketing === 'no') return c.consenso_marketing === 0;
                    return true;
                });
            }
            
            if (filters.newsletter) {
                filtered = filtered.filter((c: any) => {
                    const clienteNewsletter = (c.newsletter_nomi || '').toLowerCase();
                    return clienteNewsletter.includes(filters.newsletter.toLowerCase());
                });
            }
            
            if (filters.dataQuality) {
                filtered = filtered.filter((c: any) => {
                    if (filters.dataQuality === 'complete') return !c.incomplete_data;
                    if (filters.dataQuality === 'incomplete') return c.incomplete_data === 1 || c.incomplete_data === true;
                    return true;
                });
            }
            
            if (append) {
                // Appendi evitando duplicati per id
                setClienti((prev) => {
                    const byId = new Map<string, any>();
                    prev.forEach((c: any) => byId.set(String(c.id), c));
                    filtered.forEach((c: any) => byId.set(String(c.id), c));
                    return Array.from(byId.values());
                });
            } else {
                setClienti(filtered);
            }

        } catch (error) {
            toast.error('Errore caricamento clienti');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (page >= totalPages) return;
        loadClienti({ page: page + 1, append: true });
    };

    const handlePageClick = (p: number) => {
        loadClienti({ page: p, append: false });
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    };

    const calculateStats = () => {
        // Se abbiamo già i totali dal backend, non sovrascrivere i KPI
        if (hasServerTotals) return;
        const totale = clienti.length;
        const privati = clienti.filter(c => c.tipo === 'privato').length;
        const aziende = clienti.filter(c => c.tipo === 'azienda').length;
        const conContratti = clienti.filter(c => (c.num_contratti || 0) > 0).length;
        setStats({ totale, privati, aziende, conContratti });
    };

    const toggleSelectClient = (id: string) => {
        // Non selezionare clienti con ID non validi
        if (!id || id.toString().trim() === '') {
            toast.error('Impossibile selezionare cliente senza ID valido');
            return;
        }
        
        const newSelected = new Set(selectedClients);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedClients(newSelected);
    };

    const selectAllClients = () => {
        const validClientIds = clienti.filter(c => c.id && c.id.toString().trim() !== '').map(c => c.id);
        
        if (selectedClients.size === validClientIds.length) {
            setSelectedClients(new Set());
        } else {
            setSelectedClients(new Set(validClientIds));
        }
    };

    const handleExportCSV = async () => {
        const selected = clienti.filter(c => selectedClients.has(c.id));
        const dataToExport = selected.length > 0 ? selected : clienti;
        
        if (dataToExport.length === 0) {
            toast.error('Nessun cliente da esportare');
            return;
        }

        try {
            toast.loading('🔄 Preparazione export completo in corso...', { id: 'export-loading' });
            
            // Esporta tutti i dati completi per ogni cliente
            const exportPromises = dataToExport.map(async (cliente) => {
                try {
                    const response = await clientiAPI.exportCompleto(
                        cliente.tipo === 'privato' ? 'privato' : 'azienda', 
                        cliente.id
                    );
                    return response.data;
                } catch (error) {
                    console.error(`Errore export cliente ${cliente.id}:`, error);
                    return null;
                }
            });

            const exportResults = await Promise.all(exportPromises);
            const validExports = exportResults.filter(result => result !== null);

            if (validExports.length === 0) {
                toast.error('❌ Errore durante l\'export dei clienti', { id: 'export-loading' });
                return;
            }

            // Crea un CSV completo con colonne estese
            const csvEscape = (val: any) => '"' + String(val ?? '').replace(/"/g, '""') + '"';

            const header = [
                'id','tipo',
                'nome','cognome','ragione_sociale',
                'codice_fiscale','partita_iva',
                'codice_ateco','descrizione_ateco','pec_aziendale',
                'data_nascita',
                'email_principale','email_secondaria','email_referente',
                'telefono_mobile','telefono_principale','telefono_fisso','telefono_referente',
                'via_residenza','civico_residenza','cap_residenza','citta_residenza','provincia_residenza',
                'via_sede_legale','civico_sede_legale','cap_sede_legale','citta_sede_legale','provincia_sede_legale',
                'via_sede_operativa','civico_sede_operativa','cap_sede_operativa','citta_sede_operativa','provincia_sede_operativa',
                'nome_referente','cognome_referente','ruolo_referente',
                'dimensione_azienda','settore_merceologico','fatturato_annuo','iban_aziendale','codice_sdi',
                'note','consenso_privacy','consenso_marketing','stato','created_at',
                'contratti_luce','contratti_gas','documenti','email_inviate','note_count',
                'eventi_storico','procedure_contratti','consensi_gdpr','tasks',
                'metadata_data_esportazione','metadata_versione_export'
            ];

            const rows: string[] = [header.join(',')];
            for (const result of validExports) {
                const p = result?.data ?? result; // support both {data: {...}} or direct
                const d = p?.cliente?.dati || {};
                const contratti_luce = (p?.contratti?.luce || []).length;
                const contratti_gas = (p?.contratti?.gas || []).length;
                const documenti = (p?.documenti || []).length;
                const email_inviate = (p?.comunicazioni?.email || []).length;
                const note_count = (p?.note || []).length;
                const eventi_storico = (p?.storico?.eventi || []).length;
                const procedure_contratti = (p?.storico?.procedure_contratti || []).length;
                const consensi_gdpr = (p?.consensi_gdpr || []).length;
                const tasks = (p?.tasks || []).length;
                const metadata_data_esportazione = p?.metadata?.data_esportazione || '';
                const metadata_versione_export = p?.metadata?.versione_export || '';

                const line = [
                    csvEscape(d.id),
                    csvEscape(p?.cliente?.tipo || ''),
                    csvEscape(d.nome),
                    csvEscape(d.cognome),
                    csvEscape(d.ragione_sociale),
                    csvEscape(d.codice_fiscale),
                    csvEscape(d.partita_iva),
                    csvEscape(d.codice_ateco),
                    csvEscape(d.descrizione_ateco),
                    csvEscape(d.pec_aziendale),
                    csvEscape(d.data_nascita),
                    csvEscape(d.email_principale),
                    csvEscape(d.email_secondaria),
                    csvEscape(d.email_referente),
                    csvEscape(d.telefono_mobile),
                    csvEscape(d.telefono_principale),
                    csvEscape(d.telefono_fisso),
                    csvEscape(d.telefono_referente),
                    csvEscape(d.via_residenza),
                    csvEscape(d.civico_residenza),
                    csvEscape(d.cap_residenza),
                    csvEscape(d.citta_residenza),
                    csvEscape(d.provincia_residenza),
                    csvEscape(d.via_sede_legale),
                    csvEscape(d.civico_sede_legale),
                    csvEscape(d.cap_sede_legale),
                    csvEscape(d.citta_sede_legale),
                    csvEscape(d.provincia_sede_legale),
                    csvEscape(d.via_sede_operativa),
                    csvEscape(d.civico_sede_operativa),
                    csvEscape(d.cap_sede_operativa),
                    csvEscape(d.citta_sede_operativa),
                    csvEscape(d.provincia_sede_operativa),
                    csvEscape(d.nome_referente),
                    csvEscape(d.cognome_referente),
                    csvEscape(d.ruolo_referente),
                    csvEscape(d.dimensione_azienda),
                    csvEscape(d.settore_merceologico),
                    csvEscape(d.fatturato_annuo),
                    csvEscape(d.iban_aziendale),
                    csvEscape(d.codice_sdi),
                    csvEscape(d.note),
                    csvEscape(d.consenso_privacy),
                    csvEscape(d.consenso_marketing),
                    csvEscape(d.stato),
                    csvEscape(d.created_at),
                    contratti_luce,
                    contratti_gas,
                    documenti,
                    email_inviate,
                    note_count,
                    eventi_storico,
                    procedure_contratti,
                    consensi_gdpr,
                    tasks,
                    csvEscape(metadata_data_esportazione),
                    csvEscape(metadata_versione_export)
                ].join(',');
                rows.push(line);
            }

            // Aggiungo hint del separatore per Excel e BOM UTF-8
            const sepHint = 'sep=,'; // forza Excel a usare la virgola come separatore
            const csvContent = [sepHint, ...rows].join('\r\n');
            const utf8bom = '\uFEFF';
            const blob = new Blob([utf8bom, csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `export_completo_clienti_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            toast.success(`✅ Export completo di ${validExports.length} clienti completato!`, { id: 'export-loading' });
        } catch (error) {
            console.error('Errore durante l\'export:', error);
            toast.error('❌ Errore durante l\'export dei clienti', { id: 'export-loading' });
        }
    };

    // Export CSV Universale compatibile con Import Unificato (cliente + contratti)
    const handleExportCSVUniversale = async () => {
        const selected = clienti.filter(c => selectedClients.has(c.id));
        const dataToExport = selected.length > 0 ? selected : clienti;
        
        if (dataToExport.length === 0) {
            toast.error('Nessun cliente da esportare');
            return;
        }

        try {
            toast.loading('🔄 Preparazione export universale (import) in corso...', { id: 'export-universale' });

            const exportPromises = dataToExport.map(async (cliente) => {
                try {
                    const response = await clientiAPI.exportCompleto(
                        cliente.tipo === 'privato' ? 'privato' : 'azienda', 
                        cliente.id
                    );
                    return response.data;
                } catch (error) {
                    console.error(`Errore export cliente ${cliente.id}:`, error);
                    return null;
                }
            });

            const exportResults = await Promise.all(exportPromises);
            const validExports = exportResults.filter(result => result !== null);

            if (validExports.length === 0) {
                toast.error('❌ Errore durante l\'export (universale)', { id: 'export-universale' });
                return;
            }

            const esc = (val: any) => '"' + String(val ?? '').replace(/"/g, '""') + '"';
            const lines: string[] = ['sep=,'];
            const header = [
                'tipo_record','modalita_import',
                // cliente privato
                'nome','cognome','codice_fiscale','data_nascita','email_principale','telefono_mobile','via_residenza','civico_residenza','cap_residenza','citta_residenza','provincia_residenza',
                // cliente azienda
                'ragione_sociale','partita_iva','codice_ateco','pec_aziendale',
                // contratto
                'numero_contratto','pod','pdr','fornitore','data_attivazione','data_scadenza','prezzo_energia','prezzo_gas','stato_contratto',
                // agente e fattori economici
                'agente_email','agente_nome','assigned_agent_id','commissione_luce','commissione_gas','commissione_pattuita','stato_cliente'
            ];
            lines.push(header.join(','));

            for (const result of validExports) {
                const p = result?.data ?? result;
                const d = p?.cliente?.dati || {};
                const tipoCliente = p?.cliente?.tipo === 'privato' ? 'privato' : 'azienda';

                // Record cliente
                if (tipoCliente === 'privato') {
                    lines.push([
                        'cliente_privato','update',
                        esc(d.nome),esc(d.cognome),esc(d.codice_fiscale),esc(d.data_nascita),esc(d.email_principale),esc(d.telefono_mobile),
                        esc(d.via_residenza),esc(d.civico_residenza),esc(d.cap_residenza),esc(d.citta_residenza),esc(d.provincia_residenza),
                        '', '', esc(d.codice_ateco), esc(d.pec_aziendale),
                        '', '', '', '', '', '', '', '', '',
                        esc(d.agente_email), esc(d.agente_nome), esc(d.assigned_agent_id), esc(d.commissione_luce), esc(d.commissione_gas), esc(d.commissione_pattuita), esc(d.stato)
                    ].join(','));
                } else {
                    lines.push([
                        'cliente_azienda','update',
                        '', '', '', '', esc(d.email_principale), esc(d.telefono_mobile), '', '', '', '', '',
                        esc(d.ragione_sociale), esc(d.partita_iva), esc(d.codice_ateco), esc(d.pec_aziendale),
                        '', '', '', '', '', '', '', '', '',
                        esc(d.agente_email), esc(d.agente_nome), esc(d.assigned_agent_id), esc(d.commissione_luce), esc(d.commissione_gas), esc(d.commissione_pattuita), esc(d.stato)
                    ].join(','));
                }

                // Contratti luce
                const contrattiLuce = Array.isArray(p?.contratti?.luce) ? p.contratti.luce : [];
                for (const c of contrattiLuce) {
                    lines.push([
                        'contratto_luce','update',
                        tipoCliente === 'privato' ? esc(d.nome) : '',
                        tipoCliente === 'privato' ? esc(d.cognome) : '',
                        tipoCliente === 'privato' ? esc(d.codice_fiscale) : '',
                        '', esc(d.email_principale), esc(d.telefono_mobile), '', '', '', '', '',
                        tipoCliente === 'azienda' ? esc(d.ragione_sociale) : '',
                        tipoCliente === 'azienda' ? esc(d.partita_iva) : '',
                        '', '',
                        esc(c.numero_contratto), esc(c.pod), '', esc(c.fornitore), esc(c.data_attivazione), esc(c.data_scadenza), esc(c.prezzo_energia), '', esc(c.stato || c.stato_contratto),
                        esc(d.agente_email), esc(d.agente_nome), esc(d.assigned_agent_id), esc(d.commissione_luce), esc(d.commissione_gas), esc(d.commissione_pattuita), esc(d.stato)
                    ].join(','));
                }

                // Contratti gas
                const contrattiGas = Array.isArray(p?.contratti?.gas) ? p.contratti.gas : [];
                for (const c of contrattiGas) {
                    lines.push([
                        'contratto_gas','update',
                        tipoCliente === 'privato' ? esc(d.nome) : '',
                        tipoCliente === 'privato' ? esc(d.cognome) : '',
                        tipoCliente === 'privato' ? esc(d.codice_fiscale) : '',
                        '', esc(d.email_principale), esc(d.telefono_mobile), '', '', '', '', '',
                        tipoCliente === 'azienda' ? esc(d.ragione_sociale) : '',
                        tipoCliente === 'azienda' ? esc(d.partita_iva) : '',
                        '', '',
                        esc(c.numero_contratto), '', esc(c.pdr), esc(c.fornitore), esc(c.data_attivazione), esc(c.data_scadenza), '', esc(c.prezzo_gas), esc(c.stato || c.stato_contratto),
                        esc(d.agente_email), esc(d.agente_nome), esc(d.assigned_agent_id), esc(d.commissione_luce), esc(d.commissione_gas), esc(d.commissione_pattuita), esc(d.stato)
                    ].join(','));
                }
            }

            const utf8bom = '\uFEFF';
            const csvContent = utf8bom + lines.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `export_universale_clienti_contratti_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            toast.success(`✅ Export universale di ${validExports.length} clienti completato!`, { id: 'export-universale' });
        } catch (error) {
            console.error('Errore durante l\'export universale:', error);
            toast.error('❌ Errore durante l\'export universale', { id: 'export-universale' });
        }
    };

    const handleBulkEmail = () => {
        const selected = clienti.filter(c => selectedClients.has(c.id));
        if (selected.length === 0) {
            toast.error('Seleziona almeno un cliente');
            return;
        }
        
        toast.success(`📧 Funzione Email Bulk in sviluppo (${selected.length} clienti selezionati)`);
    };

    const handleBulkDelete = async () => {
        const selected = clienti.filter(c => selectedClients.has(c.id));
        if (selected.length === 0) {
            toast.error('Seleziona almeno un cliente');
            return;
        }

        const confirmed = window.confirm(
            `⚠️ ATTENZIONE!\n\nStai per eliminare ${selected.length} clienti selezionati.\n\nQuesta operazione eliminerà anche tutti i contratti associati e NON può essere annullata.\n\nVuoi continuare?`
        );

        if (!confirmed) return;

        try {
            toast.loading(`🗑️ Eliminazione di ${selected.length} clienti in corso...`, { id: 'bulk-delete-loading' });

            // Filtra solo i clienti con ID validi
            const validClients = selected.filter(c => c.id && c.id.toString().trim() !== '');
            
            if (validClients.length === 0) {
                toast.error('Nessun cliente valido da eliminare (ID mancanti)', { id: 'bulk-delete-loading' });
                return;
            }

            // Raggruppa i clienti per tipo per ottimizzare le chiamate API
            const privati = validClients.filter(c => c.tipo === 'privato');
            const aziende = validClients.filter(c => c.tipo === 'azienda');

            const deletePromises = [];
            const errors: any[] = [];

            // Elimina tutti i clienti privati
            for (const cliente of privati) {
                if (cliente.id && cliente.id.toString().trim() !== '') {
                    deletePromises.push(
                        clientiAPI.delete('privati', cliente.id).catch(error => {
                            errors.push({ cliente: `${cliente.nome || ''} ${cliente.cognome || ''}`.trim() || 'Cliente senza nome', error });
                            return null;
                        })
                    );
                }
            }

            // Elimina tutte le aziende
            for (const cliente of aziende) {
                if (cliente.id && cliente.id.toString().trim() !== '') {
                    deletePromises.push(
                        clientiAPI.delete('aziende', cliente.id).catch(error => {
                            errors.push({ cliente: cliente.ragione_sociale || 'Azienda senza nome', error });
                            return null;
                        })
                    );
                }
            }

            const results = await Promise.all(deletePromises);
            const successCount = results.filter(r => r !== null).length;

            // Aggiorna la lista e resetta la selezione
            await loadClienti();
            setSelectedClients(new Set());

            if (errors.length === 0) {
                toast.success(`✅ ${selected.length} clienti eliminati con successo!`, { id: 'bulk-delete-loading' });
            } else if (successCount > 0) {
                toast.success(`✅ ${successCount} clienti eliminati con successo. ${errors.length} errori.`, { id: 'bulk-delete-loading' });
                console.warn('Errori durante l\'eliminazione:', errors.map(e => `${e.cliente}: ${e.error?.message || e.error}`));
            } else {
                toast.error(`❌ Errore durante l'eliminazione di tutti i clienti`, { id: 'bulk-delete-loading' });
                console.error('Errori durante l\'eliminazione:', errors.map(e => `${e.cliente}: ${e.error?.message || e.error}`));
            }
        } catch (error) {
            console.error('Errore durante l\'eliminazione multipla:', error);
            toast.error('❌ Errore durante l\'eliminazione dei clienti', { id: 'bulk-delete-loading' });
        }
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            tipo: '',
            citta: '',
            provincia: '',
            haContratti: '',
            consensoMarketing: '',
            newsletter: '',
            dataQuality: ''
        });
    };
    
    const handleRecalculateQuality = async () => {
        try {
            toast.loading('🔄 Ricalcolo qualità dati in corso...');
            const response = await fetch('/api/clienti/recalculate-quality', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.dismiss();
                toast.success(`✅ Qualità dati aggiornata! ${result.updated.total} clienti processati`);
                loadClienti(); // Ricarica i clienti con i nuovi score
            } else {
                toast.dismiss();
                toast.error('❌ Errore durante il ricalcolo');
            }
        } catch (error) {
            toast.dismiss();
            toast.error('❌ Errore connessione al server');
        }
    };

    // === AZIONI CLIENTE ===
    
    const handleCallCliente = (cliente: any) => {
        const telefono = cliente.telefono_principale || cliente.telefono;
        if (telefono) {
            window.location.href = `tel:${telefono}`;
            toast.success(`📞 Chiamata in corso...`);
        } else {
            toast.error('Nessun numero di telefono disponibile');
        }
    };

    const handleEmailCliente = (cliente: any) => {
        const email = cliente.email_principale || cliente.email_referente;
        if (email) {
            window.location.href = `mailto:${email}`;
            toast.success(`📧 Apertura client email...`);
        } else {
            toast.error('Nessuna email disponibile');
        }
    };

    const handleWhatsAppCliente = (cliente: any) => {
        const telefono = cliente.telefono_principale || cliente.telefono;
        if (telefono) {
            // Rimuove spazi e caratteri speciali
            const cleanPhone = telefono.replace(/[^\d+]/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
            toast.success(`💬 Apertura WhatsApp...`);
        } else {
            toast.error('Nessun numero WhatsApp disponibile');
        }
    };

    const handleViewContracts = (clienteId: string) => {
        window.location.href = `/clienti/${clienteId}#contratti`;
        toast.success('📄 Visualizzazione contratti...');
    };

    const handleAddContract = ( clienteId : string) => {
        toast('🔜 Funzione "Aggiungi Contratto" in sviluppo');
    };

    const handleSendEmailMarketing = (cliente: any) => {
        const email = cliente.email_principale || cliente.email_referente;
        if (!email) {
            toast.error('❌ Cliente senza email');
            return;
        }
        
        setSelectedClientForEmail(cliente);
        setShowEmailModal(true);
        setOpenActionMenu(null);
    };

    const handleAddNote = (clienteId: string) => {
        const nota = prompt('📝 Inserisci una nota per questo cliente:');
        if (nota && nota.trim()) {
            // TODO: Implementare API per salvare nota
            toast.success('✅ Nota salvata con successo!');
        }
    };

    const handleDeleteCliente = async (clienteId: string, nomeCliente: string) => {
        if (window.confirm(`⚠️ Sei sicuro di voler eliminare ${nomeCliente}?\n\nQuesta azione è irreversibile!`)) {
            try {
                // Trova il cliente per determinare il tipo
                const cliente = clienti.find(c => c.id === clienteId);
                if (!cliente) {
                    toast.error('❌ Cliente non trovato');
                    return;
                }
                
                const tipo = cliente.tipo === 'privato' ? 'privati' : 'aziende';
                await clientiAPI.delete(tipo, clienteId);
                // Rimuovi subito dal locale per feedback immediato
                setClienti(prev => prev.filter(c => c.id !== clienteId));
                toast.success('✅ Cliente eliminato con successo');
                // Ricarica la pagina corrente per coerenza con la paginazione
                await loadClienti({ page, append: false });
            } catch (error) {
                console.error('Errore eliminazione cliente:', error);
                toast.error('❌ Errore eliminazione cliente');
            }
        }
    };

    const handleExportSingleClient = async (cliente: any) => {
        try {
            const response = await clientiAPI.exportCompleto(cliente.tipo === 'privato' ? 'privato' : 'azienda', cliente.id);
            const exportData = response.data;
            
            // Crea un JSON formattato con tutti i dati del cliente
            const jsonContent = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            
            const nomeCliente = cliente.tipo === 'privato' 
                ? `${cliente.nome}_${cliente.cognome}` 
                : cliente.ragione_sociale.replace(/[^a-zA-Z0-9]/g, '_');
            
            link.download = `export_completo_${nomeCliente}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            toast.success('📥 Export completo cliente completato!');
        } catch (error) {
            console.error('Errore durante l\'export:', error);
            toast.error('❌ Errore durante l\'export del cliente');
        }
    };

    const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

    // Componente per menu azioni rapide
    // Sanitizza placeholder testuali e rimuove HTML residuo
    const sanitize = (v: any) => {
        if (v === undefined || v === null) return '';
        let s = String(v);
        // Rimuove tag HTML comuni
        s = s
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/(div|span|p)>/gi, ' ')
            .replace(/<(div|span|p)[^>]*>/gi, ' ')
            .replace(/&nbsp;/gi, ' ');
        // Normalizza spazi
        s = s.trim().replace(/\s+/g, ' ');

        // Rimuove placeholder anche se composti: es. "null null" -> ''
        const placeholders = new Set(['null', 'undefined', '-', 'n/a', 'na', 'vuoto', 'manca', 'missing', 'div', 'span', 'br', 'p']);
        const tokens = s.split(' ').filter(t => t && !placeholders.has(t.toLowerCase()));
        return tokens.join(' ').trim();
    };

    const formatDisplayName = (cliente: any) => {
        if (cliente.tipo === 'privato') {
            const nome = sanitize(cliente.nome);
            const cognome = sanitize(cliente.cognome);
            const full = `${nome} ${cognome}`.trim();
            return full || '—';
        }
        const rs = sanitize(cliente.ragione_sociale);
        return rs || '—';
    };

    const ActionsMenu = ({ cliente, inline = false }: { cliente: any; inline?: boolean }) => {
        const clienteNome = formatDisplayName(cliente);
        
        if (inline) {
            // Azioni inline per vista cards/list
            return (
                <div className="flex items-center gap-2">
                    {(cliente.telefono_principale || cliente.telefono) && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCallCliente(cliente);
                            }}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600 hidden"
                            title="Chiama"
                        >
                            <PhoneCall size={18} />
                        </button>
                    )}
                    {(cliente.email_principale || cliente.email_referente) && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEmailCliente(cliente);
                            }}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                            title="Email"
                        >
                            <Mail size={18} />
                        </button>
                    )}
                    {(cliente.telefono_principale || cliente.telefono) && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleWhatsAppCliente(cliente);
                            }}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600 hidden"
                            title="WhatsApp"
                        >
                            <MessageCircle size={18} />
                        </button>
                    )}
                    <Link
                        to={`/clienti/${cliente.id}`}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Visualizza"
                    >
                        <Eye size={18} />
                    </Link>
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenActionMenu(openActionMenu === cliente.id ? null : cliente.id);
                            }}
                            className="action-menu-trigger p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Altre azioni"
                        >
                            <MoreVertical size={18} />
                        </button>
                        
                        {openActionMenu === cliente.id && (
                            <div className="action-menu-dropdown absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-[9999]">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            handleViewContracts(cliente.id);
                                            setOpenActionMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                        <FileText size={16} />
                                        Visualizza Contratti
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleAddContract(cliente.id);
                                            setOpenActionMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                        <FileSignature size={16} />
                                        Nuovo Contratto
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleSendEmailMarketing(cliente);
                                            setOpenActionMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                        <Send size={16} />
                                        Invia Email
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleAddNote(cliente.id);
                                            setOpenActionMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                    >
                                        <StickyNote size={16} />
                                        Aggiungi Nota
                                    </button>
                                    <hr className="my-1" />
                                    <Link
                                        to={`/clienti/${cliente.id}`}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 block"
                                        onClick={() => setOpenActionMenu(null)}
                                    >
                                        <Edit size={16} />
                                        Modifica Cliente
                                    </Link>
                                    {/* 🔐 SOLO ADMIN */}
                                    {isAdmin && (
                            <>
                                <button
                                    onClick={() => setShowCSVImportModal(true)}
                                    className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                    title="Importa da CSV (Nuovo Sistema)"
                                >
                                    <Upload size={18} />
                                    <span className="hidden md:inline">Import CSV</span>
                                </button>
                                
                                <button
                                                onClick={() => {
                                                    handleExportSingleClient(cliente);
                                                    setOpenActionMenu(null);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <Download size={16} />
                                                Esporta Dati
                                            </button>
                                            <hr className="my-1" />
                                            <button
                                                onClick={() => {
                                                    handleDeleteCliente(cliente.id, clienteNome);
                                                    setOpenActionMenu(null);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                                            >
                                                <Trash2 size={16} />
                                                Elimina Cliente
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Azioni per tabella (pulsanti grandi)
        return (
            <div className="flex items-center justify-center gap-1">
                {(cliente.telefono_principale || cliente.telefono) && (
                    <button
                        onClick={() => handleCallCliente(cliente)}
                        className="p-1.5 hover:bg-green-100 rounded-lg transition-colors text-green-600 hidden"
                        title="Chiama"
                    >
                        <PhoneCall size={18} />
                    </button>
                )}
                {(cliente.email_principale || cliente.email_referente) && (
                    <button
                        onClick={() => handleEmailCliente(cliente)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Email"
                    >
                        <Mail size={18} />
                    </button>
                )}
                {(cliente.telefono_principale || cliente.telefono) && (
                    <button
                        onClick={() => handleWhatsAppCliente(cliente)}
                        className="p-1.5 hover:bg-green-100 rounded-lg transition-colors text-green-600 hidden"
                        title="WhatsApp"
                    >
                        <MessageCircle size={18} />
                    </button>
                )}
                <Link
                    to={`/clienti/${cliente.id}`}
                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                    title="Dettagli"
                >
                    <Eye size={18} />
                </Link>
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === cliente.id ? null : cliente.id);
                        }}
                        className="action-menu-trigger p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Altre azioni"
                    >
                        <MoreVertical size={18} />
                    </button>
                    
                    {openActionMenu === cliente.id && (
                        <div className="action-menu-dropdown absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-[9999]">
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        handleViewContracts(cliente.id);
                                        setOpenActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <FileText size={16} />
                                    Visualizza Contratti
                                </button>
                                <button
                                    onClick={() => {
                                        handleAddContract(cliente.id);
                                        setOpenActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <FileSignature size={16} />
                                    Nuovo Contratto
                                </button>
                                <button
                                    onClick={() => {
                                        handleSendEmailMarketing(cliente);
                                        setOpenActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <Send size={16} />
                                    Invia Email
                                </button>
                                <button
                                    onClick={() => {
                                        handleAddNote(cliente.id);
                                        setOpenActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <StickyNote size={16} />
                                    Aggiungi Nota
                                </button>
                                <hr className="my-1" />
                                <Link
                                    to={`/clienti/${cliente.id}`}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 block"
                                    onClick={() => setOpenActionMenu(null)}
                                >
                                    <Edit size={16} />
                                    Modifica Cliente
                                </Link>
                                {/* 🔐 SOLO ADMIN */}
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleExportSingleClient(cliente);
                                                setOpenActionMenu(null);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                        >
                                            <Download size={16} />
                                            Esporta Dati
                                        </button>
                                        <hr className="my-1" />
                                        <button
                                            onClick={() => {
                                                handleDeleteCliente(cliente.id, clienteNome);
                                                setOpenActionMenu(null);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                                        >
                                            <Trash2 size={16} />
                                            Elimina Cliente
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header con KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Totale Clienti</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.totale}</h3>
                        </div>
                        <Users size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Clienti Privati</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.privati}</h3>
                        </div>
                        <User size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Aziende</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.aziende}</h3>
                        </div>
                        <Briefcase size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Con Contratti</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.conContratti}</h3>
                        </div>
                        <UserCheck size={40} className="opacity-80" />
                    </div>
                </div>
            </div>

            {/* Toolbar principale */}
            <div className="card">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Ricerca e filtri */}
                    <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cerca per nome, email, CF, P.IVA..."
                                className="input pl-10 w-full"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn ${showFilters || activeFiltersCount > 0 ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 relative`}
                        >
                            <Filter size={18} />
                            Filtri
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Modalità visualizzazione */}
                    <div className="flex items-center gap-2 border-l pl-4">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'cards' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
                            }`}
                            title="Vista Cards"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
                            }`}
                            title="Vista Griglia"
                        >
                            <Grid3x3 size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
                            }`}
                            title="Vista Lista"
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
                            }`}
                            title="Vista Tabella Dettagliata"
                        >
                            <Table size={20} />
                        </button>
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center gap-2 border-l pl-4">
                        {/* 🔐 PULSANTI ADMIN/SUPER_ADMIN ONLY */}
                        {isAdmin && (
                            <>

                                
                                <button
                                    onClick={() => setShowUnifiedImportModal(true)}
                                    className="btn bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
                                    title="Import Unificato (beta)"
                                >
                                    <Upload size={18} />
                                    <span className="hidden md:inline">Import Unificato</span>
                                </button>

                                <button
                                    onClick={() => setShowWooCommerceImportModal(true)}
                                    className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                    title="Importa CSV con Mappatura Campi (Stile WooCommerce)"
                                >
                                    <Upload size={18} />
                                    <span className="hidden md:inline">Import Avanzato</span>
                                </button>
                                
                                <button
                                    onClick={handleExportCSV}
                                    className="btn btn-secondary flex items-center gap-2"
                                    title="Esporta CSV"
                                >
                                    <Download size={18} />
                                    <span className="hidden md:inline">Esporta</span>
                                </button>
                                <button
                                    onClick={handleExportCSVUniversale}
                                    className="btn btn-secondary flex items-center gap-2"
                                    title="Esporta CSV (Import Unificato)"
                                >
                                    <Download size={18} />
                                    <span className="hidden md:inline">Esporta (Import)</span>
                                </button>
                                
                                <button
                                    onClick={handleRecalculateQuality}
                                    className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                                    title="Ricalcola Qualità Dati"
                                >
                                    <RefreshCw size={18} />
                                    <span className="hidden md:inline">Ricalcola</span>
                                </button>
                            </>
                        )}
                        
                        {selectedClients.size > 0 && (
                            <>
                                <button
                                    onClick={handleBulkEmail}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <Mail size={18} />
                                    <span className="hidden md:inline">Email ({selectedClients.size})</span>
                                </button>
                                
                                {/* 🔐 SOLO ADMIN - Pulsante Elimina Selezionati */}
                                {isAdmin && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                                        title={`Elimina ${selectedClients.size} clienti selezionati`}
                                    >
                                        <Trash2 size={18} />
                                        <span className="hidden md:inline">Elimina ({selectedClients.size})</span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* Dropdown Aggiungi Cliente */}
                        <div className="relative">
                            <button
                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                className="btn bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white flex items-center gap-2 font-semibold"
                                title="Aggiungi nuovo cliente"
                            >
                                <Plus size={20} />
                                <span>Aggiungi</span>
                                <ChevronDown size={16} />
                            </button>

                            {showAddDropdown && (
                                <>
                                    {/* Overlay per chiudere dropdown */}
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setShowAddDropdown(false)}
                                    ></div>
                                    
                                    {/* Menu dropdown */}
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-20 overflow-hidden">
                                        <Link
                                            to="/clienti/new/privato"
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors border-b"
                                            onClick={() => setShowAddDropdown(false)}
                                        >
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <User size={20} className="text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">Cliente Privato</div>
                                                <div className="text-xs text-gray-500">Persona fisica</div>
                                            </div>
                                        </Link>
                                        
                                        <Link
                                            to="/clienti/new/azienda"
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors"
                                            onClick={() => setShowAddDropdown(false)}
                                        >
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Building2 size={20} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">Cliente Azienda</div>
                                                <div className="text-xs text-gray-500">Persona giuridica</div>
                                            </div>
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pannello filtri avanzati */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <select
                            className="input"
                            value={filters.tipo}
                            onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                        >
                            <option value="">🔹 Tipo Cliente</option>
                            <option value="privati">👤 Solo Privati</option>
                            <option value="aziende">🏢 Solo Aziende</option>
                        </select>
                        <select
                            className="input"
                            value={filters.haContratti}
                            onChange={(e) => setFilters({ ...filters, haContratti: e.target.value })}
                        >
                            <option value="">⚡🔥 Contratti</option>
                            <option value="luce">⚡ Solo clienti con contratti Luce</option>
                            <option value="gas">🔥 Solo clienti con contratti Gas</option>
                            <option value="both">⚡🔥 Solo clienti con entrambi</option>
                        </select>

                        <input
                            type="text"
                            placeholder="🏙️ Città"
                            className="input"
                            value={filters.citta}
                            onChange={(e) => setFilters({ ...filters, citta: e.target.value })}
                        />

                        <input
                            type="text"
                            placeholder="📍 Provincia (sigla)"
                            className="input"
                            value={filters.provincia}
                            onChange={(e) => setFilters({ ...filters, provincia: e.target.value.toUpperCase() })}
                            maxLength={2}
                        />

                        <select
                            className="input"
                            value={filters.consensoMarketing}
                            onChange={(e) => setFilters({ ...filters, consensoMarketing: e.target.value })}
                        >
                            <option value="">📧 Consenso Marketing</option>
                            <option value="si">✅ Con consenso</option>
                            <option value="no">❌ Senza consenso</option>
                        </select>
                        
                        <select
                            className="input"
                            value={filters.newsletter}
                            onChange={(e) => setFilters({ ...filters, newsletter: e.target.value })}
                        >
                            <option value="">📰 Newsletter</option>
                            {newsletter.map(nl => (
                                <option key={nl.id} value={nl.nome}>{nl.nome}</option>
                            ))}
                        </select>
                        
                        <select
                            className="input"
                            value={filters.dataQuality}
                            onChange={(e) => setFilters({ ...filters, dataQuality: e.target.value })}
                        >
                            <option value="">🎯 Qualità Dati</option>
                            <option value="complete">🟢 Completi</option>
                            <option value="incomplete">🔴 Incompleti</option>
                        </select>

                        <button
                            onClick={clearFilters}
                            className="btn btn-secondary flex items-center justify-center gap-2"
                        >
                            <X size={18} />
                            Pulisci Filtri
                        </button>
                    </div>
                )}
            </div>

            {/* Contenuto principale - Visualizzazioni */}
            {loading ? (
                <div className="card flex justify-center items-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Caricamento clienti...</p>
                    </div>
                </div>
            ) : clienti.length === 0 ? (
                <div className="card text-center py-20">
                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun cliente trovato</h3>
                    <p className="text-gray-600 mb-6">
                        {filters.search || activeFiltersCount > 0 
                            ? 'Prova a modificare i filtri di ricerca' 
                            : 'Inizia aggiungendo il tuo primo cliente'}
                    </p>
                    <div className="flex justify-center gap-3">
                        <Link to="/clienti/new/privato" className="btn btn-secondary">
                            <User size={18} className="mr-2" />
                            Nuovo Cliente Privato
                        </Link>
                        <Link to="/clienti/new/azienda" className="btn btn-primary">
                            <Building2 size={18} className="mr-2" />
                            Nuova Azienda
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* VISTA CARDS */}
                    {viewMode === 'cards' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clienti.map((cliente, index) => (
                            <div key={cliente.id || `card-${index}`} className="card hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedClients.has(cliente.id)}
                                                onChange={() => toggleSelectClient(cliente.id)}
                                                className="w-4 h-4"
                                            />
                                            <div className={`p-2 rounded-lg ${
                                                cliente.tipo === 'privato' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                                            }`}>
                                                {cliente.tipo === 'privato' ? <User size={24} /> : <Building2 size={24} />}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            cliente.tipo === 'privato' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                            {cliente.tipo === 'privato' ? 'Privato' : 'Azienda'}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                                        {cliente.tipo === 'privato' 
                                            ? `${cliente.nome} ${cliente.cognome}` 
                                            : cliente.ragione_sociale}
                                    </h3>
                                    
                                    {/* Codice Cliente + Badge Contratti */}
                                    <div className="flex items-center justify-between mb-2">
                                        {cliente.codice_cliente && (
                                            <span className="text-xs font-mono font-bold text-indigo-600">
                                                ID: {cliente.codice_cliente}
                                            </span>
                                        )}
                                        <div className="flex gap-1">
                                            {(cliente.contratti_luce || 0) > 0 && (
                                                <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded flex items-center gap-1">
                                                    <Zap size={10} /> {cliente.contratti_luce}
                                                </span>
                                            )}
                                            {(cliente.contratti_gas || 0) > 0 && (
                                                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1">
                                                    <Flame size={10} /> {cliente.contratti_gas}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* CF / P.IVA */}
                                    {(cliente.codice_fiscale || cliente.partita_iva) && (
                                        <p className="text-xs font-mono text-gray-600 mb-2">
                                            {cliente.tipo === 'privato' ? 'CF' : 'P.IVA'}: {cliente.codice_fiscale || cliente.partita_iva}
                                        </p>
                                    )}

                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        {(cliente.email_principale || cliente.email_referente) && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} />
                                                <span className="truncate">{cliente.email_principale || cliente.email_referente}</span>
                                            </div>
                                        )}
                                        {(cliente.telefono_principale || cliente.telefono) && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} />
                                                <span>{cliente.telefono_principale || cliente.telefono}</span>
                                            </div>
                                        )}
                                        {cliente.citta && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} />
                                                <span>{cliente.citta} {cliente.provincia ? `(${cliente.provincia})` : ''}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                {cliente.num_contratti || 0} contratt{cliente.num_contratti === 1 ? 'o' : 'i'}
                                            </span>
                                            {cliente.newsletter_count > 0 && (
                                                <span className="text-xs text-purple-600 font-semibold" title={cliente.newsletter_nomi}>
                                                    📰 {cliente.newsletter_count} newsletter
                                                </span>
                                            )}
                                        </div>
                                        <ActionsMenu cliente={cliente} inline={true} />
                                    </div>
                                </div>
                                ))
                            }
                        </div>
                    )}

                    {/* VISTA GRIGLIA */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {loading ? (
                                <div className="col-span-full flex items-center justify-center py-8">
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        <span className="text-gray-600">Caricamento clienti...</span>
                                    </div>
                                </div>
                            ) : clienti.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    Nessun cliente trovato
                                </div>
                            ) : (
                                clienti.map((cliente) => (
                                <Link
                                    key={cliente.id}
                                    to={`/clienti/${cliente.id}`}
                                    className="card hover:shadow-lg transition-all text-center group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedClients.has(cliente.id)}
                                        onChange={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleSelectClient(cliente.id);
                                        }}
                                        className="absolute top-2 left-2 w-4 h-4"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                                        cliente.tipo === 'privato' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                                    } group-hover:scale-110 transition-transform`}>
                                        {cliente.tipo === 'privato' ? <User size={32} /> : <Building2 size={32} />}
                                    </div>
                                    <h4 className="font-semibold text-sm text-gray-900 mb-1 truncate">
                                        {cliente.tipo === 'privato' 
                                            ? `${cliente.nome} ${cliente.cognome}` 
                                            : cliente.ragione_sociale}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">{cliente.citta || 'N/D'}</p>
                                </Link>
                                ))
                            )}
                        </div>
                    )}

                    {/* VISTA LISTA */}
                    {viewMode === 'list' && (
                        <div className="card divide-y">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        <span className="text-gray-600">Caricamento clienti...</span>
                                    </div>
                                </div>
                            ) : clienti.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nessun cliente trovato
                                </div>
                            ) : (
                                clienti.map((cliente, index) => (
                                <div key={cliente.id || `list-${index}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedClients.has(cliente.id)}
                                        onChange={() => toggleSelectClient(cliente.id)}
                                        className="w-4 h-4"
                                    />
                                    <div className={`p-2 rounded-lg ${
                                        cliente.tipo === 'privato' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                                    }`}>
                                        {cliente.tipo === 'privato' ? <User size={20} /> : <Building2 size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">
                                            {cliente.tipo === 'privato' 
                                                ? `${cliente.nome} ${cliente.cognome}` 
                                                : cliente.ragione_sociale}
                                        </h4>
                                        <p className="text-sm text-gray-600 truncate">
                                            {cliente.email_principale || cliente.email_referente || 'Nessuna email'}
                                        </p>
                                    </div>
                                    <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Phone size={14} />
                                            {cliente.telefono_principale || cliente.telefono || 'N/D'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin size={14} />
                                            {cliente.citta || 'N/D'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FileText size={14} />
                                            {cliente.num_contratti || 0}
                                        </span>
                                    </div>
                                    <ActionsMenu cliente={cliente} inline={true} />
                                </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* VISTA TABELLA DETTAGLIATA */}
                    {viewMode === 'table' && (
                        <div className="card">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-full table-fixed">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="w-8 px-2 py-2 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClients.size === clienti.length && clienti.length > 0}
                                                    onChange={selectAllClients}
                                                    className="w-4 h-4"
                                                />
                                            </th>
                                            <th className="w-16 px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase hidden" title="Qualità Dati">Q</th>
                                            <th className="w-20 px-1 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                                            <th className="w-24 px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase truncate hidden">Cod.</th>
                <th className="w-48 px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Nome/Azienda</th>
                                            <th className="w-32 px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase truncate">CF/P.IVA</th>
                                            <th className="w-20 px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase" title="Contratti">⚡🔥</th>
                                            <th className="w-32 px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Agente</th>
                                            {/* 🔐 STATO: Solo Super Admin */}
                                            {isSuperAdmin && (
                                                <th className="w-40 px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Stato</th>
                                            )}
                                            <th className="w-16 px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Azioni</th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-8 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                    <span className="text-gray-600">Caricamento clienti...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : clienti.length === 0 ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-500">
                                                Nessun cliente trovato
                                            </td>
                                        </tr>
                                    ) : (
                                        clienti.map((cliente, index) => (
                                        <tr key={cliente.id || `cliente-${index}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-2 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClients.has(cliente.id)}
                                                    onChange={() => toggleSelectClient(cliente.id)}
                                                    className="w-4 h-4"
                                                />
                                            </td>
                                            <td className="px-1 py-2 hidden" title={cliente.incomplete_data ? `Dati incompleti: ${(cliente.missing_fields && JSON.parse(cliente.missing_fields || '[]').join(', ')) || 'Campi mancanti'}` : `Dati completi - Score: ${cliente.data_quality_score || 100}%`}>
                                                <div className="flex items-center justify-center">
                                                    <span className={`w-3 h-3 rounded-full ${cliente.incomplete_data ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                                </div>
                                            </td>
                                            <td className="px-1 py-2">
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    cliente.tipo === 'privato' 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-purple-100 text-purple-700'
                                                }`} title={cliente.tipo === 'privato' ? 'Privato' : 'Azienda'}>
                                                    {cliente.tipo === 'privato' ? <User size={10} /> : <Building2 size={10} />}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-xs font-mono text-indigo-600 font-semibold truncate hidden" title={cliente.codice_cliente}>
                                                {cliente.codice_cliente || '-'}
                                            </td>
                <td className="px-2 py-2 text-sm font-medium text-gray-900 truncate" title={formatDisplayName(cliente)}>
                    {formatDisplayName(cliente)}
                </td>
                                            <td className="px-2 py-2 text-xs font-mono text-gray-600 truncate" title={cliente.codice_fiscale || cliente.partita_iva}>
                                                {cliente.codice_fiscale || cliente.partita_iva || '-'}
                                            </td>
                                            <td className="px-1 py-2">
                                                <div className="flex justify-center gap-1">
                                                    {(cliente.contratti_luce || 0) > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded" title="Contratti Luce">
                                                            <Zap size={10} /> {cliente.contratti_luce}
                                                        </span>
                                                    )}
                                                    {(cliente.contratti_gas || 0) > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 text-white text-xs font-bold rounded" title="Contratti Gas">
                                                            <Flame size={10} /> {cliente.contratti_gas}
                                                        </span>
                                                    )}
                                                    {(cliente.contratti_luce || 0) === 0 && (cliente.contratti_gas || 0) === 0 && (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* 🔐 AGENTE: Operatori vedono solo testo, Admin può modificare */}
                                            <td className="px-2 py-2">
                                                {isOperatore ? (
                                                    // Operatori: solo visualizzazione
                                                    <span className="text-xs text-gray-700 truncate block">
                                                        {agenti.find(a => a.id === cliente.assigned_agent_id)?.nome} {agenti.find(a => a.id === cliente.assigned_agent_id)?.cognome || 'Non assegnato'}
                                                    </span>
                                                ) : (
                                                    // Admin/Super Admin: select modificabile
                                                    <select
                                                        value={cliente.assigned_agent_id || ''}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'new_agent') {
                                                                setShowCreateAgentModal(true);
                                                            } else if (e.target.value && e.target.value !== '') {
                                                                handleAssignAgent(cliente.id, cliente.tipo, e.target.value);
                                                            }
                                                        }}
                                                        className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500 truncate"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title={agenti.find(a => a.id === cliente.assigned_agent_id)?.nome + ' ' + agenti.find(a => a.id === cliente.assigned_agent_id)?.cognome}
                                                    >
                                                        <option value="">Non assegnato</option>
                                                        {agenti.map((agente, index) => (
                                                            <option key={agente.id || `agente-${index}`} value={agente.id}>
                                                                {agente.nome} {agente.cognome}
                                                            </option>
                                                        ))}
                                                        <option value="new_agent">➕ Nuovo</option>
                                                    </select>
                                                )}
                                            </td>
                                            {/* 🔐 STATO: Solo Super Admin */}
                                            {isSuperAdmin && (
                                                <td className="px-2 py-2">
                                                    <div className="flex flex-col gap-1">
                                                        {(() => {
                                                            const key = `${cliente.tipo}_${cliente.id}`;
                                                            const contratti = contrattiDettagli[key] || [];
                                                            if (contratti.length === 0) {
                                                                return (
                                                                    <span className="text-xs text-gray-500">Nessun contratto</span>
                                                                );
                                                            }
                                                            return contratti.map((ct: any, idx: number) => (
                                                                <div key={ct.id || `ct-${idx}`} className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-gray-600 truncate" title={`Contratto ${ct.tipo_contratto?.toUpperCase()} • ${ct.numero_contratto || ct.pod || ct.pdr || ''}`}>
                                                                        {ct.tipo_contratto === 'luce' ? 'LUCE' : 'GAS'} • {ct.numero_contratto || ct.pod || ct.pdr || `#${idx+1}`}
                                                                    </span>
                                                                    <select
                                                                        value={contrattiStati[ct.id] || ''}
                                                                        onChange={(e) => {
                                                                            const nuovo = e.target.value;
                                                                            if (!nuovo) return;
                                                                            setContrattiStati(prev => ({ ...prev, [ct.id]: nuovo }));
                                                                            // Apri la modale di cambio stato (flusso originale)
                                                                            handleChangeStato(cliente.id, cliente.tipo, nuovo, ct.tipo_contratto);
                                                                        }}
                                                                        className="flex-1 text-xs border rounded px-1 py-1 focus:ring-1 bg-gray-50 border-gray-300 text-gray-700 truncate"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        title={`Stato contratto ${ct.tipo_contratto?.toUpperCase()}`}
                                                                    >
                                                                        <option value="" disabled>Seleziona stato...</option>
                                                                        <option value="In compilazione">In compilazione</option>
                                                                        <option value="Documenti da validare">Documenti da validare</option>
                                                                        <option value="Documenti da correggere">Documenti da correggere</option>
                                                                        <option value="Precheck KO">Precheck KO</option>
                                                                        <option value="Credit KO">Credit KO</option>
                                                                        <option value="In attesa">In attesa</option>
                                                                        <option value="Da attivare">Da attivare</option>
                                                                        <option value="Attivo">Attivo</option>
                                                                        <option value="Chiusa">Chiusa</option>
                                                                    </select>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-1 py-2">
                                                <ActionsMenu cliente={cliente} />
                                            </td>
                                        </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Footer con info */}
            {!loading && clienti.length > 0 && (
                <div className="card">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div>
                            Visualizzati <strong>{clienti.length}</strong> clienti{total > 0 ? <> su <strong>{total}</strong></> : null}
                            {selectedClients.size > 0 && (
                                <> • <strong>{selectedClients.size}</strong> selezionati</>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs">Vista:</span>
                            <strong className="capitalize">{
                                viewMode === 'cards' ? 'Cards' :
                                viewMode === 'grid' ? 'Griglia' :
                                viewMode === 'list' ? 'Lista' :
                                'Tabella Dettagliata'
                            }</strong>
                            {/* Paginazione numerica */}
                            <div className="ml-4 flex items-center gap-1">
                                {/* Prev */}
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handlePageClick(Math.max(1, page - 1))}
                                    disabled={loading || page <= 1}
                                >
                                    ‹
                                </button>
                                {/* Numeri di pagina compatti attorno alla corrente */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                                    .map((pNum) => (
                                        <button
                                            key={pNum}
                                            className={`btn btn-secondary ${pNum === page ? 'bg-blue-600 text-white' : ''}`}
                                            onClick={() => handlePageClick(pNum)}
                                            disabled={loading || pNum === page}
                                        >
                                            {pNum}
                                        </button>
                                    ))}
                                {/* Next */}
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handlePageClick(Math.min(totalPages, page + 1))}
                                    disabled={loading || page >= totalPages}
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale Invia Email */}
            {selectedClientForEmail && (
                <EmailComposeModal
                    isOpen={showEmailModal}
                    onClose={() => {
                        setShowEmailModal(false);
                        setSelectedClientForEmail(null);
                    }}
                    cliente={selectedClientForEmail}
                    onEmailSent={() => {
                        loadClienti(); // Ricarica lista per aggiornare data_ultimo_contatto
                    }}
                />
            )}

            {/* Modale CSV Import */}
                <ImportClientiModal
                    isOpen={showCSVImportModal}
                    onClose={() => setShowCSVImportModal(false)}
                    onImportComplete={() => loadClienti()}
                />

            {/* Modale WooCommerce Import */}
            <WooCommerceImportModal
                isOpen={showWooCommerceImportModal}
                onClose={() => setShowWooCommerceImportModal(false)}
                onImportComplete={() => loadClienti()}
            />

            {/* Modale Unified Import (beta) */}
            <UnifiedImportModal
                isOpen={showUnifiedImportModal}
                onClose={() => setShowUnifiedImportModal(false)}
                onImportComplete={() => loadClienti()}
            />

            {/* Modale Crea Agente */}
            <CreateAgentModal
                isOpen={showCreateAgentModal}
                onClose={() => setShowCreateAgentModal(false)}
                onSuccess={(newAgent) => {
                    loadAgenti(); // Ricarica lista agenti
                }}
            />

            {/* Modale Cambio Stato Contratto */}
            {showStatoModal && clientePerStato && (
                <StatoContrattoModal
                    cliente={clientePerStato}
                    nuovoStato={nuovoStatoSelezionato}
                    contratti={contrattiCliente}
                    onClose={() => {
                        setShowStatoModal(false);
                        setClientePerStato(null);
                        setNuovoStatoSelezionato('');
                        setContrattiCliente([]);
                    }}
                    onUpdate={handleUpdateStatoContratto}
                />
            )}

            {/* Modale Assegnazione Agente Avanzata */}
            {showAssegnaAgenteModal && clientePerAssegnazione && (
                <AssegnaAgenteAvanzatoModal
                    onClose={() => {
                        setShowAssegnaAgenteModal(false);
                        setClientePerAssegnazione(null);
                    }}
                    clienteId={clientePerAssegnazione.id}
                    clienteTipo={clientePerAssegnazione.tipo}
                    agenteAttualeId={clientePerAssegnazione.assigned_agent_id}
                    onConfirm={async (agenteId, commissioneLuce, commissioneGas) => {
                        try {
                            const payload = {
                                cliente_id: clientePerAssegnazione.id,
                                cliente_tipo: clientePerAssegnazione.tipo,
                                new_agent_id: agenteId,
                                commissione_luce: commissioneLuce,
                                commissione_gas: commissioneGas,
                                use_separate_commissions: true,
                                motivo: 'Assegnazione avanzata da interfaccia'
                            };
                            
                            console.log('📤 Invio assegnazione agente avanzata:', payload);
                            
                            const response = await fetch('/api/agenti/assign-cliente', {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify(payload)
                            });

                            const data = await response.json();
                            
                            if (data.success) {
                                toast.success(`Cliente assegnato con commissioni separate: Luce €${commissioneLuce}, Gas €${commissioneGas}!`);
                                loadClienti(); // Ricarica lista
                                setShowAssegnaAgenteModal(false);
                                setClientePerAssegnazione(null);
                            } else {
                                toast.error(data.message || 'Errore assegnazione');
                            }
                        } catch (error) {
                            console.error('Errore:', error);
                            toast.error('Errore durante l\'assegnazione');
                        }
                    }}
                />
            )}
        </div>
    );
}
