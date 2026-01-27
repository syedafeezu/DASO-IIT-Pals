import React, { useState, useEffect } from 'react';
import CurrentCustomer from '../components/Staff/CurrentCustomer';
import QueueList from '../components/Staff/QueueList';
import { getQueueStatus } from '../services/api';
import { RefreshCw, Users, TrendingUp } from 'lucide-react';

const StaffPage = () => {
    const [queue, setQueue] = useState([]);
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [staffStats, setStaffStats] = useState({ completed: 12, avgTime: 4.5 });

    const fetchQueue = async () => {
        try {
            // Get all active queue entries
            const data = await getQueueStatus();

            // Filter for this staff member or find next available
            // For prototype, we simulate Staff #1
            const myCustomer = data.queue.find(
                q => q.status === 'in_progress' && q.assigned_counter === 1
            );

            // If no customer in progress, pick the top one from waiting list
            const nextCustomer = !myCustomer
                ? data.queue.find(q => q.status === 'waiting' || q.status === 'checked_in')
                : null;

            setCurrentCustomer(myCustomer || nextCustomer);

            // Remaining queue (excluding current)
            const remainingQueue = data.queue.filter(
                q => q.id !== (myCustomer?.id || nextCustomer?.id) &&
                    (q.status === 'waiting' || q.status === 'checked_in')
            );

            setQueue(remainingQueue);
        } catch (err) {
            console.error("Failed to fetch queue", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        // Poll every 5 seconds
        const interval = setInterval(fetchQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#111] text-white font-sans p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">01</div>
                    <div>
                        <h1 className="text-xl font-bold">Counter 01</h1>
                        <p className="text-gray-400 text-sm">Staff: Raj Kumar</p>
                    </div>
                </div>

                <div className="flex gap-8 text-sm">
                    <div className="flex items-center gap-2">
                        <Users className="text-gray-500" size={16} />
                        <span className="text-gray-400">Queue Load:</span>
                        <span className="font-bold text-white text-lg">{queue.length + (currentCustomer ? 1 : 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-gray-500" size={16} />
                        <span className="text-gray-400">Completed:</span>
                        <span className="font-bold text-white text-lg">{staffStats.completed}</span>
                    </div>
                </div>

                <button
                    onClick={fetchQueue}
                    className={`p-2 rounded-lg hover:bg-gray-800 transition ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
                {/* Main Action Area */}
                <div className="lg:col-span-2">
                    <CurrentCustomer
                        customer={currentCustomer}
                        onUpdate={fetchQueue}
                        staffId={1}
                        counterNumber={1}
                    />
                </div>

                {/* Sidebar Queue */}
                <div className="lg:col-span-1 bg-gray-900/30 rounded-3xl p-6 border border-gray-800 flex flex-col">
                    <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
                        <span>Up Next</span>
                        <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">Priority Sort</span>
                    </h2>

                    <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                        <QueueList queue={queue} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPage;
