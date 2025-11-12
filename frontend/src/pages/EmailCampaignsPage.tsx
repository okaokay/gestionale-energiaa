import { useEffect, useState } from 'react';
import { emailAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Mail, Send } from 'lucide-react';

export default function EmailCampaignsPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadCampaigns();
    }, []);
    
    const loadCampaigns = async () => {
        try {
            const response = await emailAPI.getCampaigns();
            setCampaigns(response.data.data);
        } catch (error) {
            toast.error('Errore caricamento campagne');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Mail size={32} />
                        Email Marketing
                    </h1>
                    <p className="text-gray-600 mt-1">Gestione campagne email e newsletter</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                    <p className="text-sm text-gray-600">Campagne Totali</p>
                    <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-600">Campagne Attive</p>
                    <p className="text-3xl font-bold text-green-600">
                        {campaigns.filter(c => c.stato === 'completata').length}
                    </p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-600">In Bozza</p>
                    <p className="text-3xl font-bold text-orange-600">
                        {campaigns.filter(c => c.stato === 'bozza').length}
                    </p>
                </div>
            </div>
            
            <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Campagne Email</h2>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-12">
                        <Mail size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">Nessuna campagna email creata</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {campaigns.map((campaign) => (
                            <div key={campaign.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">{campaign.nome_campagna}</h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                            <span className="capitalize">Tipo: {campaign.tipologia}</span>
                                            <span className="capitalize">Target: {campaign.target_clienti}</span>
                                            {campaign.totale_destinatari > 0 && (
                                                <span>Destinatari: {campaign.totale_destinatari}</span>
                                            )}
                                        </div>
                                        {campaign.stato === 'completata' && (
                                            <div className="mt-2 flex gap-4 text-xs text-gray-600">
                                                <span>✅ Inviate: {campaign.invii_riusciti}</span>
                                                {campaign.aperture_totali > 0 && (
                                                    <span>👁️ Aperture: {campaign.aperture_totali}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            campaign.stato === 'completata'
                                                ? 'bg-green-100 text-green-800'
                                                : campaign.stato === 'in_invio'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {campaign.stato}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="card bg-blue-50 border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">💡 Funzionalità Email Marketing</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Template email personalizzabili per scadenze e promozioni</li>
                    <li>✅ Invio automatico email a clienti in scadenza (60, 30, 15, 7 giorni)</li>
                    <li>✅ Email promozionali targetizzate su matching AI</li>
                    <li>✅ Tracking aperture e click</li>
                    <li>✅ Sistema compliant GDPR con opt-out automatico</li>
                </ul>
            </div>
        </div>
    );
}

