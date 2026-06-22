# WeatherGuard

WeatherGuard, hava durumunu günlük karar asistanına çeviren hafif bir web uygulamasıdır. Şehir araması veya tarayıcı konumu ile güncel hava, 12 saatlik tahmin, 7 günlük tahmin, risk skoru ve pratik günlük öneriler gösterir.

## Nasıl Çalıştırılır?

1. `weatherguard` klasörünü açın.
2. `index.html` dosyasını tarayıcıda açın.
3. Bir şehir arayın veya `Konumumu Kullan` butonuna basın.

Kurulum, npm, backend veya build adımı gerekmez.

## Kullanılan API

WeatherGuard gerçek hava verisi için Open-Meteo servislerini kullanır:

- Open-Meteo Geocoding API
- Open-Meteo Forecast API

## Ana Özellikler

- Türkçe şehir arama
- Birden fazla şehir sonucu için seçim listesi
- Tarayıcı konumu ile hava durumu alma
- Güncel sıcaklık, hissedilen sıcaklık, nem, rüzgar, hamle ve yağış bilgileri
- Open-Meteo hava kodlarını Türkçe açıklama ve emojiye dönüştürme
- 0-100 arası günlük risk skoru
- Risk nedenleri ve kısa öneri
- Şemsiye, dışarıda spor, bisiklet/motosiklet, çamaşır asma ve güneş riski kartları
- Sonraki 12 saat tahmini
- 7 günlük tahmin
- Şehir arandıktan sonra akıllı gün özeti
- Önümüzdeki saatlere göre "şimdi mi, sonra mı?" yorumu
- Kompakt gün içi risk grafiği
- Plan Kontrolü sekmesi ile belirli saate göre yürüyüş, spor, ulaşım, çamaşır ve bisiklet/motosiklet yorumu
- Karşılaştırma sekmesi ile iki şehri yan yana kıyaslama
- Son 5 aramayı localStorage ile saklama
- Son seçilen şehri sayfa yenilenince otomatik yükleme
- Mobil uyumlu, açık ve sky-themed arayüz

## Gelecek Fikirleri

- Saatlik risk grafiği
- Favori şehirler paneli
- Hava uyarı eşiği ayarları
- Yağış radarı bağlantıları
- Türkçe kıyafet önerileri
- PWA desteği ile telefonda uygulama gibi kullanma
