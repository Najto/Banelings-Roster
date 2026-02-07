import { supabase } from './supabaseClient';
import { VersionKey } from '../types';

interface PresenceState {
  user_id: string;
  online_at: string;
}

type PresenceCallback = (count: number) => void;

class PresenceService {
  private channels: Map<string, any> = new Map();
  private presenceCallbacks: Map<string, PresenceCallback> = new Map();

  trackPresence(
    channelName: string,
    versionKey: VersionKey,
    onCountChange: PresenceCallback
  ): () => void {
    const channelId = `presence:${channelName}:${versionKey}`;

    if (this.channels.has(channelId)) {
      return () => this.stopTracking(channelId);
    }

    const userId = `user_${Math.random().toString(36).substring(2, 15)}`;

    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const userCount = Object.keys(presenceState).length;
        onCountChange(userCount);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const presenceState = channel.presenceState();
        const userCount = Object.keys(presenceState).length;
        onCountChange(userCount);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const presenceState = channel.presenceState();
        const userCount = Object.keys(presenceState).length;
        onCountChange(userCount);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
          console.log(`Tracking presence on ${channelId}`);
        }
      });

    this.channels.set(channelId, channel);
    this.presenceCallbacks.set(channelId, onCountChange);

    return () => this.stopTracking(channelId);
  }

  private stopTracking(channelId: string) {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.untrack();
      supabase.removeChannel(channel);
      this.channels.delete(channelId);
      this.presenceCallbacks.delete(channelId);
      console.log(`Stopped tracking presence on ${channelId}`);
    }
  }

  stopAll() {
    this.channels.forEach((_, channelId) => {
      this.stopTracking(channelId);
    });
  }
}

export const presenceService = new PresenceService();
