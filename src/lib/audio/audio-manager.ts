'use client';

/**
 * Centralized Audio Manager for Notification Sounds
 *
 * Solves the browser autoplay policy restriction by:
 * 1. Unlocking audio on first user interaction (click/touch/keydown)
 * 2. Pre-loading sound files for instant playback
 * 3. Managing a single AudioContext to avoid memory leaks
 * 4. Providing vibration fallback when sound fails
 */

type SoundType = 'notification' | 'new-order' | 'custom-order' | 'order-update';

interface SoundConfig {
  src: string;
  volume: number;
}

const SOUNDS: Record<SoundType, SoundConfig> = {
  notification: { src: '/sounds/notification.mp3', volume: 0.5 },
  'new-order': { src: '/sounds/new-order.mp3', volume: 0.7 },
  'custom-order': { src: '/sounds/custom-order.mp3', volume: 0.6 },
  'order-update': { src: '/sounds/new-order.mp3', volume: 0.65 },
};

class NotificationAudioManager {
  private audioContext: AudioContext | null = null;
  private audioElements: Map<SoundType, HTMLAudioElement> = new Map();
  private unlocked = false;
  private enabled = true;
  private listenerAttached = false;

  /**
   * Initialize the audio manager and attach unlock listeners.
   * Call this once when the app mounts.
   */
  init(): void {
    if (typeof window === 'undefined') return;
    if (this.listenerAttached) return;

    // Check user preference from localStorage
    const savedPref = localStorage.getItem('notification_sound_enabled');
    if (savedPref !== null) {
      this.enabled = savedPref === 'true';
    }

    // Attach unlock listener on first user interaction
    const unlockHandler = () => {
      this.unlock();
      // Remove after first interaction
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
    };

    document.addEventListener('click', unlockHandler, { passive: true });
    document.addEventListener('touchstart', unlockHandler, { passive: true });
    document.addEventListener('keydown', unlockHandler, { passive: true });
    this.listenerAttached = true;

    // Defer audio preloading to avoid AudioContext autoplay warning.
    // Audio elements are preloaded after a short delay or on first user interaction.
  }

  /**
   * Unlock audio playback by creating/resuming AudioContext.
   * Called automatically on first user interaction.
   */
  private unlock(): void {
    if (this.unlocked) return;

    try {
      // Create or resume AudioContext (only on user interaction, avoids autoplay warning)
      if (!this.audioContext) {
        this.audioContext = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Play a silent buffer to fully unlock audio on iOS/Safari
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      // Pre-load audio elements now that user has interacted
      this.preload();

      // "Warm up" each audio element with a silent play
      this.audioElements.forEach((audio) => {
        audio.volume = 0;
        audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            // Restore configured volume
            const soundType = [...this.audioElements.entries()].find(([, el]) => el === audio)?.[0];
            if (soundType) {
              audio.volume = SOUNDS[soundType].volume;
            }
          })
          .catch(() => {
            // Silent catch - not all browsers allow this
          });
      });

      this.unlocked = true;
    } catch {
      // AudioContext not supported
    }
  }

  /**
   * Pre-load all sound files for instant playback.
   */
  private preload(): void {
    for (const [type, config] of Object.entries(SOUNDS) as [SoundType, SoundConfig][]) {
      if (this.audioElements.has(type)) continue;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = config.volume;
      audio.src = config.src;
      this.audioElements.set(type, audio);
    }
  }

  /**
   * Play a notification sound.
   * Handles rapid successive calls by properly resetting the audio element.
   * Falls back to vibration if sound playback fails.
   */
  play(type: SoundType = 'notification'): void {
    if (!this.enabled) return;

    const audio = this.audioElements.get(type);
    if (!audio) return;

    // Properly handle rapid successive plays:
    // 1. Pause any current playback first
    // 2. Reset to beginning
    // 3. Then play
    if (!audio.paused) {
      audio.pause();
    }
    audio.currentTime = 0;

    // Use a microtask to ensure the pause/reset takes effect before playing
    Promise.resolve().then(() => {
      audio.play().catch(() => {
        // Sound failed - use vibration as fallback
        this.vibrate(type);
      });
    });
  }

  /**
   * Vibrate the device as a fallback when sound fails.
   */
  private vibrate(type: SoundType): void {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<SoundType, number[]> = {
      notification: [200, 100, 200],
      'new-order': [300, 100, 300, 100, 300],
      'custom-order': [200, 100, 200, 100, 200],
      'order-update': [200, 100, 300, 100, 200],
    };

    navigator.vibrate(patterns[type] || [200, 100, 200]);
  }

  /**
   * Enable or disable notification sounds.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification_sound_enabled', String(enabled));
    }
  }

  /**
   * Check if notification sounds are enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if audio has been unlocked by user interaction.
   */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    this.audioElements.clear();

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.unlocked = false;
    this.listenerAttached = false;
  }
}

// Singleton instance
let audioManagerInstance: NotificationAudioManager | null = null;

/**
 * Get the singleton AudioManager instance.
 */
export function getAudioManager(): NotificationAudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new NotificationAudioManager();
  }
  return audioManagerInstance;
}

export type { SoundType };
export { NotificationAudioManager };
