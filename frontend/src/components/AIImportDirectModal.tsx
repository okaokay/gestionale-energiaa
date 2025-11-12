/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Modal AI Import Diretto - Crea cliente direttamente da PDF
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Upload, FileText, X, Loader, CheckCircle, User, Building2 } from 'lucide-react';

interface Props {
    onClose: () => void;
    onClientCreated: () => void;
}

export default function AIImportDirectModal({ onClose, onClientCreated }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [clientType, setClientType] = useState<'privato' | 'azienda'>('privato');
    const [docType, setDocType] = useState<string>('contratto');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'processing' | 'success'>('upload');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                toast.error('❌ Formato non supportato. Usa PDF o immagini JPG/PNG');
                return;
            }
            
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('❌ File troppo grande. Max 10MB');
                return;
            }
            
            setFile(selectedFile);
        }
    };

    const handleImportAndCreate = async () => {
        if (!file) {
            toast.error('❌ Seleziona un file');
            return;
        }

        setLoading(true);
        setStep('processing');

        try {
            // STEP 1: Estrai dati con AI
            const formData = new FormData();
            formData.append('file', file);
            formData.append('docType', docType);
            formData.append('clientType', clientType);

            const token = localStorage.getItem('token');
    const aiResponse = await fetch('/api/ai/extract-client-data', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const aiResult = await aiResponse.json();

            if (!aiResult.success) {
                throw new Error('Errore estrazione AI');
            }

            // STEP 2: Crea cliente con dati estratti
            const clientData = aiResult.data;
            
            let createResponse;
            if (clientType === 'privato') {
        createResponse = await fetch('/api/clienti/privati', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(clientData)
                });
            } else {
        createResponse = await fetch('/api/clienti/aziende', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(clientData)
                });
            }

            const createResult = await createResponse.json();

            if (createResult.success) {
                setStep('success');
                toast.success('✅ Cliente creato con successo!');
                setTimeout(() => {
                    onClientCreated();
                    onClose();
                }, 2000);
            } else {
                throw new Error(createResult.message || 'Errore creazione cliente');
            }
        } catch (error: any) {
            console.error('Errore AI import:', error);
            toast.error(`❌ ${error.message}`);
            setStep('upload');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="text-purple-600" />
                            Import Cliente con AI
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* STEP: UPLOAD */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Tipo Cliente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Tipo Cliente da Creare
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setClientType('privato')}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                                            clientType === 'privato'
                                                ? 'border-green-600 bg-green-50 shadow-lg'
                                                : 'border-gray-300 hover:border-green-300'
                                        }`}
                                    >
                                        <User size={40} className={clientType === 'privato' ? 'text-green-600' : 'text-gray-400'} />
                                        <div>
                                            <div className="font-semibold text-lg">Cliente Privato</div>
                                            <div className="text-xs text-gray-600">Persona fisica</div>
                                        </div>
                                    </button>
                                    
                                    <button
                                        onClick={() => setClientType('azienda')}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                                            clientType === 'azienda'
                                                ? 'border-purple-600 bg-purple-50 shadow-lg'
                                                : 'border-gray-300 hover:border-purple-300'
                                        }`}
                                    >
                                        <Building2 size={40} className={clientType === 'azienda' ? 'text-purple-600' : 'text-gray-400'} />
                                        <div>
                                            <div className="font-semibold text-lg">Azienda</div>
                                            <div className="text-xs text-gray-600">Persona giuridica</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Tipo Documento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Tipo Documento
                                </label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="contratto">📄 Contratto Energia</option>
                                    <option value="documento">🆔 Documento Identità</option>
                                    {clientType === 'azienda' && (
                                        <>
                                            <option value="visura">🏢 Visura Camerale</option>
                                            <option value="altro">📋 Altro Documento</option>
                                        </>
                                    )}
                                </select>
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
                                        id="file-upload-direct"
                                    />
                                    <label
                                        htmlFor="file-upload-direct"
                                        className="cursor-pointer inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                                    >
                                        Seleziona File
                                    </label>
                                    <p className="text-sm text-gray-600 mt-3">
                                        PDF, JPG, PNG (max 10MB)
                                    </p>
                                    {file && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg inline-block">
                                            <FileText size={24} className="inline mr-2 text-green-600" />
                                            <span className="font-semibold text-green-800">{file.name}</span>
                                            <p className="text-xs text-green-600 mt-1">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles size={20} className="text-purple-600 mt-0.5" />
                                    <div className="text-sm text-purple-900">
                                        <strong>Come funziona:</strong>
                                        <ul className="list-disc ml-4 mt-2 space-y-1">
                                            <li>L'AI estrae automaticamente i dati dal documento</li>
                                            <li>Il cliente viene creato direttamente nel sistema</li>
                                            <li>Puoi modificare i dati successivamente</li>
                                            <li>Supporta contratti, documenti identità e visure</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Pulsanti */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleImportAndCreate}
                                    disabled={!file}
                                    className="flex-1 btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg py-3"
                                >
                                    <Sparkles size={20} />
                                    Importa e Crea Cliente
                                </button>
                                <button
                                    onClick={onClose}
                                    className="btn btn-secondary px-6"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: PROCESSING */}
                    {step === 'processing' && (
                        <div className="py-12 text-center">
                            <Loader size={64} className="mx-auto mb-6 text-purple-600 animate-spin" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Creazione cliente in corso...
                            </h3>
                            <p className="text-gray-600 mb-4">
                                L'AI sta analizzando il documento e creando il cliente
                            </p>
                            <div className="max-w-md mx-auto space-y-2">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                                    OCR Documento
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
                                    Estrazione Dati AI
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                                    Creazione Cliente
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP: SUCCESS */}
                    {step === 'success' && (
                        <div className="py-12 text-center">
                            <CheckCircle size={64} className="mx-auto mb-6 text-green-600" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Cliente creato con successo!
                            </h3>
                            <p className="text-gray-600">
                                Il cliente è stato aggiunto al sistema
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}




