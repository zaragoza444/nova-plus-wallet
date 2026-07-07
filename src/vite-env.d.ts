/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTITUTIONAL_GATE?: string;
  readonly VITE_1INCH_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
