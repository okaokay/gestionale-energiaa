/**
 * Pagina COMPLETA Gestione Contratti
 * Con compilazione manuale e AI, stati, azioni
 */

import { useEffect, useState } from 'react';
import { 
    FileText, Plus, Download, Mail, MessageSquare, Edit, Trash2,
    Filter, Search, Zap, Flame, Building2, User, ChevronDown,
    FileCheck, AlertCircle, CheckCircle, XCircle, Clock, Send, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ContractCompileManualModal from '../components/ContractCompileManualModal';
import ContractCompileAIModal from '../components/ContractCompileAIModal';

export default function ContrattiGestionePage() {
    const [contratti, setContratti] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompileMenu, setShowCompileMenu] = useState(false);
    const [showCompileModal, setShowCompileModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [showUploadTemplateModal, setShowUploadTemplateModal] = useState(false);
    const [filtroStato, setFiltroStato] = useState('tutti');
    const [filtroFornitore, setFiltroFornitore] = useState('tutti');
    const [search, setSearch] = useState('');
    
    // ⭐ Stati per gestione template
    const [activeTab, setActiveTab] = useState<'contratti' | 'template'>('contratti');
    const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [showCampiAIModal, setShowCampiAIModal] = useState(false);
    const [selectedTemplateCampi, setSelectedTemplateCampi] = useState<any>(null);

    // Stati disponibili con colori
    const statiConfig: { [key: string]: { label: string; color: string; icon: any } } = {
        'in_compilazione': { label: 'In Compilazione', color: 'bg-blue-100 text-blue-800', icon: Clock },
        'documenti_da_validare': { label: 'Documenti da Validare', color: 'bg-yellow-100 text-yellow-800', icon: FileCheck },
        'documenti_da_correggere': { label: 'Da Correggere', color: 'bg-red-100 text-red-800', icon: XCircle },
        'da_attivare': { label: 'Da Attivare', color: 'bg-green-100 text-green-800', icon: CheckCircle },
        'precheck_ko': { label: 'Precheck KO', color: 'bg-red-100 text-red-800', icon: AlertCircle },
        'chiusa': { label: 'Chiusa', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
        'credit_check_ko': { label: 'Credit Check KO', color: 'bg-red-100 text-red-800', icon: XCircle },
        'attesa_postalizzazione': { label: 'In Attesa Postalizzazione', color: 'bg-purple-100 text-purple-800', icon: Send }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const [contrattiRes, templatesRes] = await Promise.all([
                axios.get('/api/contratti-compilazione', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('/api/contratti-gestione/templates', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setContratti(contrattiRes.data.data || []);
            setTemplates(templatesRes.data.data || []);
        } catch (error: any) {
            console.error('Errore caricamento:', error);
            toast.error('Errore durante il caricamento');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeStato = async (contractId: string, nuovoStato: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `/api/contratti-compilazione/${contractId}/stato`,
                { stato: nuovoStato },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success('Stato contratto aggiornato');
            loadData();
        } catch (error: any) {
            console.error('Errore cambio stato:', error);
            toast.error('Errore durante il cambio di stato');
        }
    };

    const handleSendEmail = async (contratto: any) => {
        const email = prompt('Inserisci email destinatario:', contratto.cliente_email || '');
        if (!email) return;

        const messaggio = prompt('Messaggio (opzionale):', 'In allegato il contratto compilato.');

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `/api/contratti-pdf/send-email/${contratto.id}`,
                { email_destinatario: email, messaggio },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success('📧 Email inviata con successo!');
            loadData();
        } catch (error: any) {
            console.error('Errore invio email:', error);
            toast.error('Errore durante l\'invio dell\'email');
        }
    };

    const handleSendWhatsApp = async (contratto: any) => {
        const telefono = prompt('Inserisci numero WhatsApp:', contratto.cliente_telefono || '');
        if (!telefono) return;

        const messaggio = prompt('Messaggio (opzionale):', 'Ecco il tuo contratto compilato');

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `/api/contratti-pdf/send-whatsapp/${contratto.id}`,
                { numero_telefono: telefono, messaggio },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success('💬 WhatsApp inviato con successo!');
            loadData();
        } catch (error: any) {
            console.error('Errore invio WhatsApp:', error);
            toast.error('Errore durante l\'invio WhatsApp');
        }
    };

    const handleDownload = async (contratto: any) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `/api/contratti-pdf/download/${contratto.id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );
            
            // Crea link per download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contratto_${contratto.numero_contratto}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success('📥 PDF scaricato con successo!');
        } catch (error: any) {
            console.error('Errore download:', error);
            toast.error('Errore durante il download del PDF');
        }
    };

    const handleDelete = async (contractId: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo contratto?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `/api/contratti-compilazione/${contractId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success('Contratto eliminato');
            loadData();
        } catch (error: any) {
            console.error('Errore eliminazione:', error);
            toast.error('Errore durante l\'eliminazione');
        }
    };

    // ⭐ ======= GESTIONE TEMPLATE =======

    const handlePreviewTemplate = async (template: any) => {
        try {
            const token = localStorage.getItem('token');
            
            // Scarica il PDF con autenticazione
            const response = await axios.get(
                `/api/contratti-gestione/templates/${template.id}/preview`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );
            
            // Crea un URL blob per visualizzarlo nell'iframe
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = window.URL.createObjectURL(blob);
            
            setPreviewUrl(blobUrl);
            setShowPreviewModal(true);
        } catch (error: any) {
            console.error('Errore preview:', error);
            toast.error('Errore durante la visualizzazione del template');
        }
    };

    const handleEditTemplate = (template: any) => {
        setSelectedTemplate(template);
        setShowEditTemplateModal(true);
    };

    const handleSaveTemplateEdit = async (updatedData: any) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `/api/contratti-gestione/templates/${selectedTemplate.id}`,
                updatedData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success('Template aggiornato con successo!');
            setShowEditTemplateModal(false);
            setSelectedTemplate(null);
            loadData();
        } catch (error: any) {
            console.error('Errore modifica template:', error);
            toast.error('Errore durante la modifica del template');
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo template?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `/api/contratti-gestione/templates/${templateId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success('Template eliminato con successo!');
            loadData();
        } catch (error: any) {
            console.error('Errore eliminazione template:', error);
            toast.error('Errore durante l\'eliminazione del template');
        }
    };

    const handleViewCampiAI = (template: any) => {
        setSelectedTemplateCampi(template);
        setShowCampiAIModal(true);
    };

    // Filtra contratti
    const contrattiFiltered = contratti.filter(c => {
        if (filtroStato !== 'tutti' && c.stato !== filtroStato) return false;
        if (filtroFornitore !== 'tutti' && c.fornitore !== filtroFornitore) return false;
        if (search && !c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) && 
            !c.numero_contratto?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // Ottieni fornitori unici
    const fornitori = Array.from(new Set(contratti.map(c => c.fornitore).filter(Boolean)));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento contratti...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestione Contratti</h1>
                    <p className="text-gray-600 mt-1">Compila, gestisci e monitora tutti i contratti</p>
                </div>

                {/* Pulsanti azioni */}
                <div className="flex items-center gap-3">
                    {/* Pulsante Carica Modello */}
                    <button
                        onClick={() => setShowUploadTemplateModal(true)}
                        className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                        <FileText size={20} />
                        <span className="font-semibold">Carica Modello</span>
                    </button>

                    {/* Pulsante Compila Contratto */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCompileMenu(!showCompileMenu)}
                            className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 shadow-lg"
                        >
                            <Plus size={20} />
                            <span className="font-semibold">Compila Contratto</span>
                            <ChevronDown size={18} />
                        </button>

                        {showCompileMenu && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            setShowCompileModal(true);
                                            setShowCompileMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-3"
                                    >
                                        <Edit className="text-blue-600" size={20} />
                                        <div>
                                            <p className="font-semibold text-gray-900">Compilazione Manuale</p>
                                            <p className="text-xs text-gray-500">Inserisci i dati a mano</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAIModal(true);
                                            setShowCompileMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-3"
                                    >
                                        <Zap className="text-purple-600" size={20} />
                                        <div>
                                            <p className="font-semibold text-gray-900">Compilazione con AI</p>
                                            <p className="text-xs text-gray-500">Carica PDF/immagini</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ⭐ TAB NAVIGATION */}
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('contratti')}
                    className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                        activeTab === 'contratti'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <FileCheck size={20} />
                        <span>Contratti</span>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{contratti.length}</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('template')}
                    className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                        activeTab === 'template'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={20} />
                        <span>Gestione Template</span>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{templates.length}</span>
                    </div>
                </button>
            </div>

            {/* ⭐ CONTENUTO TAB - CONTRATTI */}
            {activeTab === 'contratti' && (
                <>
                    {/* Filtri e Ricerca */}
                    <div className="card p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Ricerca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca cliente o numero..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Filtro Stato */}
                    <select
                        value={filtroStato}
                        onChange={(e) => setFiltroStato(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="tutti">Tutti gli stati</option>
                        {Object.entries(statiConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    {/* Filtro Fornitore */}
                    <select
                        value={filtroFornitore}
                        onChange={(e) => setFiltroFornitore(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="tutti">Tutti i fornitori</option>
                        {fornitori.map((f: string) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>

                    {/* Statistiche */}
                    <div className="flex items-center justify-end gap-4">
                        <span className="text-sm text-gray-600">
                            <strong>{contrattiFiltered.length}</strong> di <strong>{contratti.length}</strong> contratti
                        </span>
                    </div>
                </div>
            </div>

            {/* Lista Contratti */}
            {contrattiFiltered.length === 0 ? (
                <div className="card p-12 text-center">
                    <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun Contratto Trovato</h3>
                    <p className="text-gray-500 mb-6">
                        {search || filtroStato !== 'tutti' || filtroFornitore !== 'tutti'
                            ? 'Prova a modificare i filtri di ricerca'
                            : 'Inizia compilando il primo contratto'}
                    </p>
                    {!search && filtroStato === 'tutti' && filtroFornitore === 'tutti' && (
                        <button
                            onClick={() => setShowCompileMenu(true)}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus size={18} className="inline mr-2" />
                            Compila Primo Contratto
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {contrattiFiltered.map((contratto: any) => {
                        const StatoIcon = statiConfig[contratto.stato]?.icon || AlertCircle;
                        const statoConfig = statiConfig[contratto.stato] || statiConfig['in_compilazione'];

                        return (
                            <div key={contratto.id} className="card p-6 hover:shadow-xl transition-shadow">
                                <div className="flex items-start justify-between">
                                    {/* Info Principale */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            {/* Icona tipo */}
                                            {contratto.categoria === 'luce' ? (
                                                <div className="p-2 bg-yellow-100 rounded-lg">
                                                    <Zap size={24} className="text-yellow-600" />
                                                </div>
                                            ) : contratto.categoria === 'gas' ? (
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <Flame size={24} className="text-blue-600" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <FileText size={24} className="text-purple-600" />
                                                </div>
                                            )}

                                            {/* Nome cliente e tipo */}
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{contratto.cliente_nome}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    {contratto.cliente_tipo === 'privato' ? (
                                                        <User size={14} />
                                                    ) : (
                                                        <Building2 size={14} />
                                                    )}
                                                    <span className="capitalize">{contratto.cliente_tipo}</span>
                                                    <span>•</span>
                                                    <span className="font-mono text-xs">{contratto.numero_contratto}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dettagli */}
                                        <div className="grid grid-cols-3 gap-4 mt-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Fornitore</p>
                                                <p className="font-semibold text-gray-900">{contratto.fornitore}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Template</p>
                                                <p className="font-semibold text-gray-900">{contratto.template_nome || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Creato il</p>
                                                <p className="font-semibold text-gray-900">
                                                    {new Date(contratto.created_at).toLocaleDateString('it-IT')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stato e Azioni */}
                                    <div className="flex flex-col items-end gap-3">
                                        {/* Stato */}
                                        <select
                                            value={contratto.stato}
                                            onChange={(e) => handleChangeStato(contratto.id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-sm font-semibold ${statoConfig.color} border-none cursor-pointer`}
                                        >
                                            {Object.entries(statiConfig).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>

                                        {/* Azioni */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDownload(contratto)}
                                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="Scarica PDF"
                                            >
                                                <Download size={18} className="text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => handleSendEmail(contratto)}
                                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                                title="Invia Email"
                                            >
                                                <Mail size={18} className="text-green-600" />
                                            </button>
                                            <button
                                                onClick={() => handleSendWhatsApp(contratto)}
                                                className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                                                title="Invia WhatsApp"
                                            >
                                                <MessageSquare size={18} className="text-emerald-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contratto.id)}
                                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Elimina"
                                            >
                                                <Trash2 size={18} className="text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
                </>
            )}

            {/* ⭐ CONTENUTO TAB - GESTIONE TEMPLATE */}
            {activeTab === 'template' && (
                <div className="space-y-4">
                    {/* Header Sezione */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <h2 className="text-xl font-bold text-green-900 mb-1">📄 I tuoi Template PDF</h2>
                        <p className="text-sm text-green-700">Gestisci i modelli di contratto caricati. Puoi visualizzare, modificare o eliminare i template.</p>
                    </div>

                    {/* Lista Template */}
                    {templates.length === 0 ? (
                        <div className="card p-12 text-center">
                            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun template caricato</h3>
                            <p className="text-gray-500 mb-6">Carica il tuo primo modello PDF per iniziare</p>
                            <button
                                onClick={() => setShowUploadTemplateModal(true)}
                                className="btn bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2"
                            >
                                <FileText size={20} />
                                Carica Modello
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((template: any) => {
                                const campiEstratti = template.campi_estratti; // Già parsato dal backend
                                const totaleCampi = campiEstratti?.totale_campi || 0;
                                
                                return (
                                    <div key={template.id} className="card hover:shadow-xl transition-shadow">
                                        {/* Header Card */}
                                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-t-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-white mb-1">{template.nome}</h3>
                                                    <p className="text-green-100 text-sm">🏭 {template.fornitore}</p>
                                                </div>
                                                {template.categoria === 'luce' && <Zap size={24} className="text-yellow-300" />}
                                                {template.categoria === 'gas' && <Flame size={24} className="text-orange-300" />}
                                                {template.categoria === 'dual' && (
                                                    <div className="flex gap-1">
                                                        <Zap size={20} className="text-yellow-300" />
                                                        <Flame size={20} className="text-orange-300" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Body Card */}
                                        <div className="p-4 space-y-3">
                                            {/* Info */}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-gray-500 text-xs">Tipo Cliente</p>
                                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                                        {template.tipo_cliente === 'domestico' ? (
                                                            <><User size={14} /> Domestico</>
                                                        ) : (
                                                            <><Building2 size={14} /> Business</>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Categoria</p>
                                                    <p className="font-semibold text-gray-900 capitalize">{template.categoria}</p>
                                                </div>
                                            </div>

                                            {/* Campi Estratti */}
                                            {totaleCampi > 0 && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-blue-800 font-semibold">
                                                            🤖 AI Analizzato: <span className="text-blue-600">{totaleCampi} campi</span>
                                                        </p>
                                                        <button
                                                            onClick={() => handleViewCampiAI(template)}
                                                            className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
                                                        >
                                                            Vedi tutti
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Data Creazione */}
                                            <div className="text-xs text-gray-500">
                                                Caricato il {new Date(template.created_at).toLocaleDateString('it-IT')}
                                            </div>

                                            {/* Azioni */}
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => handlePreviewTemplate(template)}
                                                    className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                                                    title="Visualizza PDF"
                                                >
                                                    <FileText size={16} />
                                                    Visualizza
                                                </button>
                                                <button
                                                    onClick={() => handleEditTemplate(template)}
                                                    className="flex-1 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                                                    title="Modifica Template"
                                                >
                                                    <Edit size={16} />
                                                    Modifica
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                                                    title="Elimina Template"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ======= MODALI ======= */}

            {/* Modal Compilazione Manuale */}
            {showCompileModal && (
                <ContractCompileManualModal
                    templates={templates}
                    onClose={() => setShowCompileModal(false)}
                    onSuccess={() => {
                        setShowCompileModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Modal Compilazione AI */}
            {showAIModal && (
                <ContractCompileAIModal
                    templates={templates}
                    onClose={() => setShowAIModal(false)}
                    onSuccess={() => {
                        setShowAIModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Modal Upload Modello */}
            {showUploadTemplateModal && (
                <UploadTemplateModal
                    onClose={() => setShowUploadTemplateModal(false)}
                    onSuccess={() => {
                        setShowUploadTemplateModal(false);
                        loadData();
                    }}
                />
            )}

            {/* ⭐ Modal Modifica Template */}
            {showEditTemplateModal && selectedTemplate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 flex items-center justify-between rounded-t-xl">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Edit size={24} />
                                Modifica Template
                            </h2>
                            <button
                                onClick={() => setShowEditTemplateModal(false)}
                                className="text-white hover:bg-white/20 p-2 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    📝 Nome Template
                                </label>
                                <input
                                    type="text"
                                    defaultValue={selectedTemplate.nome}
                                    id="edit-nome"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    🏭 Fornitore
                                </label>
                                <input
                                    type="text"
                                    defaultValue={selectedTemplate.fornitore}
                                    id="edit-fornitore"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    ⚡ Categoria
                                </label>
                                <select
                                    defaultValue={selectedTemplate.categoria}
                                    id="edit-categoria"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="luce">⚡ Luce</option>
                                    <option value="gas">🔥 Gas</option>
                                    <option value="dual">⚡🔥 Dual</option>
                                </select>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={() => setShowEditTemplateModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => {
                                    const nome = (document.getElementById('edit-nome') as HTMLInputElement).value;
                                    const fornitore = (document.getElementById('edit-fornitore') as HTMLInputElement).value;
                                    const categoria = (document.getElementById('edit-categoria') as HTMLSelectElement).value;
                                    handleSaveTemplateEdit({ nome, fornitore, categoria });
                                }}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold"
                            >
                                Salva Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ⭐ Modal Preview PDF */}
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-6xl w-full h-5/6 shadow-2xl flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileText size={24} />
                                Anteprima Template PDF
                            </h2>
                            <button
                                onClick={() => {
                                    // Cleanup blob URL
                                    if (previewUrl.startsWith('blob:')) {
                                        window.URL.revokeObjectURL(previewUrl);
                                    }
                                    setShowPreviewModal(false);
                                    setPreviewUrl('');
                                }}
                                className="text-white hover:bg-white/20 p-2 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-hidden">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border border-gray-300 rounded-lg"
                                title="Preview PDF"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ⭐ Modal Campi AI Analizzati */}
            {showCampiAIModal && selectedTemplateCampi && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    🤖 Campi Analizzati dall'AI
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">
                                    {selectedTemplateCampi.nome} - {selectedTemplateCampi.fornitore}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCampiAIModal(false);
                                    setSelectedTemplateCampi(null);
                                }}
                                className="text-white hover:bg-white/20 p-2 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-6">
                            {(() => {
                                const campiEstratti = selectedTemplateCampi.campi_estratti;
                                const campiPDF = campiEstratti?.campi || {}; // CORRETTO: era campi_pdf, ora campi
                                const campiArray = Object.entries(campiPDF);
                                
                                if (campiArray.length === 0) {
                                    return (
                                        <div className="text-center py-12">
                                            <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-600">Nessun campo analizzato</p>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div className="space-y-4">
                                        {/* Info Header */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div>
                                                    <p className="text-2xl font-bold text-blue-600">{campiArray.length}</p>
                                                    <p className="text-sm text-blue-800">Campi Totali</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {campiArray.filter(([_, info]: any) => info.tipo === 'PDFTextField').length}
                                                    </p>
                                                    <p className="text-sm text-green-800">Campi Testo</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {campiArray.filter(([_, info]: any) => info.tipo === 'PDFCheckBox' || info.tipo === 'PDFRadioGroup').length}
                                                    </p>
                                                    <p className="text-sm text-purple-800">Checkbox/Radio</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lista Campi */}
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-gray-900 text-lg mb-3">📋 Elenco Completo Campi</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {campiArray.map(([nomeCampo, info]: any, index) => (
                                                    <div 
                                                        key={index}
                                                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-900 truncate" title={nomeCampo}>
                                                                    {nomeCampo}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                                        info.tipo === 'PDFTextField' 
                                                                            ? 'bg-green-100 text-green-800' 
                                                                            : 'bg-purple-100 text-purple-800'
                                                                    }`}>
                                                                        {info.tipo === 'PDFTextField' ? '📝 Testo' : '☑️ Check'}
                                                                    </span>
                                                                    {info.maxLength && (
                                                                        <span className="text-xs text-gray-600">
                                                                            Max: {info.maxLength} caratteri
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="text-xs text-gray-400 font-mono">
                                                                #{index + 1}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Data Analisi */}
                                        {campiEstratti?.data_analisi && (
                                            <div className="mt-6 pt-4 border-t border-gray-200">
                                                <p className="text-sm text-gray-500 text-center">
                                                    📅 Analisi effettuata il {new Date(campiEstratti.data_analisi).toLocaleString('it-IT')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowCampiAIModal(false);
                                    setSelectedTemplateCampi(null);
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Modal Upload Template inline
function UploadTemplateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [nome, setNome] = useState('');
    const [tipoCliente, setTipoCliente] = useState<'domestico' | 'business'>('domestico');
    const [tipoContratto, setTipoContratto] = useState<'luce' | 'gas' | 'dual'>('dual');
    const [fornitore, setFornitore] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            if (!nome) {
                setNome(selectedFile.name.replace('.pdf', ''));
            }
        } else {
            toast.error('Seleziona un file PDF valido');
        }
    };

    const handleUpload = async () => {
        if (!file || !nome || !fornitore) {
            toast.error('Compila tutti i campi obbligatori');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('nome', nome);
            formData.append('tipo_cliente', tipoCliente);
            formData.append('categoria', tipoContratto); // Manteniamo 'categoria' per compatibilità backend
            formData.append('fornitore', fornitore);

            await axios.post('/api/contratti-gestione/templates/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Modello caricato con successo!');
            onSuccess();
        } catch (error: any) {
            console.error('Errore upload:', error);
            // Mostra il messaggio specifico dal backend se disponibile
            const errorMessage = error.response?.data?.message || 'Errore durante il caricamento del modello';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText size={28} />
                        Carica Nuovo Modello PDF
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Upload File */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📁 File PDF Modello *
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        {file && (
                            <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>
                        )}
                    </div>

                    {/* Fornitore - PRIMO E PROMINENTE */}
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <label className="block text-base font-bold text-gray-900 mb-2">
                            🏭 Fornitore Energia * (OBBLIGATORIO)
                        </label>
                        <input
                            type="text"
                            value={fornitore}
                            onChange={(e) => setFornitore(e.target.value)}
                            placeholder="es. ALPERIA, ENEL, ENI, A2A, Edison..."
                            className="w-full px-4 py-3 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 text-lg font-semibold"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            ⚠️ Inserisci il nome del fornitore esattamente come appare nel contratto
                        </p>
                    </div>

                    {/* Nome Modello */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📝 Nome Modello *
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="es. Contratto Standard ALPERIA"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Tipo Cliente e Tipo Contratto */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                👥 Tipo Cliente *
                            </label>
                            <select
                                value={tipoCliente}
                                onChange={(e) => setTipoCliente(e.target.value as 'domestico' | 'business')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option value="domestico">👤 Domestico (Privati)</option>
                                <option value="business">🏢 Business (Aziende)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                ⚡ Tipo Contratto *
                            </label>
                            <select
                                value={tipoContratto}
                                onChange={(e) => setTipoContratto(e.target.value as 'luce' | 'gas' | 'dual')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option value="dual">⚡🔥 Dual (Luce + Gas)</option>
                                <option value="luce">⚡ Solo Luce</option>
                                <option value="gas">🔥 Solo Gas</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Suggerimento:</strong> Se il PDF contiene campi sia per luce che per gas (es. POD e PDR), seleziona "Dual (Luce + Gas)"
                        </p>
                    </div>
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
                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || !nome || !fornitore}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Caricamento...
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Carica Modello
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

