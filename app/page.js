"use client";

// ============================================================
// KUANTIST V4 — Gemini Tarzı Ultra Modern Arayüz
// npm install framer-motion react-markdown react-syntax-highlighter lucide-react
// ============================================================

import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Terminal, Trophy, CloudSun, Sparkles, Send, Plus,
  Trash2, Pencil, Check, X, PanelLeft,
  ChevronDown, Copy, ThumbsUp, ThumbsDown,
  Volume2, VolumeX, Mic, MicOff, Download,
  Pin, PinOff, Search, Settings, Sun, Moon,
  ZapIcon, AlignLeft, Hash, RefreshCw, Sliders,
  ChevronRight, MoreVertical, Share2, Bookmark,
  MessageSquare, Star, Clock, Filter,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// SABİTLER
// ─────────────────────────────────────────────────────────────

const UZMANLAR = {
  KODLAMA:     { label: "Kodlama",  Icon: Terminal,  grad: "from-emerald-500 to-teal-400",  bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", dot: "bg-emerald-400" },
  SPOR:        { label: "Spor",     Icon: Trophy,    grad: "from-orange-500 to-amber-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25",  text: "text-orange-400",  dot: "bg-orange-400"  },
  HAVA_DURUMU: { label: "Hava",     Icon: CloudSun,  grad: "from-sky-400 to-cyan-300",      bg: "bg-sky-500/10",     border: "border-sky-500/25",     text: "text-sky-400",     dot: "bg-sky-400"     },
  GENEL:       { label: "Genel",    Icon: Sparkles,  grad: "from-violet-500 to-purple-400", bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-400",  dot: "bg-violet-400"  },
};

const PERSONA_LIST = [
  { id: "varsayilan", label: "Varsayılan",       prompt: "" },
  { id: "kisa",       label: "Kısa & Net",        prompt: "Daima kısa, öz ve madde madde cevap ver." },
  { id: "ogretmen",   label: "Öğretmen",          prompt: "Her konuyu adım adım örneklerle açıkla." },
  { id: "uzman",      label: "Yazılım Uzmanı",    prompt: "Teknik, derinlemesine ve kod odaklı cevap ver." },
  { id: "fr",         label: "Fransızca Öğretmen",prompt: "Hem Fransızca hem Türkçe karşılık ver." },
];

const ORNEK_SORULAR = [
  { metin: "React'te custom hook nasıl yazılır?",   kat: "KODLAMA",     Icon: Terminal  },
  { metin: "Şampiyonlar Ligi güncel durumu?",        kat: "SPOR",        Icon: Trophy    },
  { metin: "İstanbul'da bu hafta hava nasıl?",       kat: "HAVA_DURUMU", Icon: CloudSun  },
  { metin: "Kuantum dolanıklığı nedir?",             kat: "GENEL",       Icon: Sparkles  },
  { metin: "Python ile web scraper yaz",             kat: "KODLAMA",     Icon: Terminal  },
  { metin: "En iyi futbol takımları sıralaması",     kat: "SPOR",        Icon: Trophy    },
];

const yeniSohbet = () => ({
  id: `s_${Date.now()}`,
  baslik: "Yeni Sohbet",
  mesajlar: [],
  olusturma: Date.now(),
  kat: "GENEL",
  pinned: false,
});

const now = () =>
  new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

function kelime(t) { return t.trim().split(/\s+/).filter(Boolean).length; }

// ─────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────

const init = {
  sohbetler: [yeniSohbet()],
  aktifId: null,
  tema: "dark",
  sidebar: true,
  ayarlar: false,
  arama: "",
  yaziBoyut: "normal",
  enterGonder: true,
  persona: "varsayilan",
};

function reducer(s, a) {
  switch (a.type) {
    case "INIT":    return { ...s, aktifId: s.sohbetler[0].id };
    case "YENI":    { const n = yeniSohbet(); return { ...s, sohbetler: [n, ...s.sohbetler], aktifId: n.id }; }
    case "SEC":     return { ...s, aktifId: a.id };
    case "SIL":     {
      const kalanlar = s.sohbetler.filter(x => x.id !== a.id);
      if (!kalanlar.length) { const n = yeniSohbet(); return { ...s, sohbetler: [n], aktifId: n.id }; }
      return { ...s, sohbetler: kalanlar, aktifId: s.aktifId === a.id ? kalanlar[0].id : s.aktifId };
    }
    case "ADLANDIR": return { ...s, sohbetler: s.sohbetler.map(x => x.id === a.id ? { ...x, baslik: a.v } : x) };
    case "PIN":      return { ...s, sohbetler: s.sohbetler.map(x => x.id === a.id ? { ...x, pinned: !x.pinned } : x) };
    case "EKLE":     return {
      ...s,
      sohbetler: s.sohbetler.map(x => {
        if (x.id !== s.aktifId) return x;
        const ms = [...x.mesajlar, a.m];
        const baslik = x.baslik === "Yeni Sohbet" && a.m.rol === "kullanici"
          ? a.m.icerik.slice(0, 45) + (a.m.icerik.length > 45 ? "…" : "") : x.baslik;
        return { ...x, mesajlar: ms, baslik, kat: a.m.kat || x.kat };
      }),
    };
    case "GUNCELLE": return {
      ...s,
      sohbetler: s.sohbetler.map(x => x.id !== s.aktifId ? x : {
        ...x, mesajlar: x.mesajlar.map(m => m.id === a.id ? { ...m, ...a.v } : m)
      }),
    };
    case "KIRP": return {
      ...s,
      sohbetler: s.sohbetler.map(x => {
        if (x.id !== s.aktifId) return x;
        const idx = x.mesajlar.findIndex(m => m.id === a.id);
        return { ...x, mesajlar: idx >= 0 ? x.mesajlar.slice(0, idx) : x.mesajlar };
      }),
    };
    case "TEMA":    return { ...s, tema: s.tema === "dark" ? "light" : "dark" };
    case "SIDEBAR": return { ...s, sidebar: !s.sidebar };
    case "AYARLAR": return { ...s, ayarlar: !s.ayarlar };
    case "ARAMA":   return { ...s, arama: a.v };
    case "BOYUT":   return { ...s, yaziBoyut: a.v };
    case "ENTER":   return { ...s, enterGonder: !s.enterGonder };
    case "PERSONA": return { ...s, persona: a.v };
    default: return s;
  }
}

// ─────────────────────────────────────────────────────────────
// KOD BLOĞU
// ─────────────────────────────────────────────────────────────

function KodBlogu({ children, className, dark }) {
  const [ok, setOk] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1] || "text";
  const kod = String(children).replace(/\n$/, "");
  const kopyala = async () => { await navigator.clipboard.writeText(kod); setOk(true); setTimeout(() => setOk(false), 2000); };
  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-white/8 shadow-xl">
      <div className={`flex items-center justify-between px-4 py-2.5 ${dark ? "bg-[#1e1e2e]" : "bg-slate-100"} border-b border-white/8`}>
        <div className="flex gap-1.5">{["bg-red-500/60","bg-yellow-500/60","bg-green-500/60"].map(c => <span key={c} className={`w-3 h-3 rounded-full ${c}`}/>)}</div>
        <span className={`text-xs font-mono uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}>{lang}</span>
        <button onClick={kopyala} className={`text-xs px-2.5 py-0.5 rounded-lg transition-all ${dark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-black/8"}`}>
          {ok ? "✓ Kopyalandı" : "Kopyala"}
        </button>
      </div>
      <SyntaxHighlighter style={dark ? vscDarkPlus : oneLight} language={lang} PreTag="div"
        customStyle={{ margin:0, padding:"1.25rem", background: dark ? "rgba(13,13,20,0.98)" : "rgba(248,250,252,0.98)", fontSize:"0.8rem", lineHeight:"1.75" }}
        codeTagProps={{ style:{ fontFamily:"'JetBrains Mono','Fira Code',monospace" } }}>
        {kod}
      </SyntaxHighlighter>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MARKDOWN
// ─────────────────────────────────────────────────────────────

function MD({ text, dark, size }) {
  const sz = { kucuk:"text-xs", normal:"text-sm", buyuk:"text-base" }[size] || "text-sm";
  const c  = dark ? "text-[#e2e2e8]" : "text-slate-700";
  const c2 = dark ? "text-slate-400" : "text-slate-500";
  const h  = dark ? "text-white" : "text-slate-900";
  const cb = dark ? "bg-white/8 text-emerald-300" : "bg-black/6 text-emerald-700";
  return (
    <ReactMarkdown components={{
      code({ inline, className, children }) {
        if (inline) return <code className={`px-1.5 py-0.5 rounded-lg font-mono text-[0.8em] ${cb}`}>{children}</code>;
        return <KodBlogu className={className} dark={dark}>{children}</KodBlogu>;
      },
      p:({children})=><p className={`mb-3 last:mb-0 ${c} ${sz} leading-[1.8]`}>{children}</p>,
      ul:({children})=><ul className={`mb-3 pl-1 space-y-1.5 ${sz} list-none`}>{children}</ul>,
      ol:({children})=><ol className={`mb-3 pl-5 space-y-1.5 ${c} ${sz} list-decimal`}>{children}</ol>,
      li:({children})=><li className={`flex items-start gap-2 ${sz} ${c}`}><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"/><span>{children}</span></li>,
      h1:({children})=><h1 className={`text-xl font-bold ${h} mb-3 mt-5`}>{children}</h1>,
      h2:({children})=><h2 className={`text-lg font-semibold ${h} mb-2 mt-4`}>{children}</h2>,
      h3:({children})=><h3 className={`text-base font-semibold ${h} mb-2 mt-3`}>{children}</h3>,
      strong:({children})=><strong className={`font-semibold ${h}`}>{children}</strong>,
      em:({children})=><em className={`italic ${c2}`}>{children}</em>,
      blockquote:({children})=><blockquote className={`border-l-[3px] border-violet-500/50 pl-4 my-3 ${c2} italic ${sz}`}>{children}</blockquote>,
      a:({href,children})=><a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">{children}</a>,
      hr:()=><hr className={`my-5 ${dark?"border-white/8":"border-black/8"}`}/>,
      table:({children})=><div className="overflow-x-auto my-4 rounded-xl border border-white/8"><table className={`w-full ${sz} border-collapse`}>{children}</table></div>,
      th:({children})=><th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${dark?"bg-white/5 text-slate-300 border-b border-white/8":"bg-black/4 text-slate-600 border-b border-black/8"}`}>{children}</th>,
      td:({children})=><td className={`px-4 py-2.5 ${dark?"text-slate-300 border-b border-white/5":"text-slate-600 border-b border-black/5"}`}>{children}</td>,
    }}>{text}</ReactMarkdown>
  );
}

// ─────────────────────────────────────────────────────────────
// YAZILIYOR
// ─────────────────────────────────────────────────────────────

function Typing({ kat, dark }) {
  const u = UZMANLAR[kat] || UZMANLAR.GENEL;
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.25}}
      className="flex gap-4 mb-6 items-start">
      <div className={`flex-shrink-0 w-9 h-9 rounded-2xl ${u.bg} border ${u.border} flex items-center justify-center mt-0.5`}>
        <u.Icon size={15} className={u.text}/>
      </div>
      <div className={`flex items-center gap-2 px-5 py-4 rounded-2xl rounded-tl-sm ${dark?"bg-[#1a1a2e] border-white/6":"bg-white border-black/8"} border shadow-lg`}>
        <span className={`text-xs font-medium mr-1 ${dark?"text-slate-500":"text-slate-400"}`}>Yanıtlıyor</span>
        {[0,150,300].map(d=><span key={d} className={`w-2 h-2 rounded-full ${u.dot} animate-bounce`} style={{animationDelay:`${d}ms`}}/>)}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MESAJ
// ─────────────────────────────────────────────────────────────

function Mesaj({ m, dark, size, onRegen, onFeedback, onEdit }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.icerik);
  const [menuOpen, setMenuOpen] = useState(false);
  const u = UZMANLAR[m.kat] || UZMANLAR.GENEL;
  const isUser = m.rol === "kullanici";

  const kopyala = async () => { await navigator.clipboard.writeText(m.icerik); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const oku = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const ut = new SpeechSynthesisUtterance(m.icerik.replace(/[#*`_~]/g,"").replace(/```[\s\S]*?```/g,"[kod]"));
    ut.lang="tr-TR"; ut.rate=0.92;
    ut.onend=()=>setSpeaking(false); ut.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(ut); setSpeaking(true);
  };

  const kaydet = () => {
    if (editText.trim() && editText !== m.icerik) onEdit(m.id, editText.trim());
    setEditing(false);
  };

  const btnCls = `p-2 rounded-xl transition-all ${dark?"text-slate-500 hover:text-slate-200 hover:bg-white/8":"text-slate-400 hover:text-slate-700 hover:bg-black/6"}`;
  const activeCls = dark ? "text-violet-400 bg-violet-500/10" : "text-violet-600 bg-violet-500/10";

  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
      className={`flex gap-4 mb-6 items-start group ${isUser?"flex-row-reverse":""}`}>

      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md mt-0.5">
          S
        </div>
      ) : (
        <div className={`flex-shrink-0 w-9 h-9 rounded-2xl ${u.bg} border ${u.border} flex items-center justify-center mt-0.5 shadow-sm`}>
          <u.Icon size={15} className={u.text}/>
        </div>
      )}

      <div className={`flex-1 min-w-0 flex flex-col ${isUser?"items-end":""}`}>
        {/* Rozet (bot için) */}
        {!isUser && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider border mb-2 ${u.bg} ${u.border} ${u.text}`}>
            <u.Icon size={10}/><span>{u.label} Uzmanı</span>
          </div>
        )}

        {/* Balon */}
        {isUser ? (
          editing ? (
            <div className="w-full max-w-[85%]">
              <textarea autoFocus value={editText} onChange={e=>setEditText(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();kaydet();}if(e.key==="Escape")setEditing(false);}}
                className={`w-full px-4 py-3 rounded-2xl text-sm leading-relaxed resize-none outline-none border-2 border-blue-500 ${dark?"bg-[#1e2035] text-white":"bg-white text-slate-900"}`}
                rows={3}/>
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={()=>setEditing(false)} className={`p-1.5 rounded-lg ${dark?"text-slate-400 hover:bg-white/10":"text-slate-400 hover:bg-black/8"} transition-all`}><X size={14}/></button>
                <button onClick={kaydet} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"><Check size={14}/></button>
              </div>
            </div>
          ) : (
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-600 to-violet-600 text-white text-sm leading-relaxed shadow-lg`}>
              {m.icerik}
            </div>
          )
        ) : (
          <div className={`w-full max-w-[92%] px-5 py-4 rounded-2xl rounded-tl-sm border shadow-sm ${dark?"bg-[#1a1a2e] border-white/6 text-slate-200":"bg-white border-black/8"}`}>
            <MD text={m.icerik} dark={dark} size={size}/>
            <div className={`flex items-center gap-3 mt-3 pt-3 border-t ${dark?"border-white/5":"border-black/5"}`}>
              <span className={`text-[11px] ${dark?"text-slate-600":"text-slate-400"} flex items-center gap-1`}><AlignLeft size={10}/>{kelime(m.icerik)} kelime</span>
              <span className={`text-[11px] ${dark?"text-slate-600":"text-slate-400"} flex items-center gap-1`}><Hash size={10}/>{m.icerik.length} karakter</span>
            </div>
          </div>
        )}

        {/* Zaman */}
        <span className={`text-[11px] mt-1.5 px-1 ${dark?"text-slate-700":"text-slate-400"}`}>{m.zaman}</span>

        {/* Aksiyon bar (Gemini stili — her zaman görünür, hover'da belirginleşir) */}
        <div className={`flex items-center gap-0.5 mt-2 transition-opacity ${isUser?"flex-row-reverse":""} opacity-0 group-hover:opacity-100`}>
          <button onClick={kopyala} title="Kopyala" className={btnCls}>{copied?<Check size={15} className="text-emerald-400"/>:<Copy size={15}/>}</button>
          {!isUser && <><button onClick={oku} title={speaking?"Durdur":"Sesli Oku"} className={`${btnCls} ${speaking?activeCls:""}`}>{speaking?<VolumeX size={15}/>:<Volume2 size={15}/>}</button>
          <button onClick={()=>onFeedback(m.id,"up")} title="Beğen" className={`${btnCls} ${m.feedback==="up"?"text-emerald-400 bg-emerald-500/10":""}`}><ThumbsUp size={15}/></button>
          <button onClick={()=>onFeedback(m.id,"down")} title="Beğenme" className={`${btnCls} ${m.feedback==="down"?"text-red-400 bg-red-500/10":""}`}><ThumbsDown size={15}/></button>
          <button onClick={()=>onRegen(m.id)} title="Yeniden Oluştur" className={btnCls}><RefreshCw size={15}/></button></>}
          {isUser && <button onClick={()=>{setEditing(true);setEditText(m.icerik);}} title="Düzenle" className={btnCls}><Pencil size={15}/></button>}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOŞGELDIN
// ─────────────────────────────────────────────────────────────

function Welcome({ dark, onSec }) {
  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.45,ease:[0.16,1,0.3,1]}}
      className="flex flex-col items-center pt-16 pb-8 px-4">
      {/* Logo */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/25 to-blue-500/25 blur-3xl scale-[2]"/>
        <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center border ${dark?"bg-[#1a1a2e] border-white/10":"bg-white border-black/10"} shadow-2xl`}>
          <ZapIcon size={38} className="text-violet-400"/>
        </div>
      </div>

      <h1 className="text-[2.5rem] font-black tracking-tight leading-none mb-3">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300">Kuantist</span>
      </h1>
      <p className={`text-base mb-10 text-center max-w-md leading-relaxed ${dark?"text-slate-400":"text-slate-500"}`}>
        Soruyu yaz, doğru uzman otomatik devreye girer.
      </p>

      {/* Uzman rozet sırası */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        {Object.entries(UZMANLAR).map(([k,v])=>(
          <div key={k} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${v.bg} ${v.border} ${v.text}`}>
            <v.Icon size={12}/>{v.label} Uzmanı
          </div>
        ))}
      </div>

      {/* Öneri kartları — Gemini grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
        {ORNEK_SORULAR.map((s,i)=>{
          const u = UZMANLAR[s.kat];
          return (
            <motion.button key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.05+i*0.06}}
              onClick={()=>onSec(s.metin)}
              className={`group text-left p-4 rounded-2xl border transition-all duration-200 ${dark?"bg-[#1a1a2e] border-white/6 hover:border-white/14 hover:bg-[#1e1e35]":"bg-white border-black/8 hover:border-black/14 hover:bg-slate-50"} shadow-sm hover:shadow-md`}>
              <div className={`w-8 h-8 rounded-xl ${u.bg} border ${u.border} flex items-center justify-center mb-3`}>
                <u.Icon size={14} className={u.text}/>
              </div>
              <p className={`text-sm leading-snug font-medium ${dark?"text-slate-200":"text-slate-700"}`}>{s.metin}</p>
              <p className={`text-xs mt-1.5 ${u.text}`}>{u.label} Uzmanı</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────

function Sidebar({ s, dispatch, sohbetler, aktifId }) {
  const [adEdit, setAdEdit] = useState(null);
  const [adVal, setAdVal]   = useState("");
  const [ctxMenu, setCtxMenu] = useState(null); // { id, x, y }
  const dark = s.tema === "dark";

  const bg      = dark ? "bg-[#0f0f17]" : "bg-slate-50";
  const border  = dark ? "border-white/8" : "border-black/8";
  const txt     = dark ? "text-slate-300" : "text-slate-700";
  const txt2    = dark ? "text-slate-500" : "text-slate-400";
  const hov     = dark ? "hover:bg-white/5" : "hover:bg-black/4";
  const aktifBg = dark ? "bg-white/8" : "bg-violet-50";

  const filtreli = sohbetler.filter(x => !s.arama || x.baslik.toLowerCase().includes(s.arama.toLowerCase()));
  const pinli  = filtreli.filter(x => x.pinned);
  const normal = filtreli.filter(x => !x.pinned);

  const indir = (sohbet, fmt) => {
    let icerik = fmt === "md"
      ? sohbet.mesajlar.map(m=>`**${m.rol==="kullanici"?"Kullanıcı":"Kuantist"}** — _${m.zaman}_\n\n${m.icerik}\n\n---\n\n`).join("")
      : sohbet.mesajlar.map(m=>`[${m.rol==="kullanici"?"Kullanıcı":"Kuantist"}] ${m.zaman}\n${m.icerik}\n\n`).join("");
    const blob = new Blob([icerik],{type:"text/plain;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`${sohbet.baslik.replace(/[^\w\s]/gi,"_")}.${fmt}`; a.click();
  };

  const Item = ({ x }) => {
    const uz = UZMANLAR[x.kat] || UZMANLAR.GENEL;
    return (
      <div
        onClick={()=>{ dispatch({type:"SEC",id:x.id}); setCtxMenu(null); }}
        className={`relative group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${x.id===aktifId ? aktifBg : hov}`}
      >
        <div className={`flex-shrink-0 w-1 h-5 rounded-full bg-gradient-to-b ${uz.grad} opacity-70`}/>
        {adEdit === x.id ? (
          <input autoFocus value={adVal} onChange={e=>setAdVal(e.target.value)}
            onBlur={()=>{ if(adVal.trim()) dispatch({type:"ADLANDIR",id:x.id,v:adVal.trim()}); setAdEdit(null); }}
            onKeyDown={e=>{ if(e.key==="Enter"){if(adVal.trim())dispatch({type:"ADLANDIR",id:x.id,v:adVal.trim()});setAdEdit(null);}if(e.key==="Escape")setAdEdit(null); }}
            onClick={e=>e.stopPropagation()}
            className={`flex-1 text-sm bg-transparent outline-none border-b ${dark?"border-violet-400 text-white":"border-violet-500 text-slate-900"}`}/>
        ) : (
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${x.id===aktifId?`font-semibold ${txt}`:`font-normal ${txt}`}`}>
              {x.pinned && <span className="text-amber-400 mr-1">📌</span>}{x.baslik}
            </p>
            <p className={`text-[11px] ${txt2} mt-0.5`}>
              {x.mesajlar.length} mesaj · {new Date(x.olusturma).toLocaleDateString("tr-TR",{day:"numeric",month:"short"})}
            </p>
          </div>
        )}

        {/* 3 nokta */}
        <button
          onClick={e=>{ e.stopPropagation(); setCtxMenu(ctxMenu===x.id?null:x.id); }}
          className={`flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${dark?"text-slate-500 hover:text-slate-200 hover:bg-white/10":"text-slate-400 hover:text-slate-700 hover:bg-black/8"}`}>
          <MoreVertical size={14}/>
        </button>

        {/* Açılır menü */}
        <AnimatePresence>
          {ctxMenu === x.id && (
            <motion.div initial={{opacity:0,scale:0.92,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92}} transition={{duration:0.13}}
              className={`absolute right-0 top-10 z-50 w-48 rounded-2xl border shadow-2xl overflow-hidden ${dark?"bg-[#1e1e2e] border-white/10":"bg-white border-black/10"}`}
              onClick={e=>e.stopPropagation()}>
              {[
                { icon:<Pencil size={13}/>, label:"Yeniden Adlandır", fn:()=>{ setAdVal(x.baslik); setAdEdit(x.id); setCtxMenu(null); } },
                { icon:x.pinned?<PinOff size={13}/>:<Pin size={13}/>, label:x.pinned?"Sabitlemeyi Kaldır":"Sabitle", fn:()=>{ dispatch({type:"PIN",id:x.id}); setCtxMenu(null); } },
              ].map(({icon,label,fn})=>(
                <button key={label} onClick={fn} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors ${dark?"text-slate-300 hover:bg-white/8 hover:text-white":"text-slate-600 hover:bg-black/5 hover:text-slate-900"}`}>
                  {icon}<span>{label}</span>
                </button>
              ))}
              <div className={`border-t ${dark?"border-white/8":"border-black/8"}`}>
                <p className={`px-4 py-2 text-[10px] uppercase tracking-wider ${txt2}`}>Dışa Aktar</p>
                {["txt","md"].map(fmt=>(
                  <button key={fmt} onClick={()=>{ indir(x,fmt); setCtxMenu(null); }} className={`w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors ${dark?"text-slate-400 hover:bg-white/8 hover:text-white":"text-slate-500 hover:bg-black/5"}`}>
                    <Download size={11}/>  .{fmt.toUpperCase()} olarak indir
                  </button>
                ))}
              </div>
              <div className={`border-t ${dark?"border-white/8":"border-black/8"}`}>
                <button onClick={()=>{ dispatch({type:"SIL",id:x.id}); setCtxMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={13}/>Sohbeti Sil
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: s.sidebar ? 264 : 0, opacity: s.sidebar ? 1 : 0 }}
      transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
      className={`flex-shrink-0 h-screen overflow-hidden border-r ${bg} ${border} flex flex-col relative z-10`}
      style={{ minWidth: 0 }}>
      <div className="flex flex-col h-full w-[264px]">

        {/* Üst: Logo + Yeni Sohbet */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-md">
                <ZapIcon size={16} className="text-white"/>
              </div>
              <span className={`text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400`}>Kuantist</span>
            </div>
          </div>
          <button onClick={()=>dispatch({type:"YENI"})}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-900/25">
            <Plus size={15}/><span>Yeni Sohbet</span>
          </button>
        </div>

        {/* Arama */}
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dark?"bg-white/5 border-white/8":"bg-black/4 border-black/8"}`}>
            <Search size={13} className={txt2}/>
            <input value={s.arama} onChange={e=>dispatch({type:"ARAMA",v:e.target.value})}
              placeholder="Sohbetlerde ara..."
              className={`flex-1 text-xs bg-transparent outline-none ${txt} placeholder:text-slate-600`}/>
            {s.arama && <button onClick={()=>dispatch({type:"ARAMA",v:""})} className={`${txt2} hover:text-red-400 transition-colors`}><X size={11}/></button>}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {pinli.length > 0 && <>
            <p className={`text-[10px] uppercase tracking-widest px-3 py-2 ${txt2}`}>📌 Sabitlenmiş</p>
            {pinli.map(x=><Item key={x.id} x={x}/>)}
            <div className={`border-t ${dark?"border-white/6":"border-black/6"} my-2`}/>
          </>}
          {normal.length > 0 && <>
            {pinli.length > 0 && <p className={`text-[10px] uppercase tracking-widest px-3 py-2 ${txt2}`}>Sohbetler</p>}
            {normal.map(x=><Item key={x.id} x={x}/>)}
          </>}
          {filtreli.length === 0 && <p className={`text-xs text-center py-10 ${txt2}`}>Sohbet bulunamadı</p>}
        </div>

        {/* Alt: Ayarlar */}
        <div className={`p-3 border-t ${dark?"border-white/6":"border-black/6"}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">K</div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${txt}`}>Kuantist V4</p>
              <p className={`text-[10px] ${txt2}`}>Mixture of Experts</p>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

// ─────────────────────────────────────────────────────────────
// AYARLAR
// ─────────────────────────────────────────────────────────────

function Ayarlar({ s, dispatch }) {
  const dark = s.tema === "dark";
  const bg     = dark ? "bg-[#0f0f17]/95 border-white/8" : "bg-white/95 border-black/8";
  const txt    = dark ? "text-white" : "text-slate-900";
  const txt2   = dark ? "text-slate-400" : "text-slate-500";
  const card   = dark ? "bg-white/4 border-white/8 hover:bg-white/7" : "bg-black/3 border-black/7 hover:bg-black/5";
  const aktif  = "bg-violet-600 border-violet-500 text-white";

  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} transition={{duration:0.22}}
      className={`fixed top-0 right-0 h-screen w-80 border-l backdrop-blur-2xl shadow-2xl z-40 flex flex-col ${bg}`}>
      <div className={`flex items-center justify-between px-5 py-4 border-b ${dark?"border-white/8":"border-black/8"}`}>
        <div className="flex items-center gap-2.5"><Settings size={16} className="text-violet-400"/><span className={`text-sm font-bold ${txt}`}>Ayarlar</span></div>
        <button onClick={()=>dispatch({type:"AYARLAR"})} className={`p-1.5 rounded-xl transition-all ${dark?"text-slate-400 hover:text-white hover:bg-white/10":"text-slate-400 hover:text-slate-900 hover:bg-black/8"}`}><X size={16}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-7">

        {/* Tema */}
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${txt2}`}>Görünüm</p>
          <button onClick={()=>dispatch({type:"TEMA"})}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${card}`}>
            <div className="flex items-center gap-2.5">
              {dark?<Moon size={15} className="text-violet-400"/>:<Sun size={15} className="text-amber-400"/>}
              <span className={`text-sm ${txt}`}>{dark?"Karanlık Tema":"Aydınlık Tema"}</span>
            </div>
            <div className={`w-10 h-5 rounded-full ${dark?"bg-violet-600":"bg-amber-400"} relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${dark?"left-5":"left-0.5"}`}/>
            </div>
          </button>
        </div>

        {/* Yazı boyutu */}
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${txt2}`}>Yazı Boyutu</p>
          <div className="flex gap-2">
            {[{id:"kucuk",l:"Küçük",sz:"text-xs"},{id:"normal",l:"Normal",sz:"text-sm"},{id:"buyuk",l:"Büyük",sz:"text-base"}].map(({id,l,sz})=>(
              <button key={id} onClick={()=>dispatch({type:"BOYUT",v:id})}
                className={`flex-1 py-2.5 rounded-2xl border text-center transition-all ${sz} ${s.yaziBoyut===id ? aktif : `${card} ${txt}`}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Enter davranışı */}
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${txt2}`}>Enter Tuşu</p>
          <button onClick={()=>dispatch({type:"ENTER"})}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${card}`}>
            <div>
              <p className={`text-sm font-medium ${txt}`}>{s.enterGonder?"Enter → Gönder":"Enter → Yeni Satır"}</p>
              <p className={`text-xs ${txt2} mt-0.5`}>{s.enterGonder?"Shift+Enter ile yeni satır":"Ctrl+Enter ile gönder"}</p>
            </div>
            <div className={`w-10 h-5 rounded-full ${s.enterGonder?"bg-violet-600":"bg-slate-600"} relative flex-shrink-0`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${s.enterGonder?"left-5":"left-0.5"}`}/>
            </div>
          </button>
        </div>

        {/* Persona */}
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${txt2}`}>Yapay Zeka Rolü</p>
          <div className="space-y-2">
            {PERSONA_LIST.map(p=>(
              <button key={p.id} onClick={()=>dispatch({type:"PERSONA",v:p.id})}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all ${s.persona===p.id?"bg-violet-600/15 border-violet-500/40":`${card}`}`}>
                <div>
                  <p className={`text-sm font-medium ${s.persona===p.id?"text-violet-300":txt}`}>{p.label}</p>
                  {p.prompt && <p className={`text-[11px] ${txt2} mt-0.5 line-clamp-1`}>{p.prompt}</p>}
                </div>
                {s.persona===p.id && <Check size={14} className="text-violet-400 flex-shrink-0"/>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ANA BİLEŞEN
// ─────────────────────────────────────────────────────────────

export default function Page() {
  const [st, dispatch] = useReducer(reducer, init);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [aktifKat, setAktifKat] = useState("GENEL");
  const [showDown, setShowDown] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const scrollRef  = useRef(null);
  const srRef      = useRef(null);

  useEffect(() => { dispatch({ type: "INIT" }); }, []);

  const aktif = st.sohbetler.find(x => x.id === st.aktifId) || st.sohbetler[0];
  const msgs  = aktif?.mesajlar || [];
  const dark  = st.tema === "dark";

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (bottom || loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowDown(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
  }, []);

  // ── API ────────────────────────────────────────────────────
  const callApi = useCallback(async (metin, gecmis) => {
    const persona = PERSONA_LIST.find(p => p.id === st.persona);
    const soru = persona?.prompt ? `[ROL: ${persona.prompt}]\n\n${metin}` : metin;
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaj: soru, gecmis }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.hata || "Hata");
      setAktifKat(d.kategori || "GENEL");
      dispatch({ type: "EKLE", m: { id: `m_${Date.now()}`, rol: "asistan", icerik: d.cevap, kat: d.kategori || "GENEL", zaman: now(), feedback: null } });
    } catch (e) {
      dispatch({ type: "EKLE", m: { id: `m_${Date.now()}`, rol: "asistan", icerik: `**Hata:** ${e.message}`, kat: "GENEL", zaman: now(), feedback: null } });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [st.persona]);

  // ── GÖNDER ─────────────────────────────────────────────────
  const send = useCallback(async (override) => {
    const txt = (override || input).trim();
    if (!txt || loading) return;
    dispatch({ type: "EKLE", m: { id: `m_${Date.now()}`, rol: "kullanici", icerik: txt, zaman: now() } });
    setInput(""); if (inputRef.current) inputRef.current.style.height = "auto";
    await callApi(txt, msgs.slice(-8).map(m => ({ rol: m.rol, icerik: m.icerik })));
  }, [input, loading, msgs, callApi]);

  // ── REGENERATE ─────────────────────────────────────────────
  const regen = useCallback(async (id) => {
    const idx = msgs.findIndex(m => m.id === id);
    if (idx < 1) return;
    const prev = [...msgs].slice(0, idx).reverse().find(m => m.rol === "kullanici");
    if (!prev) return;
    dispatch({ type: "KIRP", id });
    await callApi(prev.icerik, msgs.slice(0, Math.max(0, idx - 1)).map(m => ({ rol: m.rol, icerik: m.icerik })));
  }, [msgs, callApi]);

  // ── FEEDBACK ───────────────────────────────────────────────
  const feedback = useCallback((id, v) => { dispatch({ type: "GUNCELLE", id, v: { feedback: v } }); }, []);

  // ── EDIT ───────────────────────────────────────────────────
  const editMsg = useCallback(async (id, yeni) => {
    const idx = msgs.findIndex(m => m.id === id);
    if (idx < 0) return;
    dispatch({ type: "GUNCELLE", id, v: { icerik: yeni } });
    if (msgs[idx + 1]) dispatch({ type: "KIRP", id: msgs[idx + 1].id });
    await callApi(yeni, msgs.slice(0, idx).map(m => ({ rol: m.rol, icerik: m.icerik })));
  }, [msgs, callApi]);

  // ── MİKROFON ───────────────────────────────────────────────
  const micToggle = useCallback(() => {
    if (dinliyor) { srRef.current?.stop(); setDinliyor(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tarayıcınız sesli girişi desteklemiyor."); return; }
    const r = new SR(); r.lang = "tr-TR"; r.interimResults = false;
    r.onresult = e => { setInput(p => p + (p ? " " : "") + e.results[0][0].transcript); setDinliyor(false); };
    r.onerror = r.onend = () => setDinliyor(false);
    srRef.current = r; r.start(); setDinliyor(true);
  }, [dinliyor]);

  // ── KLAVYE ─────────────────────────────────────────────────
  const onKey = useCallback((e) => {
    if (st.enterGonder ? (e.key === "Enter" && !e.shiftKey) : (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); send();
    }
  }, [st.enterGonder, send]);

  const autoH = (e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; };

  // ── TEMA STİLLERİ ──────────────────────────────────────────
  const pageBg   = dark ? "bg-[#0d0d14]" : "bg-[#f0f0f5]";
  const headerBg = dark ? "bg-[#0d0d14]/80 border-white/6" : "bg-[#f0f0f5]/80 border-black/6";
  const inputBox = dark ? "bg-[#1a1a2e] border-white/10 focus-within:border-violet-500/60" : "bg-white border-black/12 focus-within:border-violet-400/60";
  const inTxt    = dark ? "text-slate-200 placeholder-slate-600" : "text-slate-800 placeholder-slate-400";
  const gradBot  = dark ? "from-[#0d0d14] via-[#0d0d14]/90" : "from-[#f0f0f5] via-[#f0f0f5]/90";
  const aktifU   = UZMANLAR[aktifKat] || UZMANLAR.GENEL;

  return (
    <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>

      {/* Arka plan efekti */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full bg-violet-900/12 blur-[160px]"/>
        <div className="absolute -bottom-1/3 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-blue-900/12 blur-[140px]"/>
        <div className="absolute inset-0 opacity-[0.018]" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",backgroundSize:"64px 64px"}}/>
      </div>

      {/* ── SIDEBAR ── */}
      <Sidebar s={st} dispatch={dispatch} sohbetler={st.sohbetler} aktifId={st.aktifId}/>

      {/* ── İÇERİK ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">

        {/* ── HEADER ── */}
        <header className={`sticky top-0 z-20 border-b backdrop-blur-2xl flex-shrink-0 ${headerBg}`}>
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Sidebar toggle */}
              <button onClick={()=>dispatch({type:"SIDEBAR"})}
                className={`p-2 rounded-xl transition-all ${dark?"text-slate-400 hover:text-white hover:bg-white/8":"text-slate-500 hover:text-slate-900 hover:bg-black/8"}`}>
                <PanelLeft size={18}/>
              </button>

              {/* Başlık */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-md">
                  <ZapIcon size={14} className="text-white"/>
                </div>
                <div>
                  <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400 block leading-none">Kuantist</span>
                  <span className={`text-[10px] leading-none ${dark?"text-slate-600":"text-slate-400"} block`}>
                    {aktif?.baslik !== "Yeni Sohbet" ? aktif?.baslik?.slice(0,32)+"…" : "Mixture of Experts"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Aktif uzman */}
              {msgs.length > 0 && (
                <motion.div key={aktifKat} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${aktifU.bg} ${aktifU.border} ${aktifU.text}`}>
                  <aktifU.Icon size={11}/><span>{aktifU.label} Uzmanı</span>
                </motion.div>
              )}

              {/* Tema */}
              <button onClick={()=>dispatch({type:"TEMA"})}
                className={`p-2 rounded-xl transition-all ${dark?"text-slate-400 hover:text-amber-400 hover:bg-amber-500/10":"text-slate-400 hover:text-violet-500 hover:bg-violet-500/10"}`}>
                {dark?<Sun size={17}/>:<Moon size={17}/>}
              </button>

              {/* Ayarlar */}
              <button onClick={()=>dispatch({type:"AYARLAR"})}
                className={`p-2 rounded-xl transition-all ${st.ayarlar?(dark?"bg-white/10 text-white":"bg-black/8 text-slate-900"):(dark?"text-slate-400 hover:text-white hover:bg-white/8":"text-slate-400 hover:text-slate-900 hover:bg-black/8")}`}>
                <Settings size={17}/>
              </button>

              {/* Yeni sohbet */}
              <button onClick={()=>dispatch({type:"YENI"})}
                className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-900/25">
                <Plus size={17}/>
              </button>
            </div>
          </div>
        </header>

        {/* ── MESAJLAR ── */}
        <main ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AnimatePresence>
              {msgs.length === 0 && !loading && (
                <Welcome dark={dark} onSec={t=>{ setInput(t); setTimeout(()=>inputRef.current?.focus(),50); }}/>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {msgs.map(m=>(
                <Mesaj key={m.id} m={m} dark={dark} size={st.yaziBoyut}
                  onRegen={regen} onFeedback={feedback} onEdit={editMsg}/>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {loading && <Typing kat={aktifKat} dark={dark}/>}
            </AnimatePresence>

            <div ref={bottomRef}/>
          </div>
        </main>

        {/* Aşağı kaydır */}
        <AnimatePresence>
          {showDown && (
            <motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
              onClick={()=>bottomRef.current?.scrollIntoView({behavior:"smooth"})}
              className={`fixed bottom-28 right-6 z-30 w-9 h-9 rounded-full border backdrop-blur-md flex items-center justify-center shadow-xl transition-all ${dark?"bg-[#1a1a2e]/90 border-white/12 text-slate-300 hover:text-white":"bg-white/90 border-black/12 text-slate-400 hover:text-slate-900"}`}>
              <ChevronDown size={17}/>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── INPUT ALANI ── */}
        <div className={`sticky bottom-0 z-10 bg-gradient-to-t ${gradBot} to-transparent pt-6 pb-5 flex-shrink-0`}>
          <div className="max-w-3xl mx-auto px-4">

            {/* Gemini tarzı geniş input kutusu */}
            <div className={`border rounded-3xl backdrop-blur-xl shadow-2xl transition-all duration-300 overflow-hidden ${inputBox}`}>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>{setInput(e.target.value);autoH(e);}}
                onKeyDown={onKey}
                placeholder={`Kuantist'e sor… (${st.enterGonder?"Enter":"Ctrl+Enter"} gönder)`}
                rows={1}
                disabled={loading}
                className={`w-full bg-transparent text-sm resize-none outline-none px-5 pt-4 pb-2 leading-relaxed disabled:opacity-40 ${inTxt}`}
                style={{ minHeight:"52px", maxHeight:"160px" }}
              />

              {/* Alt çubuk — Gemini stili */}
              <div className="flex items-center justify-between px-4 pb-3.5 pt-1">

                {/* Sol: araçlar */}
                <div className="flex items-center gap-1">
                  {/* Uzman ikonları */}
                  {Object.entries(UZMANLAR).map(([k,v])=>(
                    <div key={k} title={`${v.label} Uzmanı`}
                      className={`w-7 h-7 rounded-xl ${v.bg} border ${v.border} flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-default`}>
                      <v.Icon size={12} className={v.text}/>
                    </div>
                  ))}

                  {/* Mikrofon */}
                  <button onClick={micToggle} title={dinliyor?"Durdur":"Sesle Yaz"}
                    className={`ml-1 w-7 h-7 rounded-xl flex items-center justify-center transition-all ${dinliyor?"bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse":(dark?"text-slate-500 hover:text-slate-200 hover:bg-white/8":"text-slate-400 hover:text-slate-700 hover:bg-black/8")}`}>
                    {dinliyor?<MicOff size={12}/>:<Mic size={12}/>}
                  </button>

                  {/* Karakter/kelime sayacı */}
                  {input.length > 0 && (
                    <motion.span initial={{opacity:0}} animate={{opacity:1}} className={`text-[10px] ml-2 ${dark?"text-slate-600":"text-slate-400"}`}>
                      {kelime(input)}k · {input.length}c
                    </motion.span>
                  )}
                </div>

                {/* Sağ: gönder */}
                <motion.button
                  onClick={()=>send()}
                  disabled={!input.trim()||loading}
                  whileTap={{scale:0.93}}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 shadow-lg ${input.trim()&&!loading ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-violet-900/30" : (dark?"bg-white/8 text-slate-500 cursor-not-allowed":"bg-black/8 text-slate-400 cursor-not-allowed")}`}>
                  <Send size={14}/><span>Gönder</span>
                </motion.button>
              </div>
            </div>

            <p className={`text-center text-[11px] mt-2 ${dark?"text-slate-700":"text-slate-400"}`}>
              Kuantist yanıtları yanlış olabilir. Önemli kararlar için doğrulayın.
            </p>
          </div>
        </div>
      </div>

      {/* ── AYARLAR PANELİ ── */}
      <AnimatePresence>
        {st.ayarlar && <>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>dispatch({type:"AYARLAR"})}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"/>
          <Ayarlar s={st} dispatch={dispatch}/>
        </>}
      </AnimatePresence>
    </div>
  );
}
