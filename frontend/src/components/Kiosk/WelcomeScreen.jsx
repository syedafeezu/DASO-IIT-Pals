import React from 'react';
import { UserPlus, CalendarCheck } from 'lucide-react';

const WelcomeScreen = ({ onSelectMode }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    DASO
                </h1>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    Dynamic Appointment & Slot Optimization System for Banks
                </h2>
                <p className="text-2xl text-gray-400">Welcome to the future of banking</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                <button
                    onClick={() => onSelectMode('walk_in')}
                    className="group relative flex flex-col items-center justify-center p-12 bg-gray-800 rounded-3xl border-2 border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transform hover:-translate-y-2"
                >
                    <div className="p-6 bg-blue-500/20 rounded-full mb-6 group-hover:bg-blue-500/30 transition-colors">
                        <UserPlus size={64} className="text-blue-400" />
                    </div>
                    <span className="text-3xl font-bold text-white mb-2">New Token</span>
                    <span className="text-gray-400">For Walk-in Customers</span>
                </button>

                <button
                    onClick={() => onSelectMode('check_in')}
                    className="group relative flex flex-col items-center justify-center p-12 bg-gray-800 rounded-3xl border-2 border-gray-700 hover:border-emerald-500 transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transform hover:-translate-y-2"
                >
                    <div className="p-6 bg-emerald-500/20 rounded-full mb-6 group-hover:bg-emerald-500/30 transition-colors">
                        <CalendarCheck size={64} className="text-emerald-400" />
                    </div>
                    <span className="text-3xl font-bold text-white mb-2">I have an Appt</span>
                    <span className="text-gray-400">Check-in for Appointment</span>
                </button>
            </div>

            <div className="flex justify-center w-full">
                <button
                    onClick={() => onSelectMode('pre_book')}
                    className="text-gray-400 hover:text-blue-400 font-mono text-sm border-b border-dashed border-gray-600 hover:border-blue-400 transition-all pb-1"
                >
                    Book a Future Appointment (Simulation)
                </button>
            </div>

            <div className="absolute bottom-8 text-gray-500">
                IIT PALS Innovation Prototype
            </div>
        </div>
    );
};

export default WelcomeScreen;
