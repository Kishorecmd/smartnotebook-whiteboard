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
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return match[2];
    }

    return null;
  }
}
