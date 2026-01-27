import React, { useState } from 'react';
import WelcomeScreen from '../components/Kiosk/WelcomeScreen';
import WalkInForm from '../components/Kiosk/WalkInForm';
import CheckInScreen from '../components/Kiosk/CheckInScreen';
import { CheckCircle2 } from 'lucide-react';

const KioskPage = () => {
    const [view, setView] = useState('welcome'); // welcome, walk_in, check_in, success
    const [successData, setSuccessData] = useState(null);

    const handleComplete = (data) => {
        setSuccessData(data);
        setView('success');
        // Auto reset after 10 seconds
        setTimeout(() => {
            setView('welcome');
            setSuccessData(null);
        }, 10000);
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white overflow-hidden font-sans selection:bg-blue-500/30">
            <div className="h-screen flex flex-col">
                {/* Top Bar simulating Kiosk Hardware Header */}
                <div className="h-16 bg-black flex items-center justify-between px-8 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-500 font-mono">SYSTEM ONLINE • TERMINAL 01</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                        {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative">
                    {view === 'welcome' && (
                        <WelcomeScreen onSelectMode={setView} />
                    )}

                    {view === 'walk_in' && (
                        <WalkInForm
                            onBack={() => setView('welcome')}
                            onComplete={handleComplete}
                        />
                    )}

                    {view === 'check_in' && (
                        <CheckInScreen
                            onBack={() => setView('welcome')}
                            onComplete={handleComplete}
                        />
                    )}

                    {view === 'success' && successData && (
                        <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in zoom-in duration-300">
                            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.4)]">
                                <CheckCircle2 size={64} className="text-white" />
                            </div>

                            <div className="text-center space-y-2">
                                <h2 className="text-4xl font-bold">Token Issued!</h2>
                                <p className="text-gray-400 text-xl">Please take your printed slip</p>
                            </div>

                            <div className="bg-white text-black p-8 rounded-xl shadow-2xl w-full max-w-sm transform rotate-1">
                                <div className="text-center border-b-2 border-black pb-4 mb-4 border-dashed">
                                    <h3 className="font-bold text-2xl">DASO BANK</h3>
                                    <p className="text-sm">IIT Pals Branch</p>
                                </div>

                                <div className="text-center space-y-4 mb-6">
                                    <div className="text-6xl font-black font-mono tracking-tighter">
                                        {successData.token_number}
                                    </div>
                                    <div className="text-sm font-bold uppercase tracking-widest bg-black text-white py-1 inline-block px-4">
                                        {successData.queue_position === 1 ? 'NEXT IN LINE' : `Wait: ~${Math.ceil(successData.estimated_wait_min || 5)} mins`}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm font-mono border-t-2 border-dashed border-black pt-4">
                                    <div className="flex justify-between">
                                        <span>Priority Score:</span>
                                        <span>{Math.round(successData.priority_score || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Est. Duration:</span>
                                        <span>{successData.predicted_duration_min} min</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setView('welcome')}
                                className="mt-8 px-8 py-3 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition"
                            >
                                Return to Home Screen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KioskPage;
