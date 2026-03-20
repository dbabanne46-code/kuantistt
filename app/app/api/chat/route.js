// ============================================================
// KUANTIST WEB - Backend API Route
// Dosya: app/api/chat/route.js
//
// Bu dosya şunları yapar:
// 1. Kullanıcı mesajını alır.
// 2. "Router" (Yönlendirici) AI ile mesajın kategorisini belirler.
// 3. Kategori ne ise ilgili "Uzman AI"'a soruyu iletir.
// 4. Cevabı ve kategoriyi frontend'e geri gönderir.
// ============================================================

import Bytez from "bytez.js";

// Bytez SDK'sını başlat (.env.local'dan API anahtarını çeker)
const sdk = new Bytez(process.env.BYTEZ_API_KEY);

// ---- UZMAN SİSTEM MESAJLARI (System Prompts) ----
// Her uzmanın kişiliğini ve uzmanlık alanını tanımlıyoruz.

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
- Hava tahmini için meteoroloji sitelerini (MGM, Weather.com vb.) önermekten çekinme.
- Türkçe konuş.`,

  GENEL: `Sen Kuantist V2.0, gelişmiş bir genel amaçlı yapay zeka asistanısın.
- Her türlü konuda yardım edebilirsin: tarih, bilim, felsefe, günlük sorular, yaratıcı yazarlık.
- Zeki, meraklı ve biraz esprili bir karakterin var.
- Cevaplarını açık ve anlaşılır tut; gerektiğinde madde madde listele.
- Emin olmadığın bilgilerde dürüst ol ve kullanıcıya doğrulamayı tavsiye et.
- Türkçe konuş.`,
};

// ---- YÖNLENDIRICI (ROUTER) FONKSİYONU ----
// Kullanıcının mesajını analiz edip hangi uzmana gideceğini belirler.
async function kategoriBelirleme(mesaj) {
  try {
    // Yönlendirici için hafif ve hızlı bir model kullan
    const routerModel = sdk.model("openai/gpt-4o-mini");

    const routerPrompt = `Aşağıdaki kullanıcı mesajını analiz et ve SADECE şu dört kategoriden birini yaz:
- KODLAMA: Yazılım, kod, programlama, uygulama geliştirme, veritabanı, API, hata düzeltme
- SPOR: Futbol, basketbol, tenis, F1, olimpiyatlar, sporcular, takımlar, maç sonuçları
- HAVA_DURUMU: Hava tahmini, sıcaklık, iklim, coğrafya, şehirler, bölgeler
- GENEL: Bunların dışındaki her şey (tarih, bilim, günlük sorular, felsefe, matematik vb.)

ÖNEMLI: Sadece kategori adını yaz, başka hiçbir şey yazma.

Kullanıcı Mesajı: "${mesaj}"`;

    const yanit = await routerModel.chat.completions.create({
      messages: [{ role: "user", content: routerPrompt }],
      max_tokens: 20,
      temperature: 0, // Tutarlılık için sıfır sıcaklık
    });

    const kategori = yanit.choices[0].message.content.trim().toUpperCase();

    // Geçerli kategorilerden biri mi diye kontrol et
    const gecerliKategoriler = ["KODLAMA", "SPOR", "HAVA_DURUMU", "GENEL"];
    return gecerliKategoriler.includes(kategori) ? kategori : "GENEL";
  } catch (hata) {
    console.error("Router hatası:", hata);
    // Hata durumunda varsayılan olarak GENEL kategorisine düş
    return "GENEL";
  }
}

// ---- UZMAN CEVABI ALMA FONKSİYONU ----
// Belirlenen kategorinin uzmanına soruyu iletir ve cevabı alır.
async function uzmanCevabi(mesaj, kategori, gecmis = []) {
  // Kategori için doğru sistem mesajını seç
  const sistemMesaji = UZMAN_SISTEM_MESAJLARI[kategori] || UZMAN_SISTEM_MESAJLARI.GENEL;

  // Geçmiş mesajları Bytez.js formatına dönüştür
  const gecmisFormatli = gecmis.map((m) => ({
    role: m.rol === "kullanici" ? "user" : "assistant",
    content: m.icerik,
  }));

  // Tüm mesaj dizisini oluştur: sistem + geçmiş + yeni mesaj
  const tumMesajlar = [
    { role: "system", content: sistemMesaji },
    ...gecmisFormatli,
    { role: "user", content: mesaj },
  ];

  // Uzman modeli belirle - tüm kategoriler için aynı güçlü modeli kullanıyoruz
  // İstersen farklı kategoriler için farklı modeller seçebilirsin:
  // Örn: KODLAMA için "anthropic/claude-opus-4-5" gibi
  const uzmanModel = sdk.model("openai/gpt-oss-120b");

  const yanit = await uzmanModel.chat.completions.create({
    messages: tumMesajlar,
    max_tokens: 1500,
    temperature: 0.7,
  });

  return yanit.choices[0].message.content;
}

// ---- ANA POST HANDLER ----
// Next.js App Router'ın beklediği isimlendirilmiş export
export async function POST(request) {
  try {
    // İstek gövdesini parse et
    const { mesaj, gecmis = [] } = await request.json();

    // Temel doğrulama
    if (!mesaj || typeof mesaj !== "string" || mesaj.trim().length === 0) {
      return Response.json(
        { hata: "Geçerli bir mesaj gönderilmedi." },
        { status: 400 }
      );
    }

    // Mesaj çok uzunsa kırp (güvenlik)
    const temizMesaj = mesaj.trim().slice(0, 2000);

    console.log(`[Kuantist] Gelen mesaj: "${temizMesaj.slice(0, 50)}..."`);

    // ADIM 1: Yönlendirici ile kategoriyi belirle
    const kategori = await kategoriBelirleme(temizMesaj);
    console.log(`[Kuantist] Belirlenen kategori: ${kategori}`);

    // ADIM 2: İlgili uzmandan cevap al
    const cevap = await uzmanCevabi(temizMesaj, kategori, gecmis);
    console.log(`[Kuantist] Cevap alındı (${cevap.length} karakter)`);

    // ADIM 3: Cevabı ve kategoriyi frontend'e gönder
    return Response.json({
      cevap,
      kategori,
      basari: true,
    });
  } catch (hata) {
    console.error("[Kuantist] Kritik hata:", hata);

    // Kullanıcıya anlamlı hata mesajı döndür
    return Response.json(
      {
        hata: "Yapay zeka servisi şu an yanıt vermiyor. Lütfen birkaç saniye bekleyip tekrar deneyin.",
        detay: process.env.NODE_ENV === "development" ? hata.message : undefined,
      },
      { status: 500 }
    );
  }
}