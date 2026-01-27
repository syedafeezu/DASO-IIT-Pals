import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../services/api';
import { BarChart, Clock, Users, Zap } from 'lucide-react';

const AdminPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const result = await getAnalytics();
            setData(result);
        } catch (err) {
            console.error("Failed to load analytics", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 10000); // 10s polling
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) return <div className="p-8 text-white">Loading Analytics...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Manager Analytics</h1>
                        <p className="text-gray-400">Real-time branch performance metrics</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 font-mono">LIVE DATA</div>
                        <div className="text-green-500 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard
                        icon={<Clock className="text-blue-500" />}
                        label="Avg Wait Time"
                        value={`${data.avg_wait_time ? data.avg_wait_time.toFixed(1) : 0} min`}
                        trend="+2.4%" // Simulated
                        trendUp={true}
                    />
                    <MetricCard
                        icon={<Zap className="text-yellow-500" />}
                        label="Avg Service Time"
                        value={`${data.avg_service_time ? data.avg_service_time.toFixed(1) : 0} min`}
                        trend="-5.1%"
                        trendUp={false} // Good news usually
                    />
                    <MetricCard
                        icon={<Users className="text-purple-500" />}
                        label="Total Transactions"
                        value={data.total_transactions_today}
                        trend="+12"
                    />
                    <MetricCard
                        icon={<BarChart className="text-green-500" />}
                        label="Staff Efficiency"
                        value="98.5%"
                        trend="On Target"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Heatmap Widget */}
                    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h3 className="text-xl font-bold mb-6">Hourly Branch Load (Heatmap)</h3>
                        <div className="flex justify-between items-end h-48 gap-2">
                            {data.hourly_load_heatmap.map((hour) => (
                                <div key={hour.hour} className="flex-1 flex flex-col justify-end items-center group">
                                    <div className="w-full bg-blue-900/30 rounded-t-lg relative overflow-hidden group-hover:bg-blue-800/40 transition-colors">
                                        <div
                                            className="bg-blue-500 w-full absolute bottom-0 transition-all duration-1000"
                                            style={{ height: `${hour.load}%` }}
                                        ></div>
                                    </div>
                                    <span className="mt-2 text-xs text-gray-500 font-mono">{hour.hour}:00</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Staff Performance Table */}
                    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h3 className="text-xl font-bold mb-6">Staff Performance</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-500 text-sm border-b border-gray-800">
                                        <th className="pb-3">Staff Member</th>
                                        <th className="pb-3 text-center">Desk</th>
                                        <th className="pb-3 text-right">Transactions</th>
                                        <th className="pb-3 text-right">Efficiency Score</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {data.staff_performance.map((staff) => (
                                        <tr key={staff.id} className="border-b border-gray-800/50 hover:bg-white/5">
                                            <td className="py-4 font-medium">{staff.name}</td>
                                            <td className="py-4 text-center">#{staff.counter_number}</td>
                                            <td className="py-4 text-right">{staff.transactions_today}</td>
                                            <td className="py-4 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <span>{staff.efficiency_score}</span>
                                                    <div className={`w-16 h-1.5 rounded-full ${staff.efficiency_score >= 1
                                                            ? 'bg-green-500'
                                                            : 'bg-yellow-500'
                                                        }`}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, label, value, trend, trendUp }) => (
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-gray-700 transition">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-gray-800 rounded-xl">{icon}</div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp === false ? 'bg-green-900 text-green-300'
                        : trendUp === true ? 'bg-red-900 text-red-300'
                            : 'bg-gray-800 text-gray-400'
                    }`}>
                    {trend}
                </span>
            )}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
    </div>
);

export default AdminPage;
