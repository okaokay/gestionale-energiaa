import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { offerteAPI, configurazioniAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Upload, Zap, Trash2, Users, Calendar, TrendingUp, Eye, AlertCircle, Settings, X, FileText } from 'lucide-react';
import PDFViewerModal from '../components/PDFViewerModal';

export default function OffertePage() {
    const [offerte, setOfferte] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showAIConfig, setShowAIConfig] = useState(false);
    const [showPDFViewer, setShowPDFViewer] = useState(false);
    const [selectedOffertaForPDF, setSelectedOffertaForPDF] = useState<{ id: string; nome: string } | null>(null);
    const [aiConfig, setAIConfig] = useState({
        ai_provider: 'groq',
        groq_api_key: '',
        groq_model: 'llama-3.3-70b-versatile',
        ollama_url: 'http://185.31.67.249/api/generate',
        ollama_model: 'llama3:8b'
    });
    const [saving, setSaving] = useState(false);
    const [rieseguendoMatching, setRieseguendoMatching] = useState(false);
    const { user } = useAuthStore();
    const isSuperAdmin = user?.ruolo === 'super_admin';
    const isAdmin = user?.ruolo === 'admin' || isSuperAdmin;
    
    useEffect(() => {
        loadOfferte();
    }, []);
    
    const loadOfferte = async () => {
        try {
            const response = await offerteAPI.getAll({ stato: 'attiva' });
            setOfferte(response.data.data);
        } catch (error) {
            toast.error('Errore caricamento offerte');
        } finally {
            setLoading(false);
        }
    };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            toast.error('Solo file PDF sono ammessi');
            return;
        }
        
        setUploading(true);
        const toastId = toast.loading('📄 Caricamento PDF in corso...');
        
        try {
            const response = await offerteAPI.uploadPDF(file);
            toast.dismiss(toastId);
            toast.success(`✅ Offerta caricata! ${response.data.data.match_count} clienti eligibili trovati`, {
                duration: 4000
            });
            loadOfferte();
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.response?.data?.message || 'Errore upload PDF');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };
    
    const handleDelete = async (offertaId: string, nomeOfferta: string) => {
        if (!confirm(`Sei sicuro di voler eliminare l'offerta "${nomeOfferta}"?\n\nQuesta azione è irreversibile!`)) {
            return;
        }
        
        setDeleting(offertaId);
        try {
            await offerteAPI.delete(offertaId);
            toast.success('✅ Offerta eliminata con successo');
            loadOfferte();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore eliminazione offerta');
        } finally {
            setDeleting(null);
        }
    };
    
    const loadAIConfig = async () => {
        try {
            const response = await configurazioniAPI.getByCategoria('ai');
            const configs = response.data.data;
            
            const newConfig: any = { ...aiConfig };
            for (const c of configs) {
                if (c.chiave in newConfig) {
                    // NON mostrare la chiave API esistente per sicurezza
                    if (c.chiave === 'groq_api_key' && c.valore && c.valore.startsWith('gsk_')) {
                        newConfig[c.chiave] = ''; // Lascia vuoto ma ricorda che esiste
                        newConfig._existing_key = true; // Flag interno
                    } else {
                        newConfig[c.chiave] = c.valore;
                    }
                }
            }
            setAIConfig(newConfig);
        } catch (error) {
            console.error('Errore caricamento config AI:', error);
        }
    };
    
    const handleSaveAIConfig = async () => {
        // Verifica solo se NON esiste una chiave già configurata
        if (aiConfig.ai_provider === 'groq' && !aiConfig.groq_api_key.trim() && !(aiConfig as any)._existing_key) {
            toast.error('Inserisci API Key Groq');
            return;
        }
        
        setSaving(true);
        try {
            // Filtra solo le configurazioni da salvare (escludi chiavi vuote se esiste già una chiave)
            const configurazioni = Object.entries(aiConfig)
                .filter(([chiave, valore]) => {
                    // Escludi il flag interno
                    if (chiave === '_existing_key') return false;
                    // Se è la chiave API ed è vuota ma esiste già, non inviarla
                    if (chiave === 'groq_api_key' && !valore && (aiConfig as any)._existing_key) return false;
                    return true;
                })
                .map(([chiave, valore]) => ({
                    chiave,
                    valore: valore as string
                }));
            
            console.log('📤 Invio configurazioni:', configurazioni);
            
            await configurazioniAPI.updateMany(configurazioni);
            
            toast.success('✅ Configurazione AI salvata!');
            setShowAIConfig(false);
        } catch (error: any) {
            console.error('❌ Errore:', error.response?.data);
            toast.error(error.response?.data?.message || 'Errore salvataggio configurazione');
        } finally {
            setSaving(false);
        }
    };
    
    const handleRieseguiMatchingGlobale = async () => {
        if (!confirm('Rieseguire il matching AI per tutte le offerte attive?\n\nQuesta operazione eliminerà i match esistenti e li ricalcolerà. Può richiedere alcuni secondi.')) return;
        
        setRieseguendoMatching(true);
        const toastId = toast.loading('🔄 Riesecuzione matching in corso...');
        
        try {
            const response = await offerteAPI.rieseguiMatchingGlobale();
            toast.success(
                `✅ ${response.data.message}`,
                { id: toastId, duration: 5000 }
            );
            // Ricarica le offerte per aggiornare i contatori
            loadOfferte();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || 'Errore riesecuzione matching',
                { id: toastId }
            );
        } finally {
            setRieseguendoMatching(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="text-yellow-500" />
                        Offerte & AI Matching
                    </h1>
                    <p className="text-gray-600 mt-1">Carica PDF offerte e trova clienti eligibili automaticamente</p>
                </div>
                <div className="flex gap-3">
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => {
                                    loadAIConfig();
                                    setShowAIConfig(true);
                                }}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <Settings size={18} />
                                Configura AI
                            </button>
                            
                            <button
                                onClick={handleRieseguiMatchingGlobale}
                                disabled={rieseguendoMatching || offerte.length === 0}
                                className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <TrendingUp size={18} />
                                {rieseguendoMatching ? 'Elaborazione...' : 'Riesegui Matching'}
                            </button>
                        </>
                    )}
                    {isSuperAdmin && (
                        <label className="btn btn-primary flex items-center gap-2 cursor-pointer">
                            <Upload size={18} />
                            {uploading ? 'Caricamento...' : 'Carica PDF Offerta'}
                            <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </label>
                    )}
                </div>
            </div>
            
            {/* Alert Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <Zap size={32} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-900 text-lg mb-2">🤖 Come funziona l'AI Matching</h3>
                        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
                            <li><strong>Carica PDF Offerta:</strong> Il sistema estrae automaticamente i dettagli (fornitore, prezzi, target)</li>
                            <li><strong>Analisi AI:</strong> Ollama confronta l'offerta con tutti i clienti nel database</li>
                            <li><strong>Match Intelligente:</strong> Trova i clienti eligibili in base a consumo, contratto attuale, tipologia</li>
                            <li><strong>Azioni:</strong> Visualizza match, contatta i clienti direttamente dalla lista</li>
                        </ol>
                        {!isSuperAdmin && (
                            <p className="text-yellow-700 font-medium mt-4 bg-yellow-100 rounded-lg p-3 border border-yellow-300">
                                ⚠️ Solo Super Admin e Admin possono caricare offerte.
                            </p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Card Statistiche Globali */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-800">Offerte Attive</p>
                            <p className="text-3xl font-bold text-blue-900 mt-1">{offerte.length}</p>
                        </div>
                        <Zap size={32} className="text-blue-600" />
                    </div>
                </div>
                
                <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-800">Match Totali</p>
                            <p className="text-3xl font-bold text-green-900 mt-1">
                                {offerte.reduce((sum, o) => sum + (o.match_count || 0), 0)}
                            </p>
                        </div>
                        <Users size={32} className="text-green-600" />
                    </div>
                </div>
                
                <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Luce</p>
                            <p className="text-3xl font-bold text-yellow-900 mt-1">
                                {offerte.filter(o => o.tipo_energia === 'luce' || o.tipo_energia === 'dual').length}
                            </p>
                        </div>
                        <span className="text-4xl">💡</span>
                    </div>
                </div>
                
                <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-800">Gas</p>
                            <p className="text-3xl font-bold text-orange-900 mt-1">
                                {offerte.filter(o => o.tipo_energia === 'gas' || o.tipo_energia === 'dual').length}
                            </p>
                        </div>
                        <span className="text-4xl">🔥</span>
                    </div>
                </div>
            </div>
            
            {/* Griglia Offerte */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : offerte.length === 0 ? (
                    <div className="col-span-full card text-center py-12 bg-gray-50">
                        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium text-lg mb-2">Nessuna offerta attiva</p>
                        <p className="text-gray-500 text-sm mb-6">
                            {isSuperAdmin 
                                ? 'Carica il primo PDF per iniziare!' 
                                : 'Contatta il Super Admin per caricare offerte'}
                        </p>
                        {isSuperAdmin && (
                            <label className="btn btn-primary inline-flex items-center gap-2 cursor-pointer">
                                <Upload size={18} />
                                Carica Prima Offerta
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                            </label>
                        )}
                    </div>
                ) : (
                    offerte.map((offerta) => (
                        <div
                            key={offerta.id}
                            className="card hover:shadow-xl transition-all relative group"
                        >
                            {/* Badge Tipo Energia */}
                            <div className="absolute top-4 right-4 z-10">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                                    offerta.tipo_energia === 'luce'
                                        ? 'bg-yellow-400 text-yellow-900'
                                        : offerta.tipo_energia === 'gas'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gradient-to-r from-yellow-400 to-blue-500 text-white'
                                }`}>
                                    {offerta.tipo_energia === 'dual' ? '💡+🔥 DUAL' : offerta.tipo_energia.toUpperCase()}
                                </span>
                            </div>
                            
                            {/* Header */}
                            <div className="mb-4">
                                <h3 className="font-bold text-xl text-gray-900 mb-2 pr-20">
                                    {offerta.nome_offerta}
                                </h3>
                                <p className="text-gray-600 font-medium">{offerta.fornitore}</p>
                            </div>
                            
                            {/* Prezzi */}
                            <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                                {offerta.prezzo_luce && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">💡 Luce:</span>
                                        <span className="font-bold text-yellow-600">
                                            €{offerta.prezzo_luce.toFixed(4)}/kWh
                                        </span>
                                    </div>
                                )}
                                {offerta.prezzo_gas && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">🔥 Gas:</span>
                                        <span className="font-bold text-blue-600">
                                            €{offerta.prezzo_gas.toFixed(4)}/Smc
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Info */}
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-gray-400" />
                                    <span>Target: <span className="capitalize font-medium text-gray-900">{offerta.target_clienti}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span>Valida fino: <span className="font-medium text-gray-900">{new Date(offerta.data_fine_validita).toLocaleDateString('it-IT')}</span></span>
                                </div>
                            </div>
                            
                            {/* Match Count */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={18} className="text-green-600" />
                                        <span className="text-sm font-medium text-green-900">Clienti Eligibili</span>
                                    </div>
                                    <span className="text-2xl font-bold text-green-600">
                                        {offerta.match_count || 0}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    to={`/offerte/${offerta.id}`}
                                    className="flex-1 btn btn-primary btn-sm flex items-center justify-center gap-2"
                                >
                                    <Eye size={16} />
                                    Vedi Match
                                </Link>
                                
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedOffertaForPDF({ id: offerta.id, nome: offerta.nome_offerta });
                                            setShowPDFViewer(true);
                                        }}
                                        className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                        title="Visualizza PDF e Dati AI"
                                    >
                                        <FileText size={16} />
                                    </button>
                                )}
                                
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDelete(offerta.id, offerta.nome_offerta);
                                        }}
                                        disabled={deleting === offerta.id}
                                        className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Trash2 size={16} />
                                        {deleting === offerta.id ? 'Eliminazione...' : ''}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Modale Configurazione AI */}
            {showAIConfig && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Settings className="text-blue-600" />
                                Configurazione AI
                            </h2>
                            <button onClick={() => setShowAIConfig(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Provider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Provider AI</label>
                                <select
                                    value={aiConfig.ai_provider}
                                    onChange={(e) => setAIConfig({...aiConfig, ai_provider: e.target.value})}
                                    className="input"
                                >
                                    <option value="groq">Groq (Consigliato - Gratuito)</option>
                                    <option value="ollama">Ollama (Self-hosted)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Groq: Veloce e gratuito. Ollama: Server locale/remoto
                                </p>
                            </div>
                            
                            {/* Groq */}
                            {aiConfig.ai_provider === 'groq' && (
                                <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-bold text-green-900 flex items-center gap-2">
                                        🤖 Configurazione Groq
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            API Key Groq {!(aiConfig as any)._existing_key && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type="password"
                                            value={aiConfig.groq_api_key}
                                            onChange={(e) => setAIConfig({...aiConfig, groq_api_key: e.target.value})}
                                            placeholder={(aiConfig as any)._existing_key ? '✅ Chiave già configurata (lascia vuoto per mantenerla)' : 'gsk_xxxxxxxxxxxxx'}
                                            className="input"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            {(aiConfig as any)._existing_key ? (
                                                <span className="text-green-600 font-semibold">✅ Chiave API già configurata e funzionante! Lascia vuoto per mantenerla.</span>
                                            ) : (
                                                <>🔗 Ottieni gratis su: <a href="https://console.groq.com/keys" target="_blank" className="text-blue-600 underline">console.groq.com/keys</a></>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Modello Groq</label>
                                        <select
                                            value={aiConfig.groq_model}
                                            onChange={(e) => setAIConfig({...aiConfig, groq_model: e.target.value})}
                                            className="input"
                                        >
                                            <option value="llama-3.3-70b-versatile">🔥 LLaMA 3.3 70B (Consigliato - Nuovo!)</option>
                                            <option value="llama-3.1-8b-instant">⚡ LLaMA 3.1 8B (Veloce)</option>
                                            <option value="gemma2-9b-it">💎 Gemma 2 9B (Alternativa)</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            💡 LLaMA 3.3 è il modello più recente con migliore precisione
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Ollama */}
                            {aiConfig.ai_provider === 'ollama' && (
                                <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                                        🦙 Configurazione Ollama
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            URL Endpoint <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={aiConfig.ollama_url}
                                            onChange={(e) => setAIConfig({...aiConfig, ollama_url: e.target.value})}
                                            placeholder="http://185.31.67.249/api/generate"
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Modello</label>
                                        <input
                                            type="text"
                                            value={aiConfig.ollama_model}
                                            onChange={(e) => setAIConfig({...aiConfig, ollama_model: e.target.value})}
                                            placeholder="llama3:8b"
                                            className="input"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t">
                            <button
                                onClick={() => setShowAIConfig(false)}
                                className="flex-1 btn btn-secondary"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSaveAIConfig}
                                disabled={saving}
                                className="flex-1 btn btn-primary"
                            >
                                {saving ? 'Salvataggio...' : '✅ Salva Configurazione'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modale Visualizzazione PDF + AI */}
            {showPDFViewer && selectedOffertaForPDF && (
                <PDFViewerModal
                    offertaId={selectedOffertaForPDF.id}
                    offertaNome={selectedOffertaForPDF.nome}
                    onClose={() => {
                        setShowPDFViewer(false);
                        setSelectedOffertaForPDF(null);
                    }}
                />
            )}
        </div>
    );
}

