export class YouTubeUrlParser {
  /**
   * Extracts the YouTube video ID from various supported URL formats.
   * Returns null if the URL is not a valid YouTube video URL.
   */
  public static extractVideoId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    
    // Regular expression to match various YouTube URL formats
    // Matches:
    // - youtube.com/watch?v=ID
    // - youtu.be/ID
    // - youtube.com/embed/ID
    // - youtube.com/shorts/ID
    // - youtube.com/v/ID
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return match[2];
    }

    return null;
  }

  /**
   * Reads the start offset from a share link's `t` / `start` parameter, so a link
   * copied at a particular moment opens there. Accepts `90`, `90s`, `1m30s`, `1h2m3s`.
   * Returns 0 when absent or unparseable.
   */
  public static extractStartTime(url: string): number {
    if (!url || typeof url !== 'string') return 0;

    const match = url.match(/[?&#](?:t|start)=([^&#]+)/);
    if (!match) return 0;

    const raw = match[1];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);

    const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!parts || (!parts[1] && !parts[2] && !parts[3])) return 0;

    const hours = parseInt(parts[1] || '0', 10);
    const minutes = parseInt(parts[2] || '0', 10);
    const seconds = parseInt(parts[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
