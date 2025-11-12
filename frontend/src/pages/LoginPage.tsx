/**
 * Pagina di login
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { setUser, setToken } = useAuthStore();
    const navigate = useNavigate();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await authAPI.login(email, password);
            const { token, user } = response.data.data;
            
            setToken(token);
            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            
            toast.success(`Benvenuto, ${user.nome}!`);
            navigate('/');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore durante il login');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                        <Zap size={32} className="text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestionale Energia</h1>
                    <p className="text-gray-600 mt-2">Sistema completo per agenzia luce e gas</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="admin@gestionale.it"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Accesso in corso...' : 'Accedi'}
                    </button>
                </form>
            </div>
        </div>
    );
}

