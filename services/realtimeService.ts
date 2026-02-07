import { supabase } from './supabaseClient';
import { SplitGroup, VersionKey } from '../types';

type SplitsChangeCallback = (newSplits: SplitGroup[]) => void;
type CharacterChangeCallback = () => void;
type RosterChangeCallback = () => void;

class RealtimeService {
  private splitsChannels: Map<string, any> = new Map();
  private characterChannel: any = null;
  private rosterChannel: any = null;

  subscribeSplits(
    guildKey: string,
    versionKey: VersionKey,
    onUpdate: SplitsChangeCallback
  ): () => void {
    const channelId = `splits:${guildKey}:${versionKey}`;

    if (this.splitsChannels.has(channelId)) {
      return () => this.unsubscribeSplits(channelId);
    }

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'splits',
          filter: `guild_key=eq.${guildKey},version_key=eq.${versionKey}`
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new;
            if (newData && newData.data) {
              onUpdate(newData.data as SplitGroup[]);
            }
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time updates for ${channelId}`);
        }
      });

    this.splitsChannels.set(channelId, channel);

    return () => this.unsubscribeSplits(channelId);
  }

  private unsubscribeSplits(channelId: string) {
    const channel = this.splitsChannels.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      this.splitsChannels.delete(channelId);
      console.log(`Unsubscribed from ${channelId}`);
    }
  }

  subscribeCharacters(onUpdate: CharacterChangeCallback): () => void {
    if (this.characterChannel) {
      return () => this.unsubscribeCharacters();
    }

    this.characterChannel = supabase
      .channel('character_data_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'character_data'
        },
        () => {
          onUpdate();
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to character data real-time updates');
        }
      });

    return () => this.unsubscribeCharacters();
  }

  private unsubscribeCharacters() {
    if (this.characterChannel) {
      supabase.removeChannel(this.characterChannel);
      this.characterChannel = null;
      console.log('Unsubscribed from character data changes');
    }
  }

  subscribeRoster(onUpdate: RosterChangeCallback): () => void {
    if (this.rosterChannel) {
      return () => this.unsubscribeRoster();
    }

    this.rosterChannel = supabase
      .channel('roster_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roster_members'
        },
        () => {
          onUpdate();
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to roster members real-time updates');
        }
      });

    return () => this.unsubscribeRoster();
  }

  private unsubscribeRoster() {
    if (this.rosterChannel) {
      supabase.removeChannel(this.rosterChannel);
      this.rosterChannel = null;
      console.log('Unsubscribed from roster members changes');
    }
  }

  unsubscribeAll() {
    this.splitsChannels.forEach((_, channelId) => {
      this.unsubscribeSplits(channelId);
    });
    this.unsubscribeCharacters();
    this.unsubscribeRoster();
  }
}

export const realtimeService = new RealtimeService();
