# Node.js API

Bu proje, temel işlevleri sağlayan bir Node.js API'sidir. Kullanıcı kaydı, girişi, bilgi güncelleme, silme ve tüm kullanıcıları listeleme gibi işlevleri içerir.

## Özellikler

- Kullanıcı kaydı
- Kullanıcı girişi (JWT token ile)
- Kullanıcı bilgilerini güncelleme
- Kullanıcı silme
- Tüm kullanıcıları listeleme
- Token yenileme

## Teknolojiler

- Node.js
- Express.js
- MySQL
- JSON Web Token (JWT)
- Bcrypt.js
- Multer (dosya yükleme için)

## Kurulum

1. Repoyu klonlayın:
   ```
   git clone https://github.com/emirkorkmazz/node-js-api.git
   ```

2. Proje dizinine gidin:
   ```
   cd node-js-api
   ```

3. Gerekli paketleri yükleyin:
   ```
   npm install
   ```

4. `.env` dosyası oluşturun ve gerekli ortam değişkenlerini ayarlayın:
   ```
   API_URL= "KULLANACAGINIZ API URL"
   ```
5. `db.js` dosyası oluşturun ve gerekli ortam değişkenlerini ayarlayın:
   ```
   host: 'Veritabanı Sunucu Adresiniz',
   user: 'Veritabanı Kullanıcı Adınız',
   password: 'Veritabanı Şifreniz',
   database: 'Veritabanı Adınız'
  
   ```

6. Uygulamayı başlatın:
   ```
   npm start
   ```
   veya
   ```
   npm run dev
   ```

## API Endpoints

- `POST /api/user/register`: Yeni kullanıcı kaydı
- `POST /api/user/login`: Kullanıcı girişi
- `POST /api/user/update`: Kullanıcı bilgilerini güncelleme (yetkilendirme gerekli)
- `DELETE /api/user/delete`: Kullanıcı hesabını silme (yetkilendirme gerekli)
- `GET /api/user/all`: Tüm kullanıcıları listeleme (yetkilendirme gerekli)
- `GET /api/user/get-user-details`: Kullanıcı detaylarını getirme (yetkilendirme gerekli)
- `POST /api/user/refresh-token`: Token yenileme

## Swagger Dokümantasyonu

API dokümantasyonu için `http://localhost:3000/api-docs` adresini ziyaret edin.

## Lisans

Bu proje [MIT lisansı](LICENSE) altında lisanslanmıştır.
