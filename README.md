# Weather-Controller-App

WeatherGuard is a lightweight vanilla JavaScript weather decision assistant that turns real Open-Meteo forecasts into daily risk scores, timing advice, plan checks, and city comparisons.

## Nasıl Çalıştırılır?

1. Bu klasörü açın.
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
- Şehir arandıktan sonra akıllı gün özeti
- Önümüzdeki saatlere göre "şimdi mi, sonra mı?" yorumu
- Kompakt gün içi risk grafiği
- Plan Kontrolü sekmesi ile belirli saate göre yürüyüş, spor, ulaşım, çamaşır ve bisiklet/motosiklet yorumu
- Karşılaştırma sekmesi ile iki şehri yan yana kıyaslama
- Sonraki 12 saat tahmini
- 7 günlük tahmin
- Son 5 aramayı localStorage ile saklama
- Son seçilen şehri sayfa yenilenince otomatik yükleme

## Gelecek Fikirleri

- Kıyafet önerileri
- Hava uyarı eşiği ayarları
- Yağış radarı bağlantıları
- PWA desteği ile telefonda uygulama gibi kullanma
