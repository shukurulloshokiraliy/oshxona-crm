"use client";

/* Brauzerning tekin ovoz imkoniyatlari: tanish (STT) va gapirish (TTS). */

type AnyWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: {
    resultIndex: number;
    results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number };
  }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

export function recognizerAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as AnyWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createRecognizer(lang: string): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as AnyWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.continuous = false;
  r.interimResults = true;
  return r;
}

let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  voices = window.speechSynthesis.getVoices();
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function hasVoice(lang: string): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const base = lang.split("-")[0];
  return voices.some((x) => x.lang === lang || x.lang.startsWith(base));
}

/** Gapiradi; tugagach onEnd chaqiriladi (ovoz bo'lmasa ham albatta chaqiriladi). */
export function speak(text: string, lang: string, onEnd?: () => void) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd?.();
  };
  if (typeof window === "undefined" || !window.speechSynthesis) {
    finish();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const base = lang.split("-")[0];
  const v =
    voices.find((x) => x.lang === lang) ||
    voices.find((x) => x.lang.startsWith(base)) ||
    voices.find((x) => x.lang.startsWith("ru")) ||
    voices.find((x) => x.lang.startsWith("tr"));
  if (v) u.voice = v;
  u.rate = 1;
  u.onend = finish;
  u.onerror = finish;
  // Ba'zi brauzerlarda onend kelmay qoladi — himoya taymeri
  setTimeout(finish, Math.min(20000, 2500 + text.length * 90));
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
