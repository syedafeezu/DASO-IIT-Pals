import React from 'react';
import { User, Activity, Clock, AlertCircle } from 'lucide-react';

const QueueList = ({ queue }) => {
    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                <User size={48} className="mb-2 opacity-20" />
                <p>No customers in queue</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {queue.map((customer, index) => (
                <div
                    key={customer.id}
                    className={`relative p-4 rounded-xl border transition-all hover:scale-[1.02] ${index === 0
                        ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'bg-gray-800 border-gray-700'
                        }`}
                >
                    {index === 0 && (
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                            NEXT
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="text-xl font-mono font-bold text-white flex items-center gap-2">
                                {customer.token_number}
                                {customer.priority_score > 80 && (
                                    <Activity size={16} className="text-red-500 animate-pulse" title="High Priority" />
                                )}
                            </div>
                            <div className="text-sm text-gray-400">{customer.service_type.replace('_', ' ')}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-blue-400">{Math.round(customer.priority_score || 0)}</div>
                            <div className="text-xs text-gray-500">Priority Score</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700/50">
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>Est. {customer.predicted_duration_min}m</span>
                        </div>
                        {customer.is_disabled && (
                            <div className="flex items-center gap-1 text-yellow-500">
                                <AlertCircle size={12} />
                                <span>Assistance Req.</span>
                            </div>
                        )}
                        {customer.booking_type === 'pre_booked' && (
                            <div className="ml-auto px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                Appointment
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default QueueList;
