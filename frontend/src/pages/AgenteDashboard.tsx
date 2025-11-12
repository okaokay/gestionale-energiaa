/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Dashboard Agente Personalizzata
 * KPI, Obiettivi, Performance, Calendario
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    TrendingUp, Users, FileText, Euro, Target, Award, Calendar,
    Clock, Phone, Mail, CheckCircle, AlertCircle, Zap, Flame,
    Activity, BarChart3, PieChart, Trophy, Star, ChevronRight
} from 'lucide-react';

export default function AgenteDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        clienti_assegnati: 0,
        contratti_mese: 0,
        commissioni_mese: 0,
        obiettivo_mensile: 10000,
        percentuale_obiettivo: 0,
        nuovi_clienti_settimana: 0,
        appuntamenti_oggi: 0,
        reminder_attivi: 0
    });
    
    const [ultimeAttivita, setUltimeAttivita] = useState<any[]>([]);
    const [clientiRecenti, setClientiRecenti] = useState<any[]>([]);
    const [performance, setPerformance] = useState<any>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Carica statistiche agente
            const statsResponse = await fetch('/api/agenti/my-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (statsResponse.ok) {
                const result = await statsResponse.json();
                setStats(result.data);
            }
            
            // Carica attività recenti
            const activityResponse = await fetch('/api/agenti/my-activity', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (activityResponse.ok) {
                const result = await activityResponse.json();
                setUltimeAttivita(result.data.slice(0, 10));
            }
            
            // Carica clienti recenti
            const clientiResponse = await fetch('/api/clienti?limit=5', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (clientiResponse.ok) {
                const result = await clientiResponse.json();
                setClientiRecenti(result.data.clienti.slice(0, 5));
            }
            
        } catch (error) {
            console.error('Errore caricamento dashboard:', error);
            toast.error('Errore caricamento dati');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">La Mia Dashboard</h1>
                        <p className="text-blue-100">Benvenuto! Ecco il riepilogo delle tue performance</p>
                    </div>
                    <Trophy size={64} className="text-yellow-300 opacity-50" />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Clienti Assegnati */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users size={24} className="text-blue-600" />
                        </div>
                        <span className="text-green-600 text-sm font-semibold">+{stats.nuovi_clienti_settimana} questa settimana</span>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Clienti Assegnati</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.clienti_assegnati}</p>
                </div>

                {/* Contratti Mese */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <FileText size={24} className="text-green-600" />
                        </div>
                        <Activity size={20} className="text-green-600" />
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Contratti Questo Mese</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.contratti_mese}</p>
                </div>

                {/* Commissioni */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Euro size={24} className="text-yellow-600" />
                        </div>
                        <TrendingUp size={20} className="text-green-600" />
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Commissioni Mese</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        €{stats.commissioni_mese.toLocaleString('it-IT')}
                    </p>
                </div>

                {/* Appuntamenti Oggi */}
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Calendar size={24} className="text-purple-600" />
                        </div>
                        <Clock size={20} className="text-purple-600" />
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Appuntamenti Oggi</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.appuntamenti_oggi}</p>
                </div>
            </div>

            {/* Obiettivo Mensile */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Target size={32} className="text-indigo-600" />
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Obiettivo Mensile</h3>
                            <p className="text-sm text-gray-600">
                                €{stats.commissioni_mese.toLocaleString('it-IT')} / €{stats.obiettivo_mensile.toLocaleString('it-IT')}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-indigo-600">
                            {Math.round((stats.commissioni_mese / stats.obiettivo_mensile) * 100)}%
                        </p>
                        <p className="text-sm text-gray-600">completato</p>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative pt-1">
                    <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                        <div
                            style={{ width: `${Math.min((stats.commissioni_mese / stats.obiettivo_mensile) * 100, 100)}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                        ></div>
                    </div>
                </div>
                
                {stats.commissioni_mese >= stats.obiettivo_mensile && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <Trophy size={20} className="text-green-600" />
                        <span className="text-green-800 font-semibold">🎉 Obiettivo raggiunto! Ottimo lavoro!</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clienti Recenti */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users size={24} className="text-blue-600" />
                            Ultimi Clienti Assegnati
                        </h3>
                        <Link to="/clienti" className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1">
                            Vedi tutti
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                    
                    <div className="space-y-3">
                        {clientiRecenti.length > 0 ? (
                            clientiRecenti.map((cliente) => (
                                <Link
                                    key={cliente.id}
                                    to={`/clienti/${cliente.id}`}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${cliente.tipo === 'privato' ? 'bg-green-100' : 'bg-purple-100'}`}>
                                            {cliente.tipo === 'privato' ? (
                                                <Users size={16} className="text-green-600" />
                                            ) : (
                                                <FileText size={16} className="text-purple-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {cliente.tipo === 'privato' 
                                                    ? `${cliente.nome} ${cliente.cognome}` 
                                                    : cliente.ragione_sociale}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {cliente.citta || 'N/D'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {cliente.contratti_luce > 0 && (
                                            <Zap size={16} className="text-yellow-600" />
                                        )}
                                        {cliente.contratti_gas > 0 && (
                                            <Flame size={16} className="text-blue-600" />
                                        )}
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Users size={48} className="mx-auto mb-2 text-gray-300" />
                                <p>Nessun cliente assegnato</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Attività Recenti */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Activity size={24} className="text-green-600" />
                            Attività Recenti
                        </h3>
                    </div>
                    
                    <div className="space-y-3">
                        {ultimeAttivita.length > 0 ? (
                            ultimeAttivita.map((attivita, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className={`p-2 rounded-full ${
                                        attivita.tipo === 'chiamata' ? 'bg-blue-100' :
                                        attivita.tipo === 'email' ? 'bg-purple-100' :
                                        'bg-green-100'
                                    }`}>
                                        {attivita.tipo === 'chiamata' ? <Phone size={14} className="text-blue-600" /> :
                                         attivita.tipo === 'email' ? <Mail size={14} className="text-purple-600" /> :
                                         <CheckCircle size={14} className="text-green-600" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900">{attivita.descrizione}</p>
                                        <p className="text-xs text-gray-600">{attivita.timestamp}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Activity size={48} className="mx-auto mb-2 text-gray-300" />
                                <p>Nessuna attività recente</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Azioni Rapide</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        to="/clienti"
                        className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Users size={32} className="text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">I Miei Clienti</span>
                    </Link>
                    
                    <Link
                        to="/contratti"
                        className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                        <FileText size={32} className="text-green-600" />
                        <span className="text-sm font-semibold text-green-900">Contratti</span>
                    </Link>
                    
                    <Link
                        to="/contabilita"
                        className="flex flex-col items-center gap-2 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                        <Euro size={32} className="text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-900">Commissioni</span>
                    </Link>
                    
                    <Link
                        to="/scadenze"
                        className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                        <Calendar size={32} className="text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">Scadenze</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}




