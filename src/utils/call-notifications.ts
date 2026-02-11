import { supabase } from './supabase';

export interface CallData {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    receiverId: string;
    type: 'video' | 'audio';
    timestamp: number;
}

export interface CallNotificationCallback {
    onIncomingCall: (call: CallData) => void;
    onCallCancelled: (callId: string) => void;
    onCallRejected: (callId: string) => void;
}

export class CallNotificationManager {
    private channel: any = null;
    private userId: string;
    private callbacks: CallNotificationCallback | null = null;

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * Subscribe to incoming call notifications
     */
    public subscribe(callbacks: CallNotificationCallback): void {
        this.callbacks = callbacks;

        // Remove existing channel if any
        if (this.channel) {
            supabase.removeChannel(this.channel);
        }

        // Create a channel for this user's call notifications
        this.channel = supabase.channel(`call-notifications:${this.userId}`);

        this.channel
            .on('broadcast', { event: 'incoming-call' }, (payload: any) => {
                console.log('📞 Incoming call notification:', payload.payload);
                if (payload.payload.receiverId === this.userId) {
                    this.callbacks?.onIncomingCall(payload.payload);
                }
            })
            .on('broadcast', { event: 'call-cancelled' }, (payload: any) => {
                console.log('❌ Call cancelled:', payload.payload);
                if (payload.payload.receiverId === this.userId) {
                    this.callbacks?.onCallCancelled(payload.payload.callId);
                }
            })
            .on('broadcast', { event: 'call-rejected' }, (payload: any) => {
                console.log('🚫 Call rejected:', payload.payload);
                if (payload.payload.receiverId === this.userId) {
                    this.callbacks?.onCallRejected(payload.payload.callId);
                }
            })
            .subscribe((status: string) => {
                console.log(`Call notification channel status: ${status}`);
            });
    }

    /**
     * Unsubscribe from call notifications
     */
    public unsubscribe(): void {
        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }
        this.callbacks = null;
    }

    /**
     * Send a call notification to a specific user
     */
    public static async sendCallNotification(callData: CallData): Promise<void> {
        const channel = supabase.channel(`call-notifications:${callData.receiverId}`);

        try {
            await channel.subscribe();

            await channel.send({
                type: 'broadcast',
                event: 'incoming-call',
                payload: callData
            });

            console.log('📤 Call notification sent to:', callData.receiverId);

            // Keep channel open briefly to ensure delivery
            setTimeout(() => {
                supabase.removeChannel(channel);
            }, 1000);
        } catch (error) {
            console.error('Error sending call notification:', error);
            supabase.removeChannel(channel);
        }
    }

    /**
     * Send a call cancellation notification
     */
    public static async cancelCallNotification(callId: string, receiverId: string): Promise<void> {
        const channel = supabase.channel(`call-notifications:${receiverId}`);

        try {
            await channel.subscribe();

            await channel.send({
                type: 'broadcast',
                event: 'call-cancelled',
                payload: { callId, receiverId }
            });

            console.log('📤 Call cancellation sent to:', receiverId);

            setTimeout(() => {
                supabase.removeChannel(channel);
            }, 1000);
        } catch (error) {
            console.error('Error sending call cancellation:', error);
            supabase.removeChannel(channel);
        }
    }

    /**
     * Send a call rejection notification
     */
    public static async rejectCallNotification(callId: string, receiverId: string): Promise<void> {
        const channel = supabase.channel(`call-notifications:${receiverId}`);

        try {
            await channel.subscribe();

            await channel.send({
                type: 'broadcast',
                event: 'call-rejected',
                payload: { callId, receiverId }
            });

            console.log('📤 Call rejection sent to:', receiverId);

            setTimeout(() => {
                supabase.removeChannel(channel);
            }, 1000);
        } catch (error) {
            console.error('Error sending call rejection:', error);
            supabase.removeChannel(channel);
        }
    }
}
