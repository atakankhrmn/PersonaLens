# PersonaLens: MBTI Personality Type Prediction Based on Social Media Data Using Machine Learning

**DW (Data Warehouse & Business Intelligence) Proje Planı**

---

## 1. Projenin Amacı

Sosyal medya veya forum paylaşımlarındaki metinlerden, makine öğrenmesi kullanarak kişilerin kendi beyan ettikleri MBTI kişilik tiplerini tahmin etmeye yönelik bir prototip geliştirmek.

Proje yalnızca bir sınıflandırma uygulamasından oluşmayacak. Veri işleme (ETL), veri ambarı, model değerlendirme ve iş zekâsı (BI) dashboard'u da içerecek. Böylece DW dersinin kapsamına uygun, ileride araştırma makalesine dönüştürülebilecek bir çalışma ortaya çıkacak.

> **Not:** MBTI bilimsel açıdan sınırlılıkları olan bir tipolojidir. Modelin çıktıları kesin bir kişilik tanısı değildir; metinlerden öz bildirimli MBTI etiketlerinin ne ölçüde tahmin edilebildiği incelenecektir.

## 2. Veri Seti

**İlk aday:** PersonalityCafe MBTI veri setinin ön işlenmiş sürümü
<https://huggingface.co/datasets/Lazanantenaina/personalitycafe-mbti-preprocessed>

**Orijinal veri seti:**
<https://www.kaggle.com/datasets/datasnaek/mbti-type>

- Yaklaşık 8.675 kullanıcının forum paylaşımları
- Kullanıcı başına yaklaşık 50 paylaşım
- 16 MBTI etiketi (INTJ, ENFP vb.)
- Metinlerin temizlenmiş sürümleri ve modelleme için kullanılabilecek ayrımlar

> **Önemli:** Veri seti Twitter/X verisi değil, PersonalityCafe forumundan geliyor. Bu nedenle proje başlığında belirli bir platform adı kullanılmayacak. Farklı sosyal medya kaynaklarında kullanılabilirlik ayrıca test edilmelidir.

Veri sızıntısını önlemek için metinlerde geçen MBTI kodlarının temizlendiği sürüm tercih edilecek. Aynı kişiye ait metinler eğitim ve test kümelerine birlikte düşmeyecek. Veri setinin tam alanları ve lisans/erişim koşulları uygulamaya başlamadan önce doğrulanacak.

## 3. Uygulama Fikri: PersonaLens

**Teknoloji:** Python + Streamlit

Kullanıcı uygulamaya birden fazla sosyal medya paylaşımı veya kendi yazdığı metinleri girecek. Eğitilmiş model metinleri analiz ederek MBTI boyutları için tahminler üretecek. Sonuç ekranında şunlar gösterilecek:

- Tahmin edilen MBTI tipi (ör. INTP)
- Dört boyut için tahminler: E/I, N/S, T/F, J/P
- Modelin sınıflandırma skorları ve sınırlılıkları
- Kısa, ihtiyatlı açıklamalar
- Veri yetersizse uyarı

Skorlar kesin kişilik olasılığı gibi sunulmayacak; gerekirse kalibrasyonları değerlendirilecek.

**Örnek giriş metni:**

> "I enjoy exploring new ideas, spending time alone reading and thinking about future possibilities."

Bu tek cümlede yeni fikirlere ilgi ve yalnız vakit geçirmekten söz ediliyor. Ancak tek bir paylaşım üzerinden güvenilir MBTI tipi tahmin edilemez. Bu örnek, uygulamanın metin girişini test etmek için kullanılacak.

## 4. Teknik Mimari

```
Veri Kaynağı
    ↓
Python / Pandas ile ETL (temizleme, dönüştürme, yükleme)
    ↓
PostgreSQL Veri Ambarı
    ↓
ML Modeli (TF-IDF + Logistic Regression; alternatif SVM)
    ↓
Streamlit Uygulaması ve BI Dashboard
```

Uygulama ile veri ambarı arasındaki iş akışında gerekirse işlenmiş veriler, model tahminleri ve değerlendirme metrikleri ayrı tablolarda tutulacak. Kullanıcıların özel metinlerini gereksiz yere saklamamaya dikkat edilecek.

## 5. Makine Öğrenmesi Yaklaşımı

Başlangıçta dört ayrı ikili sınıflandırıcı:

| Boyut | Açıklama |
|-------|----------|
| E / I | Extraversion – Introversion |
| N / S | Intuition – Sensing |
| T / F | Thinking – Feeling |
| J / P | Judging – Perceiving |

Dört çıktının birleştirilmesiyle 16 MBTI tipinden biri tahmin edilecek.

- **İlk model:** TF-IDF + Logistic Regression
- **Karşılaştırma modeli:** TF-IDF + SVM
- **İleri aşama (zaman kalırsa):** BERT tabanlı metin sınıflandırma

**Değerlendirme:**

- Macro-F1
- Precision / Recall
- Balanced Accuracy
- Confusion Matrix
- 16 tip için tam sınıflandırma başarısı
- Sınıf dengesizliği ve veri sızıntısı kontrolü

Model değerlendirmesi eğitim sırasında görülmeyen kullanıcılar üzerinden yapılmalı.

## 6. Data Warehouse Tasarımı

Örnek tablolar:

| Tablo | İçerik |
|-------|--------|
| `DIM_USER` | Anonim kullanıcı kimliği |
| `DIM_SOURCE` | Platform / veri kaynağı |
| `DIM_DATE` | Paylaşım veya tahmin tarihi (varsa) |
| `DIM_MBTI_TYPE` | MBTI tipleri |
| `FACT_POST` | Paylaşım kayıtları ve sayısal özellikleri |
| `FACT_PREDICTION` | Model sürümü, tahmin edilen etiket ve skorlar |

Bu bir başlangıç şemasıdır. Veri setindeki gerçek sütunlara ve ölçümlerin granülerliğine göre düzenlenecek. Tarih gibi bulunmayan alanlar uydurulmayacak.

## 7. BI Dashboard

Streamlit, Power BI veya benzeri bir araçla aşağıdaki analizler gösterilebilir:

- Veri setindeki 16 MBTI tipinin dağılımı
- Dört MBTI boyutundaki sınıf dağılımları
- Tip bazında paylaşım ve kelime sayıları
- Model başarı metrikleri
- Confusion Matrix
- İleride birden fazla veri kaynağı olursa platform karşılaştırmaları

Dashboard'daki analizlerin bir kısmı veri profillemesi, bir kısmı model değerlendirmesi olacak. Gerçek kişilere dair kesin psikolojik yargılar sunulmayacak.

## 8. Geliştirme Adımları

1. Veri setini indirme, sütunları ve dağılımları inceleme.
2. MBTI kodlarını ve diğer olası veri sızıntılarını temizleme.
3. Kullanıcı bazlı eğitim / doğrulama / test ayrımını doğrulama.
4. Dört sınıflandırma modeli eğitme ve performanslarını ölçme.
5. Streamlit metin girişi ve tahmin ekranını geliştirme.
6. PostgreSQL üzerinde veri ambarı ve ETL sürecini kurma.
7. Model tahminlerini ve veri kalite ölçümlerini raporlama.
8. Dashboard hazırlama.
9. Sunum ve canlı demo yapma.

## 9. Sunum İçeriği Önerisi

- Proje problemi, motivasyon ve kapsam
- Veri seti ve sınırlılıklar
- ETL adımları ve veri kalitesi
- Star Schema / veri ambarı tasarımı
- Modelleme yaklaşımı ve algoritmalar
- Değerlendirme sonuçları (gerçek ölçümler)
- BI dashboard ve canlı Streamlit demosu
- Bulgular, sınırlılıklar ve sonraki çalışmalar

## 10. İleride Makale Fikri

**Örnek başlık:**

> *"Integrating Social Media-Based MBTI Prediction into a Data Warehouse and Business Intelligence Framework"*

**Araştırma sorusu:**

> *"How effectively can machine learning models predict self-reported MBTI personality types from user-generated text, and how can these predictions be integrated into a data warehouse for analytical decision support?"*

Makale için model karşılaştırması, kullanıcı bazlı bağımsız test, sınıf dengesizliği analizi ve mümkünse başka platforma genelleme deneyi yapılabilir. Özellikle MBTI etiketlerinin öz bildirimli olması ve forum verisinin sosyal medya verisini ne kadar temsil ettiği tartışılmalı.

## 11. Önerilen Teknolojiler

| Teknoloji | Kullanım Amacı |
|-----------|----------------|
| Python, Pandas | Veri işleme ve ETL |
| Scikit-learn | ML modelleri ve değerlendirme |
| PostgreSQL | Veri ambarı |
| Streamlit | Kullanıcı arayüzü ve dashboard |
| Power BI | İsteğe bağlı ek BI görselleştirmeleri |
| GitHub | Kod sürüm yönetimi ve ekip çalışması |

---

## Özet

Önce mevcut metin veri setiyle çalışan ve performansı ölçülmüş MBTI tahmin modeli kurulacak. Ardından Streamlit prototipi, veri ambarı ve BI dashboard oluşturulacak. Proje deneysel bir sınıflandırma ve veri analitiği sistemi olarak sunulacak; kesin kişilik tespiti iddiasında bulunulmayacak.
