import { useRef, useEffect, useState } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailTemplateBuilderProps {
    onSave: (html: string, design: any) => void;
    onClose: () => void;
    initialDesign?: any;
    templateName: string;
    onNameChange: (name: string) => void;
}

export default function EmailTemplateBuilder({ 
    onSave, 
    onClose, 
    initialDesign,
    templateName,
    onNameChange 
}: EmailTemplateBuilderProps) {
    const emailEditorRef = useRef<EditorRef>(null);
    const [loading, setLoading] = useState(true);

    const handleSave = () => {
        if (!templateName.trim()) {
            toast.error('⚠️ Inserisci un nome per il template');
            return;
        }

        const editor = emailEditorRef.current?.editor;
        
        if (!editor) {
            toast.error('❌ Editor non pronto');
            return;
        }

        // Esporta HTML
        editor.exportHtml(async (data) => {
            const { design, html } = data;
            onSave(html, design);
        });
    };

    const onReady: EmailEditorProps['onReady'] = (unlayer) => {
        console.log('🎨 Unlayer Editor pronto!');
        setLoading(false);

        // Carica design iniziale se fornito
        if (initialDesign) {
            try {
                unlayer.loadDesign(initialDesign);
            } catch (error) {
                console.error('Errore caricamento design:', error);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[999999]" style={{ backgroundColor: '#000' }}>
            {/* Header fisso */}
            <div 
                className="absolute top-0 left-0 right-0 bg-gray-800 text-white shadow-lg z-10 flex items-center justify-between px-6" 
                style={{ height: '60px' }}
            >
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold">
                        🎨 Editor Template Email
                    </h2>
                    <input
                        type="text"
                        value={templateName}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Inserisci nome template..."
                        className="px-3 py-2 border-2 border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md flex items-center gap-2 transition-colors"
                    >
                        <Save size={18} />
                        Salva Template
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-md transition-colors"
                        title="Chiudi"
                    >
                        <X size={22} />
                    </button>
                </div>
            </div>

            {/* Editor - posizionamento assoluto per occupare tutto lo spazio */}
            <div 
                style={{ 
                    position: 'absolute',
                    top: '60px',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden'
                }}
            >
                <EmailEditor
                    ref={emailEditorRef}
                    onReady={onReady}
                    minHeight="calc(100vh - 60px)"
                    options={{
                        locale: 'it-IT',
                        appearance: {
                            theme: 'modern_light',
                            panels: {
                                tools: {
                                    dock: 'left'
                                }
                            }
                        },
                        displayMode: 'email',
                        features: {
                            undoRedo: true,
                            stockImages: false
                        },
                        fonts: {
                            showDefaultFonts: true
                        },
                        mergeTags: {
                            nome_cliente: {
                                name: 'Nome Cliente',
                                value: '{{nome_cliente}}',
                                sample: 'Mario Rossi'
                            },
                            email_cliente: {
                                name: 'Email Cliente',
                                value: '{{email_cliente}}',
                                sample: 'cliente@esempio.it'
                            },
                            nome_agenzia: {
                                name: 'Nome Agenzia',
                                value: '{{nome_agenzia}}',
                                sample: 'Agenzia Energia'
                            }
                        }
                    }}
                />
            </div>

            {/* Loading overlay */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mx-auto mb-4"></div>
                        <p className="text-white text-lg font-semibold">Caricamento Editor...</p>
                        <p className="text-gray-400 text-sm mt-2">Attendi qualche secondo...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
