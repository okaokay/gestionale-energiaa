/**
 * Modal COMPLETA Compilazione Contratto con AI (Ollama)
 */

import { useState } from 'react';
import { X, Upload, Zap, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Props {
    templates: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ContractCompileAIModal({ templates, onClose, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [progress, setProgress] = useState(0);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Valida tipo file
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(selectedFile.type)) {
                toast.error('Formato file non supportato. Usa PDF, JPG o PNG');
                return;
            }

            // Valida dimensione (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('File troppo grande. Massimo 10MB');
                return;
            }

            setFile(selectedFile);
        }
    };

    const handleExtract = async () => {
        if (!file || !selectedTemplate) return;

        try {
            setLoading(true);
            setProgress(20);
            
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', 'contratto_energia');
            formData.append('template_id', selectedTemplate.id);

            setProgress(40);

            // Chiama API AI per estrarre dati
            const response = await axios.post(
                '/api/ai/extract-client-data',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setProgress(80);

            if (response.data.success && response.data.data) {
                setExtractedData(response.data.data);
                setStep(3);
                toast.success('✅ Dati estratti con successo!');
            } else {
                throw new Error('Nessun dato estratto');
            }

            setProgress(100);
        } catch (error: any) {
            console.error('Errore estrazione AI:', error);
            toast.error('Errore durante l\'estrazione dati. Riprova o usa compilazione manuale.');
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    const handleCreateContract = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Crea contratto con dati estratti
            const payload = {
                cliente_id: extractedData.cliente_id || extractedData.id,
                cliente_tipo: selectedTemplate.tipo_cliente === 'domestico' ? 'privato' : 'azienda',
                template_id: selectedTemplate.id,
                fornitore: selectedTemplate.fornitore,
                dati_compilati: extractedData,
                metodo_compilazione: 'ai'
            };

            await axios.post(
                '/api/contratti-compilazione/create-manual',
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('🎉 Contratto creato con AI!');
            onSuccess();
        } catch (error: any) {
            console.error('Errore creazione contratto:', error);
            toast.error('Errore durante la creazione del contratto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Zap size={28} />
                        Compilazione con AI
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Steps */}
                <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between max-w-xl mx-auto">
                        {[
                            { num: 1, label: 'Template' },
                            { num: 2, label: 'Carica File' },
                            { num: 3, label: 'Verifica' }
                        ].map((s, idx) => (
                            <div key={s.num} className="flex items-center">
                                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-purple-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                        step >= s.num ? 'bg-purple-600 text-white' : 'bg-gray-200'
                                    }`}>
                                        {s.num}
                                    </div>
                                    <span className="font-semibold hidden md:block">{s.label}</span>
                                </div>
                                {idx < 2 && (
                                    <div className={`h-1 w-20 mx-4 ${step > s.num ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Seleziona Template */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Seleziona il Tipo di Contratto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.filter(t => t.predefinito === 1).map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => {
                                            setSelectedTemplate(template);
                                            setStep(2);
                                        }}
                                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
                                    >
                                        <h4 className="font-bold text-lg text-gray-900 mb-2">{template.nome}</h4>
                                        <p className="text-sm text-gray-600">
                                            {template.tipo_cliente === 'domestico' ? '👤 Domestico / Privati' : '🏢 Business / Aziende'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Carica File */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Carica Documento</h3>
                                <p className="text-gray-600 mb-6">
                                    L'AI analizzerà il documento e estrarrà automaticamente tutti i dati necessari
                                </p>
                            </div>

                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-500 transition-colors">
                                <input
                                    type="file"
                                    id="file-upload"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <Upload size={64} className="mx-auto mb-4 text-gray-400" />
                                    <p className="text-lg font-semibold text-gray-700 mb-2">
                                        Clicca per caricare o trascina qui
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        PDF, JPG, PNG • Massimo 10MB
                                    </p>
                                </label>
                            </div>

                            {file && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={24} className="text-green-600" />
                                        <div>
                                            <p className="font-semibold text-gray-900">{file.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}

                            {loading && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <span>Elaborazione in corso con AI...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-purple-600">
                                        <Loader size={16} className="animate-spin" />
                                        L'AI sta analizzando il documento...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Verifica Dati Estratti */}
                    {step === 3 && extractedData && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={24} className="text-green-600" />
                                    <h3 className="text-lg font-bold text-gray-900">Dati Estratti Correttamente!</h3>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Verifica i dati estratti dall'AI prima di creare il contratto
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(extractedData).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">
                                            {key.replace(/_/g, ' ').toUpperCase()}
                                        </p>
                                        <p className="text-gray-900 font-medium">
                                            {String(value) || '-'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
                    <button
                        onClick={() => {
                            if (step > 1) setStep(step - 1);
                            else onClose();
                        }}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold"
                        disabled={loading}
                    >
                        {step === 1 ? 'Annulla' : '← Indietro'}
                    </button>
                    
                    {step === 2 && file && !loading && (
                        <button
                            onClick={handleExtract}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2"
                        >
                            <Zap size={18} />
                            Estrai Dati con AI
                        </button>
                    )}

                    {step === 3 && (
                        <button
                            onClick={handleCreateContract}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    Creazione...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
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




