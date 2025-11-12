/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Componente AI Import - Import Intelligente da PDF/Immagini
 * Utilizza Ollama per estrarre dati strutturati da documenti
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Upload, FileText, Image as ImageIcon, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
    onClose: () => void;
    onDataExtracted: (data: any) => void;
    clientType: 'privato' | 'azienda';
}

export default function AIImportModal({ onClose, onDataExtracted, clientType }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<string>('contratto');
    const [loading, setLoading] = useState(false);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Verifica tipo file
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                toast.error('❌ Formato non supportato. Usa PDF o immagini JPG/PNG');
                return;
            }
            
            // Verifica dimensione (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('❌ File troppo grande. Max 10MB');
                return;
            }
            
            setFile(selectedFile);
        }
    };

    const handleExtract = async () => {
        if (!file) {
            toast.error('❌ Seleziona un file');
            return;
        }

        setLoading(true);
        setStep('processing');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('docType', docType);
            formData.append('clientType', clientType);

            const token = localStorage.getItem('token');
    const response = await fetch('/api/ai/extract-client-data', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setExtractedData(result.data);
                setStep('preview');
                toast.success('✅ Dati estratti con successo!');
            } else {
                throw new Error(result.message || 'Errore estrazione');
            }
        } catch (error: any) {
            console.error('Errore AI extraction:', error);
            toast.error(`❌ Errore: ${error.message}`);
            setStep('upload');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (extractedData) {
            onDataExtracted(extractedData);
            toast.success('✨ Dati importati nel form!');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="text-purple-600" />
                            Import Intelligente con AI
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* STEP 1: UPLOAD */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Tipo Documento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Tipo Documento
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDocType('contratto')}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            docType === 'contratto'
                                                ? 'border-purple-600 bg-purple-50'
                                                : 'border-gray-300 hover:border-purple-300'
                                        }`}
                                    >
                                        <FileText size={32} className="mx-auto mb-2 text-purple-600" />
                                        <div className="font-semibold">Contratto Energia</div>
                                        <div className="text-xs text-gray-600">PDF contratto firmato</div>
                                    </button>
                                    
                                    <button
                                        onClick={() => setDocType('documento')}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            docType === 'documento'
                                                ? 'border-purple-600 bg-purple-50'
                                                : 'border-gray-300 hover:border-purple-300'
                                        }`}
                                    >
                                        <ImageIcon size={32} className="mx-auto mb-2 text-blue-600" />
                                        <div className="font-semibold">Documento Identità</div>
                                        <div className="text-xs text-gray-600">Carta identità, patente</div>
                                    </button>
                                    
                                    {clientType === 'azienda' && (
                                        <>
                                            <button
                                                onClick={() => setDocType('visura')}
                                                className={`p-4 rounded-lg border-2 transition-all ${
                                                    docType === 'visura'
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-300 hover:border-purple-300'
                                                }`}
                                            >
                                                <FileText size={32} className="mx-auto mb-2 text-green-600" />
                                                <div className="font-semibold">Visura Camerale</div>
                                                <div className="text-xs text-gray-600">Dati azienda CCIAA</div>
                                            </button>
                                            
                                            <button
                                                onClick={() => setDocType('altro')}
                                                className={`p-4 rounded-lg border-2 transition-all ${
                                                    docType === 'altro'
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-300 hover:border-purple-300'
                                                }`}
                                            >
                                                <FileText size={32} className="mx-auto mb-2 text-gray-600" />
                                                <div className="font-semibold">Altro Documento</div>
                                                <div className="text-xs text-gray-600">Estrazione libera</div>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Upload File */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Carica Documento
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                                    <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Seleziona File
                                    </label>
                                    <p className="text-sm text-gray-600 mt-2">
                                        PDF, JPG, PNG (max 10MB)
                                    </p>
                                    {file && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
                                            <p className="text-sm font-semibold text-green-800">
                                                📄 {file.name}
                                            </p>
                                            <p className="text-xs text-green-600">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles size={20} className="text-blue-600 mt-0.5" />
                                    <div className="text-sm text-blue-900">
                                        <strong>Come funziona:</strong>
                                        <ul className="list-disc ml-4 mt-2 space-y-1">
                                            <li>L'AI analizza il documento con OCR</li>
                                            <li>Estrae automaticamente dati anagrafici, contratti, POD/PDR</li>
                                            <li>Compila automaticamente il form cliente</li>
                                            <li>Puoi rivedere e modificare prima di salvare</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Pulsanti */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleExtract}
                                    disabled={!file}
                                    className="flex-1 btn bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={20} />
                                    Estrai Dati con AI
                                </button>
                                <button
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PROCESSING */}
                    {step === 'processing' && (
                        <div className="py-12 text-center">
                            <Loader size={64} className="mx-auto mb-6 text-purple-600 animate-spin" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Analisi in corso...
                            </h3>
                            <p className="text-gray-600 mb-4">
                                L'AI sta estraendo i dati dal documento
                            </p>
                            <div className="max-w-md mx-auto space-y-2">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                                    OCR Documento
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
                                    Analisi AI
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                                    Estrazione Dati
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 'preview' && extractedData && (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle size={24} className="text-green-600" />
                                <div>
                                    <p className="font-semibold text-green-900">Dati estratti con successo!</p>
                                    <p className="text-sm text-green-700">Rivedi i dati prima di importarli</p>
                                </div>
                            </div>

                            {/* Preview Dati */}
                            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <h4 className="font-semibold text-gray-900 mb-3">Dati Estratti:</h4>
                                <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(extractedData, null, 2)}
                                </pre>
                            </div>

                            {/* Pulsanti */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} />
                                    Importa nel Form
                                </button>
                                <button
                                    onClick={() => {
                                        setStep('upload');
                                        setExtractedData(null);
                                        setFile(null);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Riprova
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}



