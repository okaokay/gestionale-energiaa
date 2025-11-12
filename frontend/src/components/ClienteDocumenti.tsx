/**
 * Componente Gestione Documenti Cliente
 */

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, FileText, Download, Trash2, Eye, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
    clienteId: string;
    clienteTipo: 'privato' | 'azienda';
}

export default function ClienteDocumenti({ clienteId, clienteTipo }: Props) {
    const [documenti, setDocumenti] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadDocumenti();
    }, [clienteId]);

    const loadDocumenti = async () => {
        try {
            const token = localStorage.getItem('token');
            const tipoPath = clienteTipo === 'privato' ? 'privati' : 'aziende';
            
    const response = await fetch(`/api/documenti/cliente/${tipoPath}/${clienteId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const result = await response.json();
            if (result.success) {
                setDocumenti(result.data);
            }
        } catch (error) {
            toast.error('Errore caricamento documenti');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('cliente_id', clienteId);
        formData.append('cliente_tipo', clienteTipo);
        formData.append('categoria', 'altro');

        try {
            const token = localStorage.getItem('token');
    const response = await fetch('/api/documenti/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                toast.success('✅ Documento caricato!');
                loadDocumenti();
            }
        } catch (error) {
            toast.error('❌ Errore upload');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
    window.open(`/api/documenti/${id}/download?token=${token}`, '_blank');
        } catch (error) {
            toast.error('Errore download');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare documento?')) return;

        try {
            const token = localStorage.getItem('token');
    await fetch(`/api/documenti/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Documento eliminato');
            loadDocumenti();
        } catch (error) {
            toast.error('Errore eliminazione');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    Documenti ({documenti.length})
                </h3>
                <label className="btn bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-2">
                    <Upload size={18} />
                    {uploading ? 'Caricamento...' : 'Carica Documento'}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            {loading ? (
                <div className="text-center py-8">Caricamento...</div>
            ) : documenti.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">Nessun documento. Caricane uno!</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {documenti.map((doc) => (
                        <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    <FileText size={24} className="text-blue-600 mt-1" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900">{doc.nome_originale}</h4>
                                        <p className="text-sm text-gray-600">
                                            {doc.categoria} • {(doc.dimensione / 1024).toFixed(0)} KB • {new Date(doc.created_at).toLocaleDateString('it-IT')}
                                        </p>
                                        {doc.descrizione && (
                                            <p className="text-sm text-gray-700 mt-1">{doc.descrizione}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDownload(doc.id)}
                                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                                        title="Download"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                                        title="Elimina"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}




