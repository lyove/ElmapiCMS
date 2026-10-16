/// <reference types="astro/client" />

interface Window {
  docsSetFullWidth?: (fullWidth: boolean) => void;
  docsGetFullWidth?: () => boolean;
}
