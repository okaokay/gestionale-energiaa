/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Componente Timeline Note Cliente
 * Visualizza e gestisce note in stile timeline moderna
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
    StickyNote,
    Plus,
    Pin,
    Check,
    Trash2,
    Edit3,
    Clock,
    AlertCircle,
    Info,
    TrendingUp,
    Wrench,
    FileText,
    Bell,
    X,
    Calendar
} from 'lucide-react';

interface Nota {
    id: number;
    tipo_nota: string;
    titolo: string;
    contenuto: string;
    priorita: string;
    is_pinned: number;
    is_completed: number;
    reminder_date: string | null;
    created_at: string;
    created_by_name: string | null;
}

interface Props {
    clienteId: string;
    clienteTipo: 'privato' | 'azienda';
}

export default function ClienteNoteTimeline({ clienteId, clienteTipo }: Props) {
    const [note, setNote] = useState<Nota[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingNota, setEditingNota] = useState<Nota | null>(null);
    
    // Form nuova nota
    const [formData, setFormData] = useState({
        tipo_nota: 'generale',
        titolo: '',
        contenuto: '',
        priorita: 'normale',
        reminder_date: ''
    });
    
    useEffect(() => {
        loadNote();
    }, [clienteId]);
    
    const loadNote = async () => {
        try {
            const tipoPath = clienteTipo === 'privato' ? 'privati' : 'aziende';
            const { data } = await api.get(`/note/cliente/${tipoPath}/${clienteId}`);
            if (data?.success) setNote(data.data);
        } catch (error) {
            toast.error('Errore caricamento note');
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddNota = async () => {
        if (!formData.contenuto.trim()) {
            toast.error('Inserisci un contenuto per la nota');
            return;
        }
        
        try {
            const { data } = await api.post('/note', {
                ...formData,
                cliente_id: clienteId,
                cliente_tipo: clienteTipo
            });
            if (data?.success) {
                toast.success('✅ Nota aggiunta!');
                setShowAddModal(false);
                setFormData({
                    tipo_nota: 'generale',
                    titolo: '',
                    contenuto: '',
                    priorita: 'normale',
                    reminder_date: ''
                });
                loadNote();
            }
        } catch (error) {
            toast.error('❌ Errore salvataggio nota');
        }
    };
    
    const handleTogglePin = async (id: number) => {
        try {
            await api.post(`/note/${id}/pin`);
            loadNote();
        } catch (error) {
            toast.error('Errore');
        }
    };
    
    const handleToggleComplete = async (id: number) => {
        try {
            await api.post(`/note/${id}/complete`);
            loadNote();
        } catch (error) {
            toast.error('Errore');
        }
    };
    
    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare questa nota?')) return;
        
        try {
            await api.delete(`/note/${id}`);
            toast.success('Nota eliminata');
            loadNote();
        } catch (error) {
            toast.error('Errore eliminazione');
        }
    };
    
    const getTipoIcon = (tipo: string) => {
        switch (tipo) {
            case 'commerciale': return <TrendingUp size={16} className="text-green-600" />;
            case 'tecnica': return <Wrench size={16} className="text-blue-600" />;
            case 'amministrativa': return <FileText size={16} className="text-purple-600" />;
            case 'reminder': return <Bell size={16} className="text-orange-600" />;
            case 'problema': return <AlertCircle size={16} className="text-red-600" />;
            default: return <Info size={16} className="text-gray-600" />;
        }
    };
    
    const getPrioritaColor = (priorita: string) => {
        switch (priorita) {
            case 'urgente': return 'border-red-500 bg-red-50';
            case 'alta': return 'border-orange-500 bg-orange-50';
            case 'bassa': return 'border-gray-300 bg-gray-50';
            default: return 'border-blue-500 bg-blue-50';
        }
    };
    
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <StickyNote size={24} className="text-yellow-600" />
                    <h3 className="text-lg font-semibold">Note e Timeline</h3>
                    <span className="text-sm text-gray-500">({note.length})</span>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-2"
                >
                    <Plus size={18} />
                    Nuova Nota
                </button>
            </div>
            
            {/* Timeline Note */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Caricamento note...</div>
            ) : note.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <StickyNote size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">Nessuna nota. Inizia ad aggiungerne una!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {note.map((nota) => (
                        <div
                            key={nota.id}
                            className={`relative border-l-4 ${getPrioritaColor(nota.priorita)} p-4 rounded-r-lg shadow-sm hover:shadow-md transition-shadow ${
                                nota.is_completed ? 'opacity-60' : ''
                            }`}
                        >
                            {/* Badge Fissata */}
                            {nota.is_pinned === 1 && (
                                <div className="absolute -top-2 -left-2 bg-yellow-500 text-white rounded-full p-1.5">
                                    <Pin size={12} />
                                </div>
                            )}
                            
                            {/* Header Nota */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {getTipoIcon(nota.tipo_nota)}
                                    <span className="text-xs font-semibold text-gray-600 uppercase">
                                        {nota.tipo_nota}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        nota.priorita === 'urgente' ? 'bg-red-100 text-red-700' :
                                        nota.priorita === 'alta' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {nota.priorita}
                                    </span>
                                    {nota.reminder_date && (
                                        <span className="text-xs flex items-center gap-1 text-orange-600">
                                            <Clock size={12} />
                                            {new Date(nota.reminder_date).toLocaleDateString('it-IT')}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Azioni */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleComplete(nota.id)}
                                        className={`p-1.5 rounded hover:bg-green-100 ${
                                            nota.is_completed ? 'text-green-600' : 'text-gray-400'
                                        }`}
                                        title={nota.is_completed ? 'Marca come incompleta' : 'Marca come completata'}
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleTogglePin(nota.id)}
                                        className={`p-1.5 rounded hover:bg-yellow-100 ${
                                            nota.is_pinned ? 'text-yellow-600' : 'text-gray-400'
                                        }`}
                                        title={nota.is_pinned ? 'Stacca nota' : 'Fissa nota'}
                                    >
                                        <Pin size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(nota.id)}
                                        className="p-1.5 rounded hover:bg-red-100 text-red-600"
                                        title="Elimina nota"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Titolo */}
                            {nota.titolo && (
                                <h4 className={`font-semibold text-gray-900 mb-1 ${
                                    nota.is_completed ? 'line-through' : ''
                                }`}>
                                    {nota.titolo}
                                </h4>
                            )}
                            
                            {/* Contenuto */}
                            <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                                {nota.contenuto}
                            </p>
                            
                            {/* Footer */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>
                                    {nota.created_by_name || 'Sistema'} • {' '}
                                    {new Date(nota.created_at).toLocaleString('it-IT', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                                {nota.is_completed === 1 && (
                                    <span className="text-green-600 font-semibold">
                                        ✓ Completata
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Modal Nuova Nota */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <StickyNote className="text-yellow-600" />
                                    Nuova Nota
                                </h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Tipo Nota */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo Nota
                                    </label>
                                    <select
                                        value={formData.tipo_nota}
                                        onChange={(e) => setFormData({ ...formData, tipo_nota: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="generale">📝 Generale</option>
                                        <option value="commerciale">💼 Commerciale</option>
                                        <option value="tecnica">🔧 Tecnica</option>
                                        <option value="amministrativa">📄 Amministrativa</option>
                                        <option value="reminder">⏰ Reminder</option>
                                        <option value="problema">⚠️ Problema</option>
                                    </select>
                                </div>
                                
                                {/* Priorità */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priorità
                                    </label>
                                    <select
                                        value={formData.priorita}
                                        onChange={(e) => setFormData({ ...formData, priorita: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="bassa">Bassa</option>
                                        <option value="normale">Normale</option>
                                        <option value="alta">Alta</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>
                                
                                {/* Titolo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Titolo (opzionale)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.titolo}
                                        onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                                        className="input w-full"
                                        placeholder="es: Follow-up offerta"
                                    />
                                </div>
                                
                                {/* Contenuto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contenuto *
                                    </label>
                                    <textarea
                                        value={formData.contenuto}
                                        onChange={(e) => setFormData({ ...formData, contenuto: e.target.value })}
                                        className="input w-full"
                                        rows={4}
                                        placeholder="Scrivi qui il contenuto della nota..."
                                        required
                                    />
                                </div>
                                
                                {/* Reminder Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <Calendar size={16} />
                                        Data Reminder (opzionale)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.reminder_date}
                                        onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                                        className="input w-full"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                            
                            {/* Pulsanti */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleAddNota}
                                    className="flex-1 btn btn-primary"
                                >
                                    Salva Nota
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 btn btn-secondary"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



