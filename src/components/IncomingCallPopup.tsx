import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { CallData } from '../utils/call-notifications';

interface IncomingCallPopupProps {
    call: CallData;
    onAccept: () => void;
    onReject: () => void;
    isDarkMode: boolean;
    soundEnabled?: boolean;
    incomingCallSoundEnabled?: boolean;
}

export function IncomingCallPopup({
    call,
    onAccept,
    onReject,
    isDarkMode,
    soundEnabled = true,
    incomingCallSoundEnabled = true
}: IncomingCallPopupProps) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [audioError, setAudioError] = useState(false);

    useEffect(() => {
        // Play ringtone if enabled
        if (soundEnabled && incomingCallSoundEnabled) {
            const ringtoneUrl = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
            const audio = new Audio(ringtoneUrl);
            audio.loop = true;
            audio.volume = 0.6;
            audioRef.current = audio;

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Failed to play ringtone (auto-play likely blocked):', err);
                    setAudioError(true);
                });
            }
        }

        // Auto-reject after 30 seconds
        timeoutRef.current = setTimeout(() => {
            console.log('Call timeout - auto rejecting');
            onReject();
        }, 30000);

        // Cleanup
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [onReject, soundEnabled, incomingCallSoundEnabled]);

    const handleEnableSound = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setAudioError(false);
            }).catch(e => console.error("Manual play failed:", e));
        }
    };

    const handleAccept = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onAccept();
    };

    const handleReject = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onReject();
    };

    return (
        <div className="fixed top-20 right-6 z-[9999] w-full max-w-sm animate-slideIn">
            <div className={`relative p-6 rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}>

                {/* Pulsing ring animation backdrop */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 animate-pulse"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4">
                        {/* Caller Avatar */}
                        <div className="relative flex-shrink-0">
                            {call.callerAvatar ? (
                                <img
                                    src={call.callerAvatar}
                                    alt={call.callerName}
                                    className="w-16 h-16 rounded-full border-2 border-green-500 shadow-md"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full border-2 border-green-500 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-md">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                            )}

                            {/* Call type indicator icon */}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 shadow-md border-2 border-slate-900">
                                {call.type === 'video' ? (
                                    <Video className="w-3 h-3 text-white" />
                                ) : (
                                    <Phone className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>

                        {/* Caller Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {call.callerName}
                            </h2>
                            <p className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                Incoming {call.type === 'video' ? 'Video' : 'Voice'} Call
                                <span className="flex gap-1">
                                    <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </span>
                            </p>
                        </div>
                    </div>

                    {audioError && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={handleEnableSound}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all animate-pulse ${isDarkMode ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                </span>
                                Enable Ringtone
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        {/* Reject Button */}
                        <button
                            onClick={handleReject}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-bold shadow-sm"
                        >
                            <PhoneOff size={18} />
                            Decline
                        </button>

                        {/* Accept Button */}
                        <button
                            onClick={handleAccept}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-200 font-bold shadow-sm animate-pulse"
                        >
                            <Phone size={18} />
                            Accept
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
        </div>
    );
}
