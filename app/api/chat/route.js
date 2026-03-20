// ============================================================
// KUANTIST WEB - Backend API Route (BYTEZ & GPT-4o ENTEGRASYONU)
// Dosya: app/api/chat/route.js
// ============================================================

import Bytez from "bytez.js";

// Bytez SDK'sını başlat (.env.local'daki BYTEZ_API_KEY'i kullanır)
// Not: Eğer .env.local çalışmazsa doğrudan key'i buraya yazabilirsin ama .env daha güvenlidir.
const sdk = new Bytez(process.env.BYTEZ_API_KEY);

// ---- UZMAN SİSTEM MESAJLARI (System Prompts) ----
const UZMAN_SISTEM_MESAJLARI = {
  KODLAMA: `Sen Kuantist'in Kodlama Uzmanısın. Adın "Code-K".
- SADECE yazılım, kod, programlama ve teknoloji konularında yardım edersin.
- Cevaplarında her zaman temiz, yorumlu ve çalışan kod örnekleri ver.
- Kod bloklarını Markdown formatında (üç backtick ve dil adıyla) göster.
- Hangi dil ve teknolojinin neden daha uygun olduğunu kısaca açıkla.
- Eğer soru kodlamayla ilgili değilse, kibarca "Bu konu benim uzmanlık alanımın dışında" de.
- Türkçe konuş ama teknik terimler İngilizce kalabilir.`,

  SPOR: `Sen Kuantist'in Spor Uzmanısın. Adın "Sport-K".
- SADECE spor, atletizm, takımlar, müsabakalar ve sporcular hakkında konuşursun.
- Futbol, basketbol, tenis, F1 ve diğer tüm branşlar hakkında derin bilgin var.
- Heyecanlı, enerjik ve tutkulu bir dille konuş. Stat ve rakamları seviyorsun.
- Eğer soru sporla ilgili değilse, "Saha dışı konular benim saham değil!" de.
- Güncel sonuçları bilmeyebilirsin; bu durumda dürüstçe belirt.
- Türkçe konuş.`,

  HAVA_DURUMU: `Sen Kuantist'in Hava Durumu ve Coğrafya Uzmanısın. Adın "Weather-K".
- SADECE hava durumu, iklim, coğrafya, şehirler ve bölgeler hakkında bilgi verirsin.
- Sıcaklık tahminleri, mevsimsel trendler ve iklim değişikliği konularında derinsin.
- Sakin, bilimsel ama anlaşılır bir dil kullan.
- Gerçek zamanlı veri erişimin YOK; bu durumu kullanıcıya şeffaf bir şekilde söyle ve genel bilgi ver.
- Türkçe konuş.`,

  GENEL: `Sen Kuantist V2.0, gelişmiş bir genel amaçlı yapay zeka asistanısın.
- Her türlü konuda yardım edebilirsin: tarih, bilim, felsefe, günlük sorular, yaratıcı yazarlık.
- Zeki, meraklı ve biraz esprili bir karakterin var.
- Cevaplarını açık ve anlaşılır tut; gerektiğinde madde madde listele.
- Türkçe konuş.`,
};

// ---- YÖNLENDIRICI (ROUTER) FONKSİYONU ----
async function kategoriBelirleme(mesaj) {
  try {
    // Senin istediğin gpt-4o modelini seçiyoruz
    const routerModel = sdk.model("openai/gpt-4o");
    
    const routerPrompt = `Aşağıdaki kullanıcı mesajını analiz et ve SADECE şu dört kategoriden birini yaz:
- KODLAMA
- SPOR
- HAVA_DURUMU
- GENEL

ÖNEMLI: Sadece kategori adını yaz, başka hiçbir şey yazma.
Kullanıcı Mesajı: "${mesaj}"`;

    // Bytez formatında soruyu gönderiyoruz
    const { error, output } = await routerModel.run([
      { role: "user", content: routerPrompt }
    ]);

    if (error) {
      console.error("Router API Hatası:", error);
      return "GENEL";
    }

    // Cevabı metin olarak al ve düzenle
    let kategoriMetni = typeof output === 'string' ? output : (output?.text || output?.content || output[0]?.text || "GENEL");
    kategoriMetni = kategoriMetni.trim().toUpperCase();

    const gecerliKategoriler = ["KODLAMA", "SPOR", "HAVA_DURUMU", "GENEL"];
    
    for (const kat of gecerliKategoriler) {
        if (kategoriMetni.includes(kat)) {
            return kat;
        }
    }
    
    return "GENEL";
  } catch (hata) {
    console.error("Router hatası:", hata);
    return "GENEL";
  }
}

// ---- UZMAN CEVABI ALMA FONKSİYONU ----
async function uzmanCevabi(mesaj, kategori, gecmis = []) {
  const sistemMesaji = UZMAN_SISTEM_MESAJLARI[kategori] || UZMAN_SISTEM_MESAJLARI.GENEL;

  const gecmisFormatli = gecmis.map((m) => ({
    role: m.rol === "kullanici" ? "user" : "assistant",
    content: m.icerik,
  }));

  const tumMesajlar = [
    { role: "system", content: sistemMesaji },
    ...gecmisFormatli,
    { role: "user", content: mesaj },
  ];

  // Senin istediğin gpt-4o modelini uzman olarak da seçiyoruz
  const uzmanModel = sdk.model("openai/gpt-4o");
  
  // Bytez formatında tüm sohbet geçmişiyle soruyu gönderiyoruz
  const { error, output } = await uzmanModel.run(tumMesajlar);

  if (error) {
    console.error("Uzman Model API Hatası:", error);
    throw new Error("Yapay zeka modelinden yanıt alınırken bir hata oluştu.");
  }

  // Cevabı temiz bir metin olarak alıyoruz
  const uzmanCevabiMetni = typeof output === 'string' ? output : (output?.text || output?.content || output[0]?.text || "Cevap anlaşılamadı.");

  return uzmanCevabiMetni; 
}

// ---- ANA POST HANDLER ----
export async function POST(request) {
  try {
    const { mesaj, gecmis = [] } = await request.json();

    if (!mesaj || typeof mesaj !== "string" || mesaj.trim().length === 0) {
      return Response.json({ hata: "Geçerli bir mesaj gönderilmedi." }, { status: 400 });
    }

    const temizMesaj = mesaj.trim().slice(0, 2000);
    console.log(`[Kuantist] Gelen mesaj: "${temizMesaj.slice(0, 50)}..."`);

    // 1. Kategoriyi belirle
    const kategori = await kategoriBelirleme(temizMesaj);
    console.log(`[Kuantist] Belirlenen kategori: ${kategori}`);

    // 2. Uzmandan cevap al
    const cevap = await uzmanCevabi(temizMesaj, kategori, gecmis);
    console.log(`[Kuantist] Cevap başarıyla alındı`);

    // 3. Frontend'e gönder
    return Response.json({
      cevap: cevap,
      kategori: kategori,
      basari: true,
    });
    
  } catch (hata) {
    console.error("[Kuantist] Kritik hata:", hata);
    return Response.json(
      {
        hata: "Yapay zeka servisi şu an yanıt vermiyor. Lütfen tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}