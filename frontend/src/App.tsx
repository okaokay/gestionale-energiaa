/**
 * App principale - Router e layout
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AgenteDashboard from './pages/AgenteDashboard';
import AgentiPage from './pages/AgentiPage';
import AgentiPanoramicaPage from './pages/AgentiPanoramicaPage';
import ClientiPage from './pages/ClientiPage';
import ClienteDetailPage from './pages/ClienteDetailPage';
import ContrattiPage from './pages/ContrattiPage-new'; // 🆕 NUOVO SISTEMA
import ScadenzePage from './pages/ScadenzePage';
import OffertePage from './pages/OffertePage';
import OfferteDetailPage from './pages/OfferteDetailPage';
import EmailMarketingPage from './pages/EmailMarketingPage';
import ContabilitaPage from './pages/ContabilitaPage';
import ImportDocsPage from './pages/ImportDocsPage';
import Layout from './components/Layout';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuthStore();
    
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }
    
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
    
    return (
        <BrowserRouter>
            <Toaster 
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
            />
            
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<DashboardPage />} />
                                    <Route path="/agente-dashboard" element={<AgenteDashboard />} />
                                    <Route path="/agenti" element={<AgentiPage />} />
                                    <Route path="/agenti/:id/panoramica" element={<AgentiPanoramicaPage />} />
                                    <Route path="/clienti" element={<ClientiPage />} />
                                    <Route path="/clienti/new/:tipo" element={<ClienteDetailPage />} />
                                    <Route path="/clienti/:id" element={<ClienteDetailPage />} />
                                    <Route path="/contratti" element={<ContrattiPage />} />
                                    <Route path="/scadenze" element={<ScadenzePage />} />
                                    <Route path="/offerte" element={<OffertePage />} />
                                    <Route path="/offerte/:id" element={<OfferteDetailPage />} />
                                    <Route path="/email-marketing" element={<EmailMarketingPage />} />
                                    <Route path="/docs/import" element={<ImportDocsPage />} />
                                    <Route path="/contabilita" element={<ContabilitaPage />} />
                                    <Route path="*" element={<Navigate to="/" />} />
                                </Routes>
                            </Layout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

