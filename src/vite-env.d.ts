/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Comma-separated Jaihind LMS origins allowed to embed lesson whiteboards. */
  readonly VITE_LMS_ORIGINS?: string;
}
