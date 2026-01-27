import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, CheckCircle, Activity, ChevronRight, AlertCircle } from 'lucide-react';
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

const WalkInForm = ({ onBack, onComplete }) => {
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
    }, []);

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
            // Auto advance to submission if details are filled
            if (mobile.length === 10) handleBookSlot(foundService.id);
        }
    };

    const handleBookSlot = async (serviceId) => {
        if (!mobile || mobile.length < 10) {
            setError("Please enter a valid mobile number");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await bookSlot({
                mobile,
                name: name || "Walk-in Customer",
                age: parseInt(age),
                is_disabled: isDisabled,
                service_type: serviceId || selectedService,
                booking_type: "walk_in"
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
                    {step === 1 ? "Customer Details" : "Select Service"}
                </h2>
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
                                    handleBookSlot(service.id);
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

                    {loading && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-xl text-white">Generating your token...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WalkInForm;
