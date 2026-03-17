declare module 'jieba-wasm' {
  // Default export is the init function
  export default function init(): Promise<void>;
  // Named exports
  export function cut(text: string, hmm?: boolean): string[];
  export function cut_all(text: string): string[];
  export function cut_for_search(text: string, hmm?: boolean): string[];
}
