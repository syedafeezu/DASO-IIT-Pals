import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, CheckCircle, Activity, ChevronRight, AlertCircle, Calendar, Clock } from 'lucide-react';
import VoiceInput from './VoiceInput';
import { bookSlot, getServiceTypes } from '../../services/api';

const SERVICE_ICONS = {
    "Cash_Deposit": "💰",
    "Cash_Withdrawal": "🏧",
    "Loan_Inquiry": "📄",
    "KYC_Update": "📝",
    "Forex": "💱",
    "Lost_Card": "💳",
    "Account_Opening": "👤",
    "Fixed_Deposit": "🏦"
};

const WalkInForm = ({ onBack, onComplete, mode = 'walk_in' }) => {
    const [step, setStep] = useState(1);
    const [mobile, setMobile] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState(30);
    const [isDisabled, setIsDisabled] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // New state for pre-booking
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);

    useEffect(() => {
        // Load available services
        const loadServices = async () => {
            try {
                const data = await getServiceTypes();
                setServices(data.service_types);
            } catch (err) {
                console.error("Failed to load services", err);
            }
        };
        loadServices();

        // Generate mock slots if in pre-book mode
        if (mode === 'pre_book') {
            generateSlots();
        }
    }, [mode, selectedDate]);

    const generateSlots = () => {
        // Create 30 min slots from 9AM to 5PM
        const slots = [];
        let start = 9;
        while (start < 17) {
            slots.push(`${start.toString().padStart(2, '0')}:00`);
            slots.push(`${start.toString().padStart(2, '0')}:30`);
            start++;
        }
        // Randomly disable some slots to simulate reality
        setAvailableSlots(slots.map(s => ({ time: s, available: Math.random() > 0.3 })));
    };

    const handleVoiceResult = (transcript) => {
        const text = transcript.toLowerCase();

        // Check for service match
        const foundService = services.find(s =>
            text.includes(s.name.toLowerCase()) ||
            text.includes(s.name.replace('_', ' ').toLowerCase())
        );

        if (foundService) {
            setSelectedService(foundService.id);
            setIsListening(false);
            // Auto advance
            if (mobile.length === 10 && mode === 'walk_in') handleBookSlot(foundService.id);
        }
    };

    const handleBookSlot = async (serviceId) => {
        if (!mobile || mobile.length < 10) {
            setError("Please enter a valid mobile number");
            return;
        }

        if (mode === 'pre_book' && !selectedTimeSlot) {
            setError("Please select a time slot");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Construct scheduled time if pre-booking
            let scheduledTime = null;
            if (mode === 'pre_book' && selectedTimeSlot) {
                // Create date object
                const dateParts = selectedDate.split('-');
                const timeParts = selectedTimeSlot.split(':');
                const date = new Date(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[2]),
                    parseInt(timeParts[0]),
                    parseInt(timeParts[1])
                );

                // Manually format to YYYY-MM-DDTHH:mm:ss to preserve local time
                const pad = (n) => n.toString().padStart(2, '0');
                scheduledTime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
            }

            const result = await bookSlot({
                mobile,
                name: name || (mode === 'pre_book' ? "Pre-booked Customer" : "Walk-in Customer"),
                age: parseInt(age),
                is_disabled: isDisabled,
                service_type: serviceId || selectedService,
                booking_type: mode === 'pre_book' ? 'pre_booked' : 'walk_in',
                scheduled_time: scheduledTime
            });

            if (result.success) {
                onComplete(result);
            }
        } catch (err) {
            setError("Booking failed. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center mb-8">
                <button onClick={onBack} className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-3xl font-bold ml-6">
                    {step === 1 ? "Customer Details" : (step === 2 ? "Select Service" : "Select Time Slot")}
                </h2>
                {mode === 'pre_book' && step === 3 && (
                    <div className="ml-auto flex items-center gap-2 text-blue-400">
                        <Calendar size={20} />
                        <span>Remote Booking Mode</span>
                    </div>
                )}
            </div>

            {step === 1 && (
                <div className="flex-1 flex flex-col justify-center space-y-8 animate-in slide-in-from-right">
                    <div className="space-y-6">
                        <div className="relative">
                            <label className="block text-gray-400 mb-2 text-lg">Mobile Number <span className="text-red-500">*</span></label>
                            <div className="flex items-center bg-gray-800 rounded-xl border-2 border-gray-700 focus-within:border-blue-500 p-4">
                                <Phone className="text-gray-400 mr-4" />
                                <input
                                    type="tel"
                                    className="bg-transparent border-none outline-none text-2xl w-full placeholder-gray-600"
                                    placeholder="9876543210"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-gray-400 mb-2 text-lg">Name (Optional)</label>
                                <div className="flex items-center bg-gray-800 rounded-xl border-2 border-gray-700 focus-within:border-blue-500 p-4">
                                    <User className="text-gray-400 mr-4" />
                                    <input
                                        type="text"
                                        className="bg-transparent border-none outline-none text-xl w-full placeholder-gray-600"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-gray-400 mb-2 text-lg">Age</label>
                                <div className="flex items-center bg-gray-800 rounded-xl border-2 border-gray-700 focus-within:border-blue-500 p-4">
                                    <Activity className="text-gray-400 mr-4" />
                                    <input
                                        type="number"
                                        className="bg-transparent border-none outline-none text-xl w-full placeholder-gray-600"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        min="18"
                                        max="100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center p-4 bg-gray-800 rounded-xl border-2 border-gray-700 cursor-pointer" onClick={() => setIsDisabled(!isDisabled)}>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 ${isDisabled ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                {isDisabled && <CheckCircle size={20} className="text-white" />}
                            </div>
                            <span className="text-xl">I require disability assistance</span>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-xl flex items-center">
                                <AlertCircle className="mr-2" />
                                {error}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (mobile.length === 10) setStep(2);
                            else setError("Please enter a valid 10-digit mobile number");
                        }}
                        className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-2xl font-bold hover:shadow-lg transform active:scale-95 transition-all flex items-center justify-center"
                    >
                        Next Step <ChevronRight className="ml-2" />
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-right">

                    <div className="flex justify-between items-center mb-6">
                        <p className="text-gray-400 text-lg">Tap to select or use voice command</p>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 uppercase tracking-widest">Voice Assistant</span>
                            <VoiceInput
                                isListening={isListening}
                                setIsListening={setIsListening}
                                onSpeechResult={handleVoiceResult}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                        {services.map((service) => (
                            <button
                                key={service.id}
                                onClick={() => {
                                    setSelectedService(service.id);
                                    if (mode === 'pre_book') {
                                        setStep(3); // Go to slot selection
                                    } else {
                                        handleBookSlot(service.id);
                                    }
                                }}
                                disabled={loading}
                                className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-2xl border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-750 transition-all duration-200 group text-center"
                            >
                                <span className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">
                                    {SERVICE_ICONS[service.id] || "🏦"}
                                </span>
                                <span className="text-lg font-semibold text-gray-200 group-hover:text-white">
                                    {service.name.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-gray-500 mt-2">
                                    Est. {service.base_duration_min} mins
                                </span>
                            </button>
                        ))}
                    </div>

                    {loading && mode !== 'pre_book' && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-xl text-white">Generating your token...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === 3 && mode === 'pre_book' && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-right">

                    <div className="mb-8">
                        <label className="text-gray-400 block mb-2">Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 text-white text-xl w-full outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
                        {availableSlots.map((slot) => (
                            <button
                                key={slot.time}
                                disabled={!slot.available}
                                onClick={() => setSelectedTimeSlot(slot.time)}
                                className={`p-4 rounded-xl border-2 text-lg font-mono transition-all ${!slot.available
                                    ? 'bg-red-900/10 border-red-900/30 text-red-800 cursor-not-allowed decoration-red-900 line-through'
                                    : selectedTimeSlot === slot.time
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-400 hover:text-white'
                                    }`}
                            >
                                {slot.time}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-xl flex items-center mb-6">
                            <AlertCircle className="mr-2" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={() => handleBookSlot()}
                        disabled={loading || !selectedTimeSlot}
                        className="w-full py-6 bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl text-2xl font-bold hover:shadow-lg transform active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Confirming...' : 'Confirm Appointment'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WalkInForm;
