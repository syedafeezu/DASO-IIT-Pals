import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Phone } from 'lucide-react';
import { getAppointments } from '../../services/api';

const AppointmentCalendar = () => {
    const [date, setDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fix: format date in Local Time (YYYY-MM-DD) to match backend query
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    const formattedDate = localDate.toISOString().split('T')[0];

    const fetchAppointments = async () => {
        // Only set loading on first fetch or manual date change, prevent flicker on poll
        if (appointments.length === 0) setLoading(true);
        try {
            const data = await getAppointments(formattedDate);
            setAppointments(data.appointments);
        } catch (err) {
            console.error("Failed to fetch appointments", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        const interval = setInterval(fetchAppointments, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [formattedDate]);

    const changeDate = (days) => {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + days);
        setDate(newDate);
    };

    // Group appointments by hour (simple visualization)
    const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9 to 17

    return (
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="text-blue-500" />
                    <span>Appointment Schedule</span>
                </h2>
                <div className="flex items-center gap-4 bg-gray-800 rounded-lg p-1">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-700 rounded-md">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-mono font-bold min-w-[100px] text-center">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-700 rounded-md">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                        <Calendar size={48} className="mb-2 opacity-20" />
                        <p>No appointments for this date</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((appt) => (
                            <div key={appt.id} className="bg-gray-800 border-l-4 border-blue-500 rounded-r-xl p-4 hover:bg-gray-750 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-900 px-3 py-2 rounded-lg text-center min-w-[70px]">
                                            <div className="text-sm text-gray-400 font-mono">{appt.time}</div>
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">{appt.customer}</div>
                                            <div className="text-sm text-blue-400">{appt.service.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs uppercase font-bold ${appt.status === 'completed' ? 'bg-green-900 text-green-300' :
                                        appt.status === 'checked_in' ? 'bg-yellow-900 text-yellow-300' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                        {appt.status.replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-4 text-xs text-gray-500 pl-[82px]">
                                    <div className="flex items-center gap-1">
                                        <Phone size={12} />
                                        <span>...{appt.mobile.slice(-4)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>30 min slot</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
                <span>Total Appointments: {appointments.length}</span>
                <span onClick={fetchAppointments} className="text-blue-400 cursor-pointer hover:underline">Sync Calendar</span>
            </div>
        </div>
    );
};

export default AppointmentCalendar;
