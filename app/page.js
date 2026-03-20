"use client";

import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter/dist/esm";
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import {
  Terminal, Trophy, CloudSun, Sparkles, Send, Plus,
  Trash2, Pencil, Check, X, PanelLeft,
  ChevronDown, Copy, ThumbsUp, ThumbsDown,
  Volume2, VolumeX, Mic, MicOff,
  Pin, PinOff, Search, Settings, Sun, Moon,
  ZapIcon, AlignLeft, Hash, RefreshCw, MoreVertical
} from "lucide-react";

/* =========================
   SABİTLER
========================= */

const UZMANLAR = {
  KODLAMA: { label: "Kodlama", Icon: Terminal },
  SPOR: { label: "Spor", Icon: Trophy },
  HAVA_DURUMU: { label: "Hava", Icon: CloudSun },
  GENEL: { label: "Genel", Icon: Sparkles },
};

const yeniSohbet = () => ({
  id: `s_${Date.now()}`,
  baslik: "Yeni Sohbet",
  mesajlar: [],
});

const now = () =>
  new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

/* =========================
   REDUCER
========================= */

function reducer(s, a) {
  switch (a.type) {
    case "INIT":
      return { ...s, aktifId: s.sohbetler[0].id };
    case "YENI": {
      const n = yeniSohbet();
      return { ...s, sohbetler: [n, ...s.sohbetler], aktifId: n.id };
    }
    case "EKLE":
      return {
        ...s,
        sohbetler: s.sohbetler.map((x) =>
          x.id === s.aktifId
            ? { ...x, mesajlar: [...x.mesajlar, a.m] }
            : x
        ),
      };
    default:
      return s;
  }
}

/* =========================
   SAFE SPEECH
========================= */

function speak(text, onEnd) {
  if (typeof window === "undefined") return;

  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = "tr-TR";
  ut.onend = onEnd;
  ut.onerror = onEnd;

  window.speechSynthesis.speak(ut);
}

/* =========================
   MARKDOWN
========================= */

function MD({ text, dark }) {
  return (
    <ReactMarkdown
      components={{
        code({ inline, className, children }) {
          if (inline) return <code>{children}</code>;

          const lang = /language-(\w+)/.exec(className || "")?.[1];

          return (
            <SyntaxHighlighter
              style={dark ? vscDarkPlus : oneLight}
              language={lang}
            >
              {String(children)}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/* =========================
   MESAJ
========================= */

function Mesaj({ m, dark }) {
  const [speaking, setSpeaking] = useState(false);

  const oku = () => {
    if (typeof window === "undefined") return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);

    speak(
      m.icerik.replace(/```[\s\S]*?```/g, "[kod]"),
      () => setSpeaking(false)
    );
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <b>{m.rol}</b>
      <MD text={m.icerik} dark={dark} />
      <button onClick={oku}>
        {speaking ? <VolumeX /> : <Volume2 />}
      </button>
    </div>
  );
}

/* =========================
   ANA COMPONENT
========================= */

export default function Page() {
  const [st, dispatch] = useReducer(reducer, {
    sohbetler: [yeniSohbet()],
    aktifId: null,
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const srRef = useRef(null);

  useEffect(() => {
    dispatch({ type: "INIT" });
  }, []);

  const aktif = st.sohbetler.find((x) => x.id === st.aktifId);
  const msgs = aktif?.mesajlar || [];

  /* =========================
     API
  ========================= */

  const callApi = async (txt) => {
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ mesaj: txt }),
      });

      const d = await r.json();

      dispatch({
        type: "EKLE",
        m: {
          id: Date.now(),
          rol: "asistan",
          icerik: d.cevap || "cevap yok",
          zaman: now(),
        },
      });
    } catch (e) {
      dispatch({
        type: "EKLE",
        m: {
          id: Date.now(),
          rol: "asistan",
          icerik: "Hata oluştu",
        },
      });
    }

    setLoading(false);
  };

  /* =========================
     SEND
  ========================= */

  const send = async () => {
    if (!input.trim()) return;

    dispatch({
      type: "EKLE",
      m: {
        id: Date.now(),
        rol: "kullanici",
        icerik: input,
        zaman: now(),
      },
    });

    const txt = input;
    setInput("");

    await callApi(txt);
  };

  /* =========================
     MIC FIX
  ========================= */

  const micToggle = () => {
    if (typeof window === "undefined") return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert("Desteklenmiyor");

    const r = new SR();
    r.lang = "tr-TR";

    r.onresult = (e) => {
      setInput(e.results[0][0].transcript);
    };

    srRef.current = r;
    r.start();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Kuantist</h1>

      {msgs.map((m) => (
        <Mesaj key={m.id} m={m} dark />
      ))}

      {loading && <p>Yazıyor...</p>}

      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={micToggle}>
          <Mic />
        </button>

        <button onClick={send}>
          <Send />
        </button>
      </div>
    </div>
  );
}