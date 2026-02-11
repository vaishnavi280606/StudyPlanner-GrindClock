import { useState, useCallback, useEffect } from 'react';
import { CallData, CallNotificationManager } from '../utils/call-notifications';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';

export interface UseCallStateReturn {
    callState: CallState;
    currentCall: CallData | null;
    incomingCall: CallData | null;
    error: string | null;
    rejectionFeedback: string | null;

    initiateCall: (receiverId: string, receiverName: string, receiverAvatar?: string, type?: 'video' | 'audio') => Promise<string>;
    acceptCall: () => void;
    rejectCall: () => void;
    endCall: () => void;
    setCallState: (state: CallState) => void;
    setError: (error: string | null) => void;
    clearIncomingCall: () => void;
}

export function useCallState(userId: string): UseCallStateReturn {
    const [callState, setCallState] = useState<CallState>('idle');
    const [currentCall, setCurrentCall] = useState<CallData | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rejectionFeedback, setRejectionFeedback] = useState<string | null>(null);

    // Subscribe to call notifications
    useEffect(() => {
        if (!userId) return;

        console.log('Subscribing to call notifications for user:', userId);
        const manager = new CallNotificationManager(userId);

        manager.subscribe({
            onIncomingCall: (call) => {
                console.log('Incoming call notification received:', call);
                setIncomingCall(call);
                setCallState('ringing');
            },
            onCallCancelled: (callId) => {
                console.log('Call cancelled notification received:', callId, 'Current call State:', callState);
                setIncomingCall((prev) => (prev?.callId === callId ? null : prev));
                setCurrentCall((prev) => (prev?.callId === callId ? null : prev));
                setCallState((prev) => {
                    console.log(`Transitioning state from ${prev} to idle due to cancellation`);
                    if (prev === 'ringing' || prev === 'calling' || prev === 'connected' || prev === 'connecting') {
                        return 'idle';
                    }
                    return prev;
                });
            },
            onCallRejected: (callId) => {
                console.log('Call rejected notification received:', callId);
                setCallState((prev) => {
                    if (prev === 'calling' || prev === 'ringing') {
                        setRejectionFeedback(`Call rejected`);
                        setTimeout(() => setRejectionFeedback(null), 3000);
                        return 'idle';
                    }
                    return prev;
                });
                setCurrentCall(null);
            }
        });

        return () => {
            manager.unsubscribe();
        };
    }, [userId]);

    /**
     * Initiate an outgoing call
     */
    const initiateCall = useCallback(async (
        receiverId: string,
        receiverName: string,
        receiverAvatar?: string,
        type: 'video' | 'audio' = 'video'
    ): Promise<string> => {
        try {
            const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const callData: CallData = {
                callId,
                callerId: userId,
                callerName: 'You', // This will be replaced with actual user name
                callerAvatar: undefined, // This will be replaced with actual user avatar
                receiverId,
                type,
                timestamp: Date.now()
            };

            console.log(`📞 Calling ${receiverName}...`);
            if (receiverAvatar) console.log(`Avatar: ${receiverAvatar}`);

            setCurrentCall(callData);
            setCallState('calling');
            setError(null);
            setRejectionFeedback(null);

            // Send call notification to receiver
            await CallNotificationManager.sendCallNotification(callData);

            console.log('📞 Call initiated:', callId);
            return callId;
        } catch (err) {
            console.error('Error initiating call:', err);
            setError('Failed to initiate call');
            setCallState('failed');
            throw err;
        }
    }, [userId]);

    /**
     * Accept an incoming call
     */
    const acceptCall = useCallback(() => {
        if (!incomingCall) {
            console.warn('No incoming call to accept');
            return;
        }

        console.log('✅ Accepting call:', incomingCall.callId);
        setCurrentCall(incomingCall);
        setCallState('connecting');
        setError(null);
        // Don't clear incomingCall yet - let the component handle it
    }, [incomingCall]);

    /**
     * Reject an incoming call
     */
    const rejectCall = useCallback(() => {
        if (!incomingCall) {
            console.warn('No incoming call to reject');
            return;
        }

        console.log('❌ Rejecting call:', incomingCall.callId);

        // Send rejection notification to caller
        CallNotificationManager.rejectCallNotification(incomingCall.callId, incomingCall.callerId);

        setIncomingCall(null);
        setCallState('idle');
        setError(null);
    }, [incomingCall]);

    /**
     * End the current call
     */
    const endCall = useCallback(() => {
        const idToEnd = currentCall?.callId || incomingCall?.callId;
        console.log('📞 Ending call:', idToEnd, 'State:', callState);

        if (idToEnd) {
            CallNotificationManager.cancelCallNotification(idToEnd,
                currentCall ? currentCall.receiverId : incomingCall!.callerId);
        }

        setCallState('ended');
        setCurrentCall(null);
        setIncomingCall(null);
        setError(null);

        // Reset to idle after a short delay
        setTimeout(() => setCallState('idle'), 1000);
    }, [currentCall, incomingCall, callState]);

    /**
     * Clear incoming call (used after accepting)
     */
    const clearIncomingCall = useCallback(() => {
        setIncomingCall(null);
    }, []);

    return {
        callState,
        currentCall,
        incomingCall,
        error,
        rejectionFeedback,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        setCallState,
        setError,
        clearIncomingCall
    };
}
