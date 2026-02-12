import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2, Settings, User, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { WebRTCSignaling } from '../utils/webrtc-signaling';

interface VideoCallProps {
    participantName: string;
    participantAvatar?: string;
    onClose: () => void;
    isDarkMode: boolean;
    currentUserId: string;
    callId: string;
    participantId: string;
    isInitiator: boolean;
}

export function VideoCall({
    participantName,
    participantAvatar,
    onClose,
    isDarkMode,
    currentUserId,
    callId,
    participantId,
    isInitiator
}: VideoCallProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<string>('connecting');
    const [signalingStatus, setSignalingStatus] = useState<string>('IDLE');
    const [isSwapped, setIsSwapped] = useState(false);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const signaling = useRef<WebRTCSignaling | null>(null);
    const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
    const statsTimer = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnect = 5;

    useEffect(() => {
        initializeCall();

        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (statsTimer.current) clearInterval(statsTimer.current);
            cleanupCall();
        };
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        // Only start timer when connection is established
        if (connectionState === 'connected' && !callStartTime) {
            setCallStartTime(Date.now());
        }

        if (connectionState === 'connected' && callStartTime) {
            timer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
                setCallDuration(elapsed);
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [connectionState, callStartTime]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Monitor connection quality via WebRTC stats
    useEffect(() => {
        if (connectionState !== 'connected' || !peerConnection.current) {
            setConnectionQuality('unknown');
            return;
        }

        statsTimer.current = setInterval(async () => {
            try {
                const pc = peerConnection.current;
                if (!pc) return;
                const stats = await pc.getStats();
                let roundTripTime = 0;
                let packetsLost = 0;
                let packetsReceived = 0;

                stats.forEach((report: any) => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        roundTripTime = report.currentRoundTripTime || 0;
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        packetsLost = report.packetsLost || 0;
                        packetsReceived = report.packetsReceived || 0;
                    }
                });

                const lossRate = packetsReceived > 0 ? packetsLost / (packetsReceived + packetsLost) : 0;

                if (roundTripTime < 0.1 && lossRate < 0.01) {
                    setConnectionQuality('excellent');
                } else if (roundTripTime < 0.3 && lossRate < 0.05) {
                    setConnectionQuality('good');
                } else {
                    setConnectionQuality('poor');
                }
            } catch {
                // Stats not available
            }
        }, 3000);

        return () => {
            if (statsTimer.current) clearInterval(statsTimer.current);
        };
    }, [connectionState]);

    const initializeCall = async () => {
        try {
            setConnectionState('connecting');
            // 1. Get Local Stream with Fallbacks
            let stream: MediaStream | null = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setError(null);
            } catch (err: any) {
                console.warn('Failed to get video+audio:', err);
                // Try video only
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setError('Microphone access failed. Video only mode.');
                } catch (videoErr) {
                    // Try audio only
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        setError('Camera access failed. Audio only mode.');
                    } catch (audioErr) {
                        throw err; // Throw the original error if everything fails
                    }
                }
            }

            if (!stream) throw new Error('No stream obtained');
            setLocalStream(stream);

            // 2. Initialize Signaling
            if (!callId || !currentUserId || !participantId) {
                setError('Missing call details');
                return;
            }

            signaling.current = new WebRTCSignaling(callId, currentUserId, {
                onSignalingStatusChange: (status) => {
                    console.log('📡 Signaling Status:', status);
                    setSignalingStatus(status);
                    if (status === 'SUBSCRIBED') {
                        setError(null);
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        setError(`Signaling ${status.toLowerCase().replace('_', ' ')}. Retrying...`);
                    }
                },
                onError: (err) => {
                    console.error('Signaling error:', err);
                    setError(err.message || 'Signaling connection error.');
                }
            });

            const joined = await signaling.current.join();
            if (!joined) {
                // If it fails after all retries or timeout
                setError('Failed to establish signaling connection. Please check your network and try again.');
                setConnectionState('failed');
                return;
            }

            // 3. Initialize Peer Connection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
                ],
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
            });
            peerConnection.current = pc;

            // Monitor connection state
            pc.onconnectionstatechange = () => {
                console.log('RTCPeerConnection state:', pc.connectionState);
                if (pc.connectionState === 'connected') {
                    setConnectionState('connected');
                    setError(null);
                    reconnectAttempts.current = 0;
                } else if (pc.connectionState === 'failed') {
                    if (reconnectAttempts.current < maxReconnect) {
                        reconnectAttempts.current++;
                        setConnectionState('connecting');
                        setError(`Connection lost. Reconnecting (${reconnectAttempts.current}/${maxReconnect})...`);
                        reconnectTimer.current = setTimeout(() => {
                            cleanupCall();
                            initializeCall();
                        }, 2000);
                    } else {
                        setConnectionState('failed');
                        setError('Connection failed after multiple attempts. Please try again.');
                    }
                } else if (pc.connectionState === 'disconnected') {
                    setError('Connection interrupted. Attempting to recover...');
                }
            };

            // Monitor ICE connection state for faster detection
            pc.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', pc.iceConnectionState);
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    setConnectionState('connected');
                    setError(null);
                } else if (pc.iceConnectionState === 'disconnected') {
                    setError('Connection interrupted. Waiting to recover...');
                } else if (pc.iceConnectionState === 'failed') {
                    // Force an ICE restart
                    console.log('ICE failed, attempting ICE restart...');
                    pc.restartIce();
                }
            };

            // Add local tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Handle remote tracks
            pc.ontrack = (event) => {
                console.log('Received remote track');
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    signaling.current?.sendSignal('ice-candidate', event.candidate, participantId);
                }
            };

            // Handle Signaling Events
            signaling.current.onSignal(async (payload) => {
                try {
                    if (payload.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        signaling.current?.sendSignal('answer', answer, participantId);
                    } else if (payload.type === 'answer') {
                        if (pc.signalingState !== 'stable') {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
                        }
                    } else if (payload.type === 'ice-candidate') {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.data));
                    }
                } catch (err) {
                    console.error('Error handling signal:', err);
                }
            });

            // 4. Create Offer if Initiator
            if (isInitiator) {
                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await pc.setLocalDescription(offer);

                // Ensure we have a small delay or check status before sending
                const sendOffer = async (retries = 3) => {
                    if (signaling.current?.getConnectionStatus()) {
                        signaling.current?.sendSignal('offer', offer, participantId);
                    } else if (retries > 0) {
                        setTimeout(() => sendOffer(retries - 1), 1000);
                    } else {
                        setError('Signaling timed out. Please refresh.');
                    }
                };

                sendOffer();
            }

        } catch (err: any) {
            console.error('Error initializing call:', err);
            let errorMessage = 'Failed to access camera/microphone';
            if (err.name === 'NotAllowedError') errorMessage = 'Permission denied. Please allow camera/mic access.';
            if (err.name === 'NotFoundError') errorMessage = 'No camera or microphone found.';
            if (err.name === 'NotReadableError') errorMessage = 'Camera/Mic is in use by another app.';
            setError(errorMessage);
            setConnectionState('failed');
        }
    };

    const cleanupCall = () => {
        localStream?.getTracks().forEach(track => track.stop());
        peerConnection.current?.close();
        signaling.current?.leave();
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoOff;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 ${isDarkMode ? 'bg-slate-950/90' : 'bg-slate-900/80'
            } backdrop-blur-md`}>
            <div className={`relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-slate-700'
                }`}>
                {/* Main Video Area */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    {!isSwapped ? (
                        // Remote video in main view
                        remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-6">
                                <div className="relative mb-6">
                                    <img
                                        src={participantAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop'}
                                        alt={participantName}
                                        className="w-32 h-32 rounded-full border-4 border-amber-500 shadow-2xl object-cover opacity-50"
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-amber-500 w-6 h-6 rounded-full border-4 border-slate-900 animate-pulse" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">{participantName}</h2>
                                <p className="text-amber-400 font-mono text-lg mb-4">{formatDuration(callDuration)}</p>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    {remoteStream ? (
                                        <>
                                            <Mic size={16} className="animate-pulse text-green-500" />
                                            Audio Only
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for video...'}
                                        </>
                                    )}
                                </div>
                                {error && (
                                    <div className="mt-4 flex flex-col items-center gap-3">
                                        <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                                            {error}
                                        </p>
                                        <button
                                            onClick={() => {
                                                cleanupCall();
                                                initializeCall();
                                            }}
                                            className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
                                        >
                                            <RefreshCw size={18} className={connectionState === 'connecting' ? 'animate-spin' : ''} />
                                            Reconnect
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        // Local video in main view when swapped
                        isVideoOff ? (
                            <div className="flex flex-col items-center gap-2">
                                <User size={64} className="text-slate-500" />
                                <span className="text-xl text-slate-500 font-bold uppercase">Camera Off</span>
                            </div>
                        ) : (
                            localStream && (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                            )
                        )
                    )}
                </div>

                {/* Thumbnail Video (Swappable) */}
                <div
                    className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-2xl border-2 border-white/20 shadow-xl overflow-hidden z-10 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setIsSwapped(!isSwapped)}
                    title="Click to swap"
                >
                    <div className="w-full h-full flex items-center justify-center bg-slate-700">
                        {!isSwapped ? (
                            // Local video in thumbnail by default
                            isVideoOff ? (
                                <div className="flex flex-col items-center gap-2">
                                    <User size={32} className="text-slate-500" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Camera Off</span>
                                </div>
                            ) : localStream ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                            ) : (
                                <Loader2 size={24} className="text-amber-500 animate-spin" />
                            )
                        ) : (
                            // Remote video in thumbnail when swapped
                            remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center">
                                    <img
                                        src={participantAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop'}
                                        alt={participantName}
                                        className="w-16 h-16 rounded-full opacity-50"
                                    />
                                </div>
                            )
                        )}
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-widest">
                        {!isSwapped ? 'You' : participantName.split(' ')[0]}
                    </div>
                    <div className="absolute top-2 right-2 p-1 bg-amber-500 rounded-full">
                        <RefreshCw size={12} className="text-white" />
                    </div>
                </div>

                {/* Top Controls */}
                <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
                    {connectionState === 'connected' && (
                        <div className="px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-white font-mono text-sm font-bold">{formatDuration(callDuration)}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowAddFriend(!showAddFriend)}
                        className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white backdrop-blur-md transition-all"
                        title="Add friend to call"
                    >
                        <UserPlus size={20} />
                    </button>
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all"
                    >
                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    <button className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all">
                        <Settings size={20} />
                    </button>
                </div>

                {/* Add Friend Dropdown */}
                {showAddFriend && (
                    <div className="absolute top-20 left-6 w-64 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl z-20 overflow-hidden">
                        <div className="p-3 bg-amber-500/10 border-b border-slate-700">
                            <h4 className="font-bold text-sm text-white">Add to Call</h4>
                            <p className="text-xs text-slate-400 mt-1">Feature coming soon - Group video calls</p>
                        </div>
                        <div className="p-3 text-center text-slate-500 text-sm">
                            Multi-party video calls will be available in the next update
                        </div>
                    </div>
                )}

                {/* Bottom Controls */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 px-8 py-4 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 z-10">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>

                    <div className="w-px h-10 bg-white/10 mx-2" />

                    <button
                        onClick={async () => {
                            // Always send call ended notification to other side
                            try {
                                const { createNotification, supabase } = await import('../utils/supabase-queries');

                                // Calculate duration if call was connected
                                const duration = (connectionState === 'connected' && callStartTime)
                                    ? Math.floor((Date.now() - callStartTime) / 1000)
                                    : 0;

                                // Save call history only if call was connected and had duration
                                if (isInitiator && duration > 0) {
                                    const { error: historyError } = await supabase
                                        .from('call_history')
                                        .insert({
                                            caller_id: currentUserId,
                                            receiver_id: participantId,
                                            duration_seconds: duration
                                        });

                                    if (historyError) {
                                        console.error('Error saving call history:', historyError);
                                    }
                                }

                                // Always notify other side that call ended
                                await createNotification(participantId, currentUserId, 'call_ended', {
                                    duration,
                                    senderName: 'User'
                                });
                                console.log('Call ended notification sent to:', participantId);
                            } catch (error) {
                                console.error('Error ending call:', error);
                            }
                            onClose();
                        }}
                        className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all transform hover:scale-110 active:scale-95"
                    >
                        <PhoneOff size={28} />
                    </button>
                </div>

                {/* Status Indicators */}
                <div className="absolute bottom-6 left-6 text-white/60 text-xs font-medium z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                        {connectionState === 'connected' ? (
                            <span className="flex items-center gap-1.5">
                                {connectionQuality === 'excellent' ? 'HD Connection' : connectionQuality === 'good' ? 'Good Connection' : connectionQuality === 'poor' ? 'Weak Connection' : 'Connected'}
                                {' • Secured'}
                                <span className="flex gap-0.5 ml-1">
                                    {['excellent', 'good', 'poor'].map((q, i) => (
                                        <div key={i} className={`w-1 rounded-full ${
                                            (connectionQuality === 'excellent' && i <= 2) ||
                                            (connectionQuality === 'good' && i <= 1) ||
                                            (connectionQuality === 'poor' && i === 0)
                                                ? 'bg-green-500'
                                                : 'bg-white/20'
                                        }`} style={{ height: `${8 + i * 4}px` }} />
                                    ))}
                                </span>
                            </span>
                        ) : 'Establishing Connection...'}
                    </div>
                    {signalingStatus !== 'SUBSCRIBED' && (
                        <div className="flex items-center gap-2 text-white/40 italic">
                            <Loader2 size={10} className="animate-spin" />
                            Signaling: {signalingStatus || 'INITIALIZING'}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .mirror {
                    transform: scaleX(-1);
                }
            `}</style>
        </div>
    );
}
