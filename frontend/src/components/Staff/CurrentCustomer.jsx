import React, { useState, useEffect } from 'react';
import { Play, CheckSquare, XCircle, Clock } from 'lucide-react';
import PerformanceBar from './PerformanceBar';
import { updateStaffAction } from '../../services/api';

const CurrentCustomer = ({ customer, onUpdate, staffId = 1, counterNumber = 1 }) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer;
        if (customer && customer.start_time) {
            // Calculate initial elapsed time
            const start = new Date(customer.start_time).getTime();

            timer = setInterval(() => {
                const now = new Date().getTime();
                setElapsedTime((now - start) / 60000); // in minutes
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(timer);
    }, [customer]);

    const handleAction = async (action) => {
        setLoading(true);
        try {
            await updateStaffAction({
                queue_id: customer.id,
                action,
                counter_number: counterNumber,
                staff_id: staffId
            });
            onUpdate(); // Refresh parent data
        } catch (err) {
            console.error("Action failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (!customer) {
        return (
            <div className="bg-gray-800 rounded-3xl p-8 border-2 border-gray-700 h-full flex flex-col items-center justify-center text-center opacity-50">
                <h2 className="text-2xl font-bold mb-2">Counter Closed</h2>
                <p>Waiting for next customer...</p>
            </div>
        );
    }

    const isStarted = !!customer.start_time;

    return (
        <div className="bg-gray-800 rounded-3xl p-8 border-2 border-blue-500/30 h-full flex flex-col relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <span className="text-blue-400 font-mono text-sm tracking-widest uppercase mb-1 block">Current Token</span>
                    <h1 className="text-6xl font-black text-white tracking-widest">{customer.token_number}</h1>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-bold text-white mb-1">
                        {isStarted ? elapsedTime.toFixed(1) : "0.0"} <span className="text-lg text-gray-500">min</span>
                    </div>
                    <div className="text-sm text-gray-400">Elapsed Time</div>
                </div>
            </div>

            <div className="space-y-6 flex-1 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 p-4 rounded-xl">
                        <div className="text-gray-400 text-xs uppercase">Service</div>
                        <div className="text-lg font-semibold">{customer.service_type.replace('_', ' ')}</div>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-xl">
                        <div className="text-gray-400 text-xs uppercase">Predicted Time</div>
                        <div className="text-lg font-semibold text-blue-300">{customer.predicted_duration_min} min</div>
                    </div>
                </div>

                <div>
                    <div className="text-gray-400 text-xs uppercase mb-1">Customer Name</div>
                    <div className="text-2xl font-bold">{customer.customer_name || "Guest User"}</div>
                </div>

                {isStarted && (
                    <PerformanceBar
                        actualTime={elapsedTime}
                        predictedTime={customer.predicted_duration_min}
                    />
                )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                {!isStarted ? (
                    <>
                        <button
                            onClick={() => handleAction('start')}
                            disabled={loading}
                            className="col-span-1 bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all active:scale-95"
                        >
                            <Play className="mr-2" /> Start Service
                        </button>
                        <button
                            onClick={() => handleAction('no_show')}
                            disabled={loading}
                            className="col-span-1 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 p-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all active:scale-95"
                        >
                            <XCircle className="mr-2" /> No Show
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => handleAction('complete')}
                        disabled={loading}
                        className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl font-bold text-xl flex items-center justify-center transition-all active:scale-95 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                    >
                        <CheckSquare className="mr-2" /> Complete Transaction
                    </button>
                )}
            </div>
        </div>
    );
};

export default CurrentCustomer;
