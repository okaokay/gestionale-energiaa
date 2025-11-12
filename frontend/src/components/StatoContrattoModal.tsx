import { useState } from 'react';
import { X, Save, Zap, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

interface StatoContrattoModalProps {
    cliente: any;
    nuovoStato: string;
    contratti: any[];
    onClose: () => void;
    onUpdate: (contrattoId: string, tipoContratto: 'luce' | 'gas', nuovoStato: string) => Promise<void>;
}

export default function StatoContrattoModal({ cliente, nuovoStato, contratti, onClose, onUpdate }: StatoContrattoModalProps) {
    const [selectedContratto, setSelectedContratto] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const contrattiLuce = contratti.filter(c => c.tipo_contratto === 'luce');
    const contrattiGas = contratti.filter(c => c.tipo_contratto === 'gas');
    
    const hasMultipleContracts = contratti.length > 1;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (hasMultipleContracts && !selectedContratto) {
            toast.error('Seleziona un contratto');
            return;
        }
        
        try {
            setSaving(true);
            
            // Se c'è solo un contratto, usa quello
            const contrattoId = hasMultipleContracts ? selectedContratto : contratti[0].id;
            const tipoContrattoRaw = contratti.find(c => c.id === contrattoId)?.tipo_contratto;
            const tipoContratto = (tipoContrattoRaw === 'luce' || tipoContrattoRaw === 'gas') 
                ? tipoContrattoRaw 
                : contratti[0]?.tipo_contratto;

            if (tipoContratto !== 'luce' && tipoContratto !== 'gas') {
                toast.error('Tipo contratto non determinato');
                return;
            }

            await onUpdate(contrattoId, tipoContratto, nuovoStato);
            
            toast.success('✅ Stato aggiornato con successo!');
            onClose();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || '';
            // Evita log rumorosi se non c'è un vero messaggio d'errore
            if (msg) {
                console.warn('Errore aggiornamento stato:', msg);
                toast.error(`❌ ${msg}`);
            } else {
                console.debug('Aggiornamento stato: errore non critico (nessun messaggio dettagliato)');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Cambia Stato Contratto</h2>
                        <p className="text-purple-100 text-sm mt-1">
                            {cliente.nome ? `${cliente.nome} ${cliente.cognome}` : cliente.ragione_sociale}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Info nuovo stato */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Nuovo Stato:</h3>
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                            nuovoStato === 'attivo' ? 'bg-green-500 text-white' :
                            nuovoStato === 'documenti_da_validare' ? 'bg-orange-500 text-white' :
                            nuovoStato === 'ko' ? 'bg-red-500 text-white' :
                            'bg-gray-500 text-white'
                        }`}>
                            {nuovoStato.toUpperCase().replace(/_/g, ' ')}
                        </span>
                    </div>
                    
                    {/* Selezione contratto (solo se ce ne sono più di uno) */}
                    {hasMultipleContracts && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                A quale contratto vuoi applicare questo stato? *
                            </label>
                            <div className="space-y-3">
                                {contrattiLuce.map((contratto) => (
                                    <label
                                        key={contratto.id}
                                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                                            selectedContratto === contratto.id
                                                ? 'border-yellow-500 bg-yellow-50'
                                                : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="contratto"
                                            value={contratto.id}
                                            checked={selectedContratto === contratto.id}
                                            onChange={(e) => setSelectedContratto(e.target.value)}
                                            className="w-4 h-4 text-yellow-600"
                                        />
                                        <div className="p-2 bg-yellow-500 rounded-lg">
                                            <Zap size={20} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">LUCE</div>
                                            <div className="text-sm text-gray-600 font-mono">{contratto.pod}</div>
                                            <div className="text-xs text-gray-500">{contratto.fornitore}</div>
                                        </div>
                                    </label>
                                ))}
                                
                                {contrattiGas.map((contratto) => (
                                    <label
                                        key={contratto.id}
                                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                                            selectedContratto === contratto.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="contratto"
                                            value={contratto.id}
                                            checked={selectedContratto === contratto.id}
                                            onChange={(e) => setSelectedContratto(e.target.value)}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <div className="p-2 bg-blue-500 rounded-lg">
                                            <Flame size={20} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">GAS</div>
                                            <div className="text-sm text-gray-600 font-mono">{contratto.pdr}</div>
                                            <div className="text-xs text-gray-500">{contratto.fornitore}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Se c'è solo un contratto, mostralo */}
                    {!hasMultipleContracts && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-2">Contratto selezionato:</p>
                            <div className="flex items-center gap-3">
                                {contratti[0].tipo_contratto === 'luce' ? (
                                    <>
                                        <div className="p-2 bg-yellow-500 rounded-lg">
                                            <Zap size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">LUCE</div>
                                            <div className="text-sm text-gray-600 font-mono">{contratti[0].pod}</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-2 bg-blue-500 rounded-lg">
                                            <Flame size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">GAS</div>
                                            <div className="text-sm text-gray-600 font-mono">{contratti[0].pdr}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                            disabled={saving}
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Cambia Stato
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


