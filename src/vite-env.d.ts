/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    accept: () => void;
    dispose: (cb: () => void) => void;
  };
}
