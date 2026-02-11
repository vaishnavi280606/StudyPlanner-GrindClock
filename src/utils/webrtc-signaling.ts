import { supabase } from './supabase';

type SignalType = 'offer' | 'answer' | 'ice-candidate';

interface SignalPayload {
    type: SignalType;
    data: any;
    senderId: string;
    receiverId: string;
}

export interface WebRTCCallbacks {
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
    onSignalingStatusChange?: (status: string) => void;
    onError?: (error: Error) => void;
}

export class WebRTCSignaling {
    private channel: any;
    private callId: string;
    private userId: string;
    private onSignalCallback: ((payload: SignalPayload) => void) | null = null;
    private isConnected: boolean = false;
    private isJoining: boolean = false;
    private pendingSignals: { type: SignalType; data: any; receiverId: string }[] = [];
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private callbacks: WebRTCCallbacks = {};
    private joinPromise: Promise<boolean> | null = null;

    constructor(callId: string, userId: string, callbacks?: WebRTCCallbacks) {
        this.callId = callId;
        this.userId = userId;
        this.callbacks = callbacks || {};
    }

    public async join(): Promise<boolean> {
        if (this.isJoining && this.joinPromise) {
            console.log('⏳ Join already in progress, waiting...');
            return this.joinPromise;
        }

        this.isJoining = true;
        this.joinPromise = new Promise(async (resolve) => {
            const timeout = 20000; // 20 seconds
            let resolved = false;

            const finish = (result: boolean) => {
                if (resolved) return;
                resolved = true;
                this.isJoining = false;
                this.joinPromise = null;
                resolve(result);
            };

            // Remove any existing channel first
            if (this.channel) {
                console.log('🧹 Cleaning up existing channel before join');
                try {
                    await supabase.removeChannel(this.channel);
                } catch (e) {
                    console.warn('Error removing channel:', e);
                }
            }

            console.log(`🔌 Joining signaling channel: call:${this.callId}`);
            this.callbacks.onSignalingStatusChange?.('JOINING');

            this.channel = supabase.channel(`call:${this.callId}`, {
                config: {
                    broadcast: { self: false, ack: true }
                }
            });

            this.channel
                .on('broadcast', { event: 'signal' }, (payload: any) => {
                    console.log('📡 Received signal:', payload.payload?.type, 'from:', payload.payload?.senderId);
                    if (payload.payload.receiverId === this.userId) {
                        this.onSignalCallback?.(payload.payload);
                    }
                })
                .subscribe(async (status: string) => {
                    console.log(`🔌 Signaling channel status update: ${status}`);
                    this.callbacks.onSignalingStatusChange?.(status);

                    if (status === 'SUBSCRIBED') {
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        this.flushPendingSignals();
                        finish(true);
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        this.isConnected = false;
                        if (!resolved) {
                            this.handleConnectionError();
                            finish(false);
                        }
                    }
                });

            // Absolute timeout
            setTimeout(() => {
                if (!resolved) {
                    console.warn('⚠️ Signaling join timed out after 20s');
                    this.handleConnectionError();
                    finish(false);
                }
            }, timeout);
        });

        return this.joinPromise;
    }

    private handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`🔄 Signaling error. Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
            setTimeout(() => {
                this.join().catch(console.error);
            }, delay);
        } else {
            console.error('❌ Max signaling reconnection attempts reached');
            this.callbacks.onError?.(new Error('Signaling connection permanently failed. Please check your internet.'));
        }
    }

    private async flushPendingSignals() {
        console.log(`📤 Flushing ${this.pendingSignals.length} pending signals`);
        while (this.pendingSignals.length > 0) {
            const signal = this.pendingSignals.shift();
            if (signal) {
                await this.sendSignal(signal.type, signal.data, signal.receiverId);
            }
        }
    }

    public leave() {
        console.log('👋 Leaving signaling channel');
        if (this.channel) {
            this.isConnected = false;
            supabase.removeChannel(this.channel);
            this.channel = null;
        }
        this.pendingSignals = [];
        this.reconnectAttempts = 0;
    }

    public async sendSignal(type: SignalType, data: any, receiverId: string) {
        if (!this.channel) {
            console.warn('⚠️ No channel available for sending signal');
            return;
        }

        if (!this.isConnected) {
            console.log('⏳ Channel not ready, queueing signal:', type);
            this.pendingSignals.push({ type, data, receiverId });
            return;
        }

        console.log('📤 Sending signal:', type, 'to:', receiverId);

        try {
            await this.channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: {
                    type,
                    data,
                    senderId: this.userId,
                    receiverId
                }
            });
        } catch (err) {
            console.error('❌ Error sending signal:', err);
            this.callbacks.onError?.(err as Error);
            // Queue the signal for retry
            this.pendingSignals.push({ type, data, receiverId });
        }
    }

    public onSignal(callback: (payload: SignalPayload) => void) {
        this.onSignalCallback = callback;
    }

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    public getPendingSignalsCount(): number {
        return this.pendingSignals.length;
    }

    public setCallbacks(callbacks: WebRTCCallbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
}

