import { X, FileText, Brain, Code2, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { offerteAPI } from '../services/api';
import toast from 'react-hot-toast';

interface PDFViewerModalProps {
    offertaId: string;
    offertaNome: string;
    onClose: () => void;
}

export default function PDFViewerModal({ offertaId, offertaNome, onClose }: PDFViewerModalProps) {
    const [activeTab, setActiveTab] = useState<'pdf' | 'text' | 'ai'>('pdf');
    const [loading, setLoading] = useState(true);
    const [pdfDetails, setPDFDetails] = useState<any>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    
    useEffect(() => {
        loadPDFDetails();
        loadPDFBlob();
        
        // Cleanup: rilascia l'Object URL quando il componente viene smontato
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [offertaId]);
    
    const loadPDFDetails = async () => {
        try {
            const response = await offerteAPI.getPDFDetails(offertaId);
            setPDFDetails(response.data.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore caricamento dettagli');
        } finally {
            setLoading(false);
        }
    };
    
    const loadPDFBlob = async () => {
        try {
            const response = await offerteAPI.getPDFBlob(offertaId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
        } catch (error: any) {
            console.error('Errore caricamento PDF:', error);
        }
    };
    
    const handleDownload = () => {
        if (pdfBlobUrl) {
            const link = document.createElement('a');
            link.href = pdfBlobUrl;
            link.download = `${offertaNome}.pdf`;
            link.click();
        }
    };
    
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Caricamento...</p>
                </div>
            </div>
        );
    }
    
    if (!pdfDetails) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <p className="text-red-600">Errore caricamento dettagli</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Chiudi</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{offertaNome}</h2>
                        <p className="text-sm text-gray-500 mt-1">Analisi PDF + AI</p>
                    </div>
                    <div className="flex gap-2">
                        {pdfDetails.pdf_available && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                            >
                                <Download className="w-4 h-4" />
                                Scarica PDF
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 px-6 py-2 bg-gray-50 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pdf')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition ${
                            activeTab === 'pdf'
                                ? 'bg-white text-orange-600 font-semibold border-b-2 border-orange-600'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        PDF Originale
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition ${
                            activeTab === 'text'
                                ? 'bg-white text-orange-600 font-semibold border-b-2 border-orange-600'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <Code2 className="w-4 h-4" />
                        Testo Estratto
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition ${
                            activeTab === 'ai'
                                ? 'bg-white text-orange-600 font-semibold border-b-2 border-orange-600'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <Brain className="w-4 h-4" />
                        Dati AI Interpretati
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'pdf' && pdfBlobUrl && (
                        <iframe
                            src={pdfBlobUrl}
                            className="w-full h-full border-2 border-gray-200 rounded-lg"
                            title="PDF Viewer"
                        />
                    )}
                    
                    {activeTab === 'pdf' && !pdfBlobUrl && (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p>PDF non disponibile</p>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'text' && (
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">Testo Estratto dal PDF</h3>
                            {pdfDetails.pdf_text_extracted ? (
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-4 rounded border border-gray-200 max-h-[70vh] overflow-auto">
                                    {pdfDetails.pdf_text_extracted}
                                </pre>
                            ) : (
                                <p className="text-gray-500 italic">Nessun testo estratto disponibile</p>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6 border border-orange-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <Brain className="w-6 h-6 text-orange-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">Dati Interpretati dall'AI</h3>
                                </div>
                                {pdfDetails.analizzato_da_ai ? (
                                    <p className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded inline-flex items-center gap-2">
                                        ✅ Analizzato automaticamente da AI
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded inline-flex items-center gap-2">
                                        ⚠️ Inserito manualmente
                                    </p>
                                )}
                            </div>
                            
                            {pdfDetails.ai_parsed_data && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(pdfDetails.ai_parsed_data).map(([key, value]) => (
                                        <div key={key} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                                {key.replace(/_/g, ' ')}
                                            </div>
                                            <div className="text-sm text-gray-900">
                                                {value !== null && value !== undefined ? (
                                                    typeof value === 'object' ? (
                                                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                                                            {JSON.stringify(value, null, 2)}
                                                        </pre>
                                                    ) : (
                                                        String(value)
                                                    )
                                                ) : (
                                                    <span className="text-gray-400 italic">Non specificato</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                                <h4 className="font-semibold text-blue-900 mb-2">📊 JSON Completo</h4>
                                <pre className="text-xs bg-white p-4 rounded border border-blue-100 overflow-auto max-h-64">
                                    {JSON.stringify(pdfDetails.ai_parsed_data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

