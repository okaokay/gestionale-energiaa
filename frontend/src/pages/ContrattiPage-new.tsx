/**
 * 🆕 NUOVA PAGINA GESTIONE CONTRATTI
 * 
 * Workflow Semplificato:
 * 1. Upload PDF (il sistema analizza automaticamente)
 * 2. Fornisci i dati in un form
 * 3. Click "Compila" → AI fa tutto automaticamente
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Upload, FileText, Download, Trash2, Check, AlertCircle, 
    Loader, ZapIcon, FileCheck, BrainCircuit 
} from 'lucide-react';

interface Template {
    id: string;
    nome: string;
    fornitore: string;
    categoria: string;
    tipo_cliente: string;
    campi_estratti: { campi: any };
    created_at: string;
}

export default function ContrattiPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCompileModal, setShowCompileModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    
    // Upload form
    const [uploadForm, setUploadForm] = useState({
        nome: '',
        fornitore: '',
        categoria: 'dual',
        tipo_cliente: 'domestico',
        file: null as File | null
    });
    
    // Compile form (dati da fornire)
    const [compileData, setCompileData] = useState<Record<string, any>>({});
    
    useEffect(() => {
        loadTemplates();
    }, []);
    
    // Cleanup blob URL quando si chiude il modal
    useEffect(() => {
        if (!showCompileModal && pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }
    }, [showCompileModal]);
    
    const loadTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
    const response = await axios.get('/api/contratti-gestione/templates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(response.data);
        } catch (error) {
            console.error('Errore caricamento templates:', error);
        }
    };
    
    const handleUpload = async () => {
        if (!uploadForm.file) {
            alert('Seleziona un file PDF');
            return;
        }
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const formData = new FormData();
            formData.append('pdf', uploadForm.file);
            formData.append('nome', uploadForm.nome);
            formData.append('fornitore', uploadForm.fornitore);
            formData.append('categoria', uploadForm.categoria);
            formData.append('tipo_cliente', uploadForm.tipo_cliente);
            
            const response = await axios.post(
        '/api/contratti-gestione/templates/upload',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            alert(response.data.message);
            setShowUploadModal(false);
            setUploadForm({ nome: '', fornitore: '', categoria: 'dual', tipo_cliente: 'domestico', file: null });
            loadTemplates();
            
        } catch (error: any) {
            console.error('Errore upload:', error);
            alert('Errore durante l\'upload: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!confirm('Eliminare questo template?')) return;
        
        try {
            const token = localStorage.getItem('token');
        await axios.delete(`/api/contratti-gestione/templates/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadTemplates();
        } catch (error) {
            console.error('Errore eliminazione:', error);
            alert('Errore durante l\'eliminazione');
        }
    };
    
    const handleOpenCompileModal = async (template: Template) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Scarica il PDF come blob
            const response = await axios.get(
        `/api/contratti-gestione/templates/${template.id}/pdf`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );
            
            // Crea blob URL
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            
            setPdfBlobUrl(blobUrl);
            setSelectedTemplate(template);
            setShowCompileModal(true);
            
        } catch (error) {
            console.error('Errore caricamento PDF:', error);
            alert('Errore durante il caricamento del PDF');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCompile = async () => {
        if (!selectedTemplate) return;
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
        '/api/contratti-gestione/compile',
                {
                    templateId: selectedTemplate.id,
                    providedData: compileData
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );
            
            // Download PDF compilato
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `contratto_compilato_${Date.now()}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            alert('✅ PDF compilato con successo!');
            setShowCompileModal(false);
            setCompileData({});
            
        } catch (error: any) {
            console.error('Errore compilazione:', error);
            alert('Errore durante la compilazione: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleAIExtraction = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('documents', files[i]);
            }
            
            console.log('🤖 Estrazione dati con AI...');
            const extractResponse = await axios.post(
        '/api/ai/extract-contract-data',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            const extractedData = extractResponse.data.extractedData || {};
            const debugInfo = extractResponse.data.debugInfo || {};
            
            console.log('✅ Dati estratti:', extractedData);
            console.log('📊 Numero campi:', Object.keys(extractedData).length);
            console.log('📋 Campi con valore:', Object.entries(extractedData).filter(([,v]) => v).length);
            
            // DEBUG: Mostra testo OCR
            if (debugInfo.ocrTextPreview) {
                console.log('📝 TESTO OCR ESTRATTO:');
                console.log(debugInfo.ocrTextPreview);
                console.log(`... (${debugInfo.ocrTextLength} caratteri totali)`);
            }
            
            // Salva i dati estratti per mostrarli
            setCompileData(extractedData);
            
            const campiConValore = Object.entries(extractedData).filter(([,v]) => v).length;
            
            if (campiConValore === 0 && debugInfo.ocrTextLength > 0) {
                alert(`⚠️ OCR ha letto ${debugInfo.ocrTextLength} caratteri ma non ha trovato dati.\n\nControlla la console del browser per vedere il testo estratto.`);
            } else if (campiConValore === 0) {
                alert('❌ Impossibile estrarre dati dal documento. L\'immagine potrebbe essere di bassa qualità.');
            } else {
                alert(`✅ Estratti ${campiConValore} dati da ${files.length} documento/i!`);
            }
            
            // Reset input
            event.target.value = '';
            
        } catch (error: any) {
            console.error('Errore estrazione:', error);
            alert('Errore durante l\'estrazione: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <FileText className="text-blue-600" size={32} />
                        Gestione Contratti AI
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Sistema intelligente di analisi e compilazione contratti con AI
                    </p>
                </div>
                
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg"
                >
                    <Upload size={20} />
                    Carica Nuovo Template
                </button>
            </div>
            
            {/* Feature Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-600 rounded-lg">
                            <BrainCircuit className="text-white" size={24} />
                        </div>
                        <h3 className="font-bold text-purple-900">Analisi AI</h3>
                    </div>
                    <p className="text-sm text-purple-800">
                        L'AI analizza automaticamente il PDF e rileva tutti i campi compilabili
                    </p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-600 rounded-lg">
                            <ZapIcon className="text-white" size={24} />
                        </div>
                        <h3 className="font-bold text-green-900">Rilevamento Layout</h3>
                    </div>
                    <p className="text-sm text-green-800">
                        Rileva automaticamente linee vuote, caselle checkbox e etichette per creare campi compilabili
                    </p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <FileCheck className="text-white" size={24} />
                        </div>
                        <h3 className="font-bold text-blue-900">Compilazione Smart</h3>
                    </div>
                    <p className="text-sm text-blue-800">
                        Mapping intelligente dei dati ai campi con AI, completamente automatico
                    </p>
                </div>
            </div>
            
            {/* Templates List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Templates Disponibili</h2>
                
                {templates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <FileText size={64} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Nessun template caricato</p>
                        <p className="text-sm">Carica il tuo primo template PDF per iniziare</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(template => (
                            <div key={template.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 mb-1">{template.nome}</h3>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">Fornitore:</span> {template.fornitore}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">Tipo:</span> {template.tipo_cliente}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">Categoria:</span> {template.categoria}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                                    <p className="text-sm text-blue-900">
                                        <span className="font-bold">
                                            {Object.keys(template.campi_estratti?.campi || {}).length}
                                        </span> campi rilevati dall'AI
                                    </p>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenCompileModal(template)}
                                        disabled={loading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        <FileCheck size={16} />
                                        Compila
                                    </button>
                                    
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Modal Upload */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Carica Nuovo Template PDF</h2>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Template</label>
                                <input
                                    type="text"
                                    value={uploadForm.nome}
                                    onChange={(e) => setUploadForm({ ...uploadForm, nome: e.target.value })}
                                    placeholder="es. Proposta Contratto Alperia"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Fornitore</label>
                                <input
                                    type="text"
                                    value={uploadForm.fornitore}
                                    onChange={(e) => setUploadForm({ ...uploadForm, fornitore: e.target.value })}
                                    placeholder="es. ALPERIA"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo Cliente</label>
                                    <select
                                        value={uploadForm.tipo_cliente}
                                        onChange={(e) => setUploadForm({ ...uploadForm, tipo_cliente: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="domestico">Domestico (Privati)</option>
                                        <option value="business">Business (Aziende)</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
                                    <select
                                        value={uploadForm.categoria}
                                        onChange={(e) => setUploadForm({ ...uploadForm, categoria: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="luce">Solo Luce</option>
                                        <option value="gas">Solo Gas</option>
                                        <option value="dual">Dual (Luce + Gas)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">File PDF</label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ✨ Il sistema analizzerà automaticamente il PDF:
                                </p>
                                <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc space-y-1">
                                    <li>Se ha campi interattivi → li estrae direttamente</li>
                                    <li>Se è statico/scansionato → rileva layout e crea campi automaticamente</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                disabled={loading}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-all"
                            >
                                Annulla
                            </button>
                            
                            <button
                                onClick={handleUpload}
                                disabled={loading || !uploadForm.file || !uploadForm.nome || !uploadForm.fornitore}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Analisi in corso...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        Carica e Analizza
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal PDF con Dati Estratti */}
            {showCompileModal && selectedTemplate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-7xl w-full h-[95vh] p-4 flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">
                                📄 Compila: {selectedTemplate.nome}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCompileModal(false);
                                    setCompileData({});
                                    if (pdfBlobUrl) {
                                        URL.revokeObjectURL(pdfBlobUrl);
                                        setPdfBlobUrl(null);
                                    }
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Layout a 2 colonne: PDF + Dati */}
                        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                            {/* Colonna Sinistra: PDF */}
                            <div className="flex flex-col h-full min-h-0">
                                <h3 className="text-lg font-bold text-gray-700 mb-2">📄 Anteprima PDF</h3>
                                <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 relative">
                                    {pdfBlobUrl ? (
                                        <iframe
                                            src={`${pdfBlobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                                            className="w-full h-full"
                                            title="PDF Compilabile"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <Loader className="animate-spin mx-auto mb-3 text-blue-600" size={48} />
                                                <p className="text-gray-600">Caricamento PDF...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Colonna Destra: Dati Estratti */}
                            <div className="flex flex-col h-full min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-gray-700">📝 Dati Estratti</h3>
                                    <input
                                        type="file"
                                        id="ai-document-upload"
                                        accept="image/*,application/pdf"
                                        multiple
                                        onChange={handleAIExtraction}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => document.getElementById('ai-document-upload')?.click()}
                                        disabled={loading}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader className="animate-spin" size={16} />
                                                Elaborazione...
                                            </>
                                        ) : (
                                            <>
                                                <BrainCircuit size={16} />
                                                Estrai con AI
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Dati Estratti - Copiabili */}
                                <div className="flex-1 overflow-y-auto border-2 border-gray-200 rounded-lg p-4 bg-white">
                                    {Object.keys(compileData).length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-center">
                                            <div>
                                                <BrainCircuit className="mx-auto mb-3 text-gray-400" size={48} />
                                                <p className="text-gray-600 mb-2">Nessun dato estratto</p>
                                                <p className="text-sm text-gray-500">
                                                    Clicca su "Estrai con AI" per leggere<br />
                                                    i documenti e visualizzare i dati
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4 sticky top-0 z-10">
                                                <p className="text-sm text-green-800">
                                                    ✅ <strong>{Object.keys(compileData).length} dati estratti</strong> - Clicca per copiare
                                                </p>
                                            </div>
                                            
                                            {Object.entries(compileData).map(([key, value]) => {
                                                const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
                                                return (
                                                    <div 
                                                        key={key} 
                                                        onClick={() => {
                                                            if (hasValue) {
                                                                navigator.clipboard.writeText(String(value));
                                                                alert(`✅ Copiato: ${value}`);
                                                            }
                                                        }}
                                                        className={`rounded-lg p-3 transition-all ${
                                                            hasValue 
                                                                ? 'bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-400 cursor-pointer group'
                                                                : 'bg-gray-100 border border-gray-300 opacity-60'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                                                {key.replace(/_/g, ' ')}
                                                            </label>
                                                            {hasValue && (
                                                                <span className="text-xs text-gray-400 group-hover:text-blue-600">
                                                                    📋 Clicca per copiare
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-sm font-semibold break-words select-all ${
                                                            hasValue ? 'text-gray-900' : 'text-gray-400 italic'
                                                        }`}>
                                                            {hasValue ? String(value) : '(Nessun dato)'}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                            
                                            <button
                                                onClick={() => {
                                                    const text = Object.entries(compileData)
                                                        .filter(([, v]) => v)
                                                        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                                                        .join('\n');
                                                    navigator.clipboard.writeText(text);
                                                    alert('✅ Tutti i dati copiati negli appunti!');
                                                }}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all mt-4"
                                            >
                                                <FileCheck size={20} />
                                                Copia Tutti i Dati
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

