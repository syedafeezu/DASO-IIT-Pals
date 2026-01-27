import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceInput = ({ onSpeechResult, isListening, setIsListening }) => {
    const [support, setSupport] = useState(true);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setSupport(false);
        }
    }, []);

    useEffect(() => {
        let recognition = null;

        if (isListening && support) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();

            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Voice Input:', transcript);
                onSpeechResult(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        }

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [isListening, support, onSpeechResult, setIsListening]);

    if (!support) return null;

    return (
        <button
            onClick={() => setIsListening(!isListening)}
            className={`p-4 rounded-full transition-all duration-300 ${isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                }`}
            title="Voice Command"
        >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
    );
};

export default VoiceInput;
