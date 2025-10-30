<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Asisten Kultum Jowo - AI Sermon Generator

Aplikasi AI untuk membantu membuat kultum (kuliah tujuh menit) dan ceramah dalam bahasa Jawa dengan sentuhan modern.

## 🚀 **Live Demo**
**🌐 Production URL:** https://boso-jowo.vercel.app

**Alternative URLs:**
- https://boso-jowo-hafarnas-projects.vercel.app
- https://boso-jowo-hafarna03aja-droid-hafarnas-projects.vercel.app

View your app in AI Studio: https://ai.studio/apps/drive/1GUyUOVAps41Ng02cKgtq--8EIKb6ZiMx

## Fitur

- 🎯 Generator kultum otomatis
- 🔄 Riwayat percakapan
- 🎵 Sintesis suara
- 📝 Mode latihan
- 🌐 Interface modern dengan React + TypeScript

## Prerequisites

- Node.js (versi 18 atau lebih baru)
- Gemini API Key

## Run Locally

1. **Clone repository:**
   ```bash
   git clone <your-repo-url>
   cd boso-jowo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit file `.env` dan isi `GEMINI_API_KEY` dengan API key Anda dari [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build untuk production:**
   ```bash
   npm run build
   ```

## Deploy ke Vercel

### Quick Deploy (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/boso-jowo)

### Manual Deploy

1. **Fork repository ini ke GitHub account Anda**

2. **Buat project baru di Vercel:**
   - Kunjungi [vercel.com](https://vercel.com)
   - Klik "New Project"
   - Import repository GitHub Anda
   - Vercel akan mendeteksi pengaturan otomatis

3. **Setup Environment Variables di Vercel:**
   - Di dashboard Vercel, buka Settings > Environment Variables
   - Tambahkan variable: `GEMINI_API_KEY` dengan value API key Anda
   - Klik "Save"

4. **Deploy:**
   - Klik "Deploy"
   - Tunggu proses deployment selesai
   - Aplikasi Anda akan tersedia di URL yang disediakan Vercel

### Deploy via CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login ke Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Tambahkan environment variables:**
   ```bash
   vercel env add GEMINI_API_KEY
   ```

## Struktur Project

```
├── components/          # React components
│   ├── History.tsx     # Komponen riwayat
│   ├── McTextGenerator.tsx # Generator teks utama
│   ├── PracticeSession.tsx # Mode latihan
│   └── SermonGenerator.tsx # Generator kultum
├── services/           # API services
│   └── gemini.ts      # Integrasi Gemini AI
├── utils/             # Utilities
│   └── audio.ts       # Audio synthesis
├── App.tsx            # Main component
├── index.tsx          # Entry point
└── vercel.json        # Konfigurasi Vercel
```

## Troubleshooting

### Build Errors
- Pastikan semua dependencies terinstall: `npm install`
- Check TypeScript errors: `npm run lint`
- Rebuild: `npm run build`

### Environment Variables
- Pastikan `GEMINI_API_KEY` sudah di-set di environment variables Vercel
- Untuk development lokal, pastikan file `.env` exists dan terisi

### Performance
- Vercel secara otomatis mengoptimalkan build
- Assets akan di-cache dan di-serve melalui CDN
- Cold start bisa terjadi jika tidak ada traffic

## Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/nama-fitur`
3. Commit changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/nama-fitur`
5. Submit pull request
