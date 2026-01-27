import React, { useState, useEffect } from 'react';
import { Wifi, CheckCircle2, XCircle } from 'lucide-react';
import { simulateProximity } from '../../services/api';

const CheckInScreen = ({ onBack, onComplete }) => {
    const [status, setStatus] = useState('scanning'); // scanning, success, error
    const [message, setMessage] = useState('Searching for appointment...');
    const [details, setDetails] = useState(null);

    useEffect(() => {
        // Simulate finding a device after 2 seconds
        const timer = setTimeout(() => {
            // In a real scenario, this would detect a beacon or prompt for mobile
            setStatus('input');
            setMessage('Please enter your registered mobile number');
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const handleMobileSubmit = async (e) => {
        e.preventDefault();
        const mobile = e.target.mobile.value;

        if (mobile.length !== 10) return;

        setStatus('processing');
        setMessage('Verifying appointment...');

        try {
            const result = await simulateProximity(mobile);

            if (result.success) {
                setStatus('success');
                setDetails(result);
                setMessage(result.message);
                setTimeout(() => onComplete(result), 3000);
            } else {
                setStatus('error');
                setMessage(result.message || 'No appointment found');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Check-in failed. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in duration-500">

            {status === 'scanning' && (
                <>
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div>
                        <div className="relative bg-gray-800 p-8 rounded-full border-4 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                            <Wifi size={64} className="text-blue-500 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Scanning...</h2>
                    <p className="text-gray-400 text-xl">{message}</p>
                </>
            )}

            {status === 'input' && (
                <form onSubmit={handleMobileSubmit} className="w-full max-w-md space-y-6">
                    <h2 className="text-3xl font-bold mb-8">Quick Check-In</h2>
                    <input
                        name="mobile"
                        type="tel"
                        placeholder="Enter Mobile Number"
                        className="w-full text-center text-3xl py-4 bg-gray-800 border-2 border-gray-600 rounded-xl focus:border-blue-500 outline-none tracking-widest"
                        autoFocus
                        maxLength={10}
                    />
                    <button className="w-full py-4 bg-blue-600 rounded-xl text-xl font-bold hover:bg-blue-700 transition">
                        Check In
                    </button>
                    <button type="button" onClick={onBack} className="text-gray-500 hover:text-white mt-4">
                        Cancel
                    </button>
                </form>
            )}

            {status === 'processing' && (
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                    <h2 className="text-2xl font-bold">{message}</h2>
                </div>
            )}

            {status === 'success' && (
                <>
                    <CheckCircle2 size={96} className="text-green-500 mb-6 animate-bounce" />
                    <h2 className="text-4xl font-bold text-white mb-2">Welcome!</h2>
                    <p className="text-2xl text-green-400 mb-8">{message}</p>

                    {details && (
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md">
                            <div className="text-gray-400">Your Token</div>
                            <div className="text-5xl font-mono font-bold text-white mb-4">{details.token_number}</div>
                            <div className="text-xl">Counter: {details.assigned_counter ? `Go to Counter ${details.assigned_counter}` : 'Please Wait'}</div>
                        </div>
                    )}
                </>
            )}

            {status === 'error' && (
                <>
                    <XCircle size={96} className="text-red-500 mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-2">Ooops!</h2>
                    <p className="text-xl text-red-400 mb-8">{message}</p>
                    <button onClick={() => setStatus('input')} className="px-8 py-3 bg-gray-800 rounded-lg hover:bg-gray-700">
                        Try Again
                    </button>
                    <button onClick={onBack} className="text-gray-500 mt-6">
                        Return to Home
                    </button>
                </>
            )}
        </div>
    );
};

export default CheckInScreen;
