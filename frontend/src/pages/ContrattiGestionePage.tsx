/**
 * Pagina COMPLETA Gestione Contratti
 * Con compilazione manuale e AI, stati, azioni
 */

import { useEffect, useState } from 'react';
import { 
    FileText, Plus, Download, Mail, MessageSquare, Edit, Trash2,
    Filter, Search, Zap, Flame, Building2, User, ChevronDown,
    FileCheck, AlertCircle, CheckCircle, XCircle, Clock, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function ContrattiGestionePage() {
    const [contratti, setContratti] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompileMenu, setShowCompileMenu] = useState(false);
    const [showCompileModal, setShowCompileModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [filtroStato, setFiltroStato] = useState('tutti');
    const [filtroFornitore, setFiltroFornitore] = useState('tutti');
    const [search, setSearch] = useState('');

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

    const handleSendEmail = (contratto: any) => {
        toast('Invio email in sviluppo');
    };

    const handleSendWhatsApp = (contratto: any) => {
        toast('Invio WhatsApp in sviluppo');
    };

    const handleDownload = (contratto: any) => {
        toast('Download PDF in sviluppo');
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

            {/* Modal Compilazione Manuale */}
            {showCompileModal && (
                <CompileManualModal
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
                <CompileAIModal
                    templates={templates}
                    onClose={() => setShowAIModal(false)}
                    onSuccess={() => {
                        setShowAIModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// Modal Compilazione Manuale (placeholder - da completare)
function CompileManualModal({ templates, onClose, onSuccess }: any) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Compilazione Manuale - In Sviluppo</h2>
                <p className="text-gray-600 mb-6">Questa funzione sarà disponibile a breve...</p>
                <button onClick={onClose} className="btn bg-gray-500 hover:bg-gray-600 text-white">
                    Chiudi
                </button>
            </div>
        </div>
    );
}

// Modal Compilazione AI (placeholder - da completare)
function CompileAIModal({ templates, onClose, onSuccess }: any) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Compilazione con AI - In Sviluppo</h2>
                <p className="text-gray-600 mb-6">Questa funzione sarà disponibile a breve...</p>
                <button onClick={onClose} className="btn bg-gray-500 hover:bg-gray-600 text-white">
                    Chiudi
                </button>
            </div>
        </div>
    );
}




