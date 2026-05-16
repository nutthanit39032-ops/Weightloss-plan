# Nutthanit · 65kg Tracker 🎯

แอปติดตามอาหาร · ออกกำลังกาย · น้ำหนัก · สแกนรอบเดือน — สู่เป้า 65 kg

ติดตั้งบน iPhone home screen ได้เหมือนแอปจริง (PWA)

---

## 🚀 วิธี Deploy ขึ้น Vercel (ทำครั้งเดียว · ใช้เวลา ~15 นาที)

### ขั้นที่ 1 · เอา API Key ของ Anthropic

1. เข้า https://console.anthropic.com/
2. ล็อกอินด้วย Google
3. ไปที่ **Settings → API Keys** → **Create Key** → คัดลอกค่า (ขึ้นต้นด้วย `sk-ant-...`)
4. **เก็บไว้แอบๆ** — ห้ามแชร์ ห้ามวางใน code

> 💰 ค่าใช้: ฟรี $5 credit ตอนสมัคร · หลังจากนั้นค่าวิเคราะห์รูปอาหาร ~$0.01-0.02 ต่อรูป
> ถ้าใช้บ่อยมาก เดือนละ ~$2-5

### ขั้นที่ 2 · อัปโหลด code ขึ้น GitHub

1. ไป https://github.com/new → ตั้งชื่อ `tracker` (private ก็ได้) → Create
2. บนเครื่องตัวเอง: เปิด Terminal ใน folder นี้ (folder ที่มี `package.json`)
3. รัน:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tracker.git
git push -u origin main
```

(แทน `YOUR_USERNAME` ด้วยชื่อ GitHub ของคุณ)

### ขั้นที่ 3 · Deploy ไป Vercel

1. ไป https://vercel.com/signup → **Sign up with GitHub**
2. หน้า dashboard กด **Add New → Project**
3. เลือก repo `tracker` ที่เพิ่ง push ขึ้น
4. **สำคัญมาก** — ก่อนกด Deploy:
   - ขยาย **Environment Variables**
   - เพิ่ม: Key = `ANTHROPIC_API_KEY` · Value = key ที่ copy จากขั้นที่ 1
5. กด **Deploy**
6. รอ ~1 นาที — เสร็จแล้วจะได้ URL เช่น `https://tracker-xxx.vercel.app`

### ขั้นที่ 4 · ติดตั้งบน iPhone home screen

1. เปิด URL ด้านบนใน **Safari** (ต้อง Safari ห้ามใช้ Chrome)
2. แตะปุ่ม **Share** (กล่อง ↑ ตรงล่าง)
3. เลื่อนหา **"Add to Home Screen"**
4. ตั้งชื่อ "Tracker" → Add
5. ไอคอน 65 จะโผล่บน home screen — แตะใช้ได้เหมือนแอป

---

## 🛠 รันบนเครื่องตัวเอง (ก่อน deploy)

ต้องลง Node.js ก่อน (https://nodejs.org)

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

> ⚠️ ฟีเจอร์ AI (ถ่ายรูปอาหาร + สแกน) จะไม่ทำงานบน localhost เพราะไม่มี environment variable
> สร้างไฟล์ `.env.local` ใส่ `ANTHROPIC_API_KEY=sk-ant-...` ถ้าอยากทดสอบ AI ในเครื่อง (แต่ต้องเซ็ตอัปเพิ่มเล็กน้อย)

---

## 📦 โครงสร้างไฟล์

```
tracker/
├── api/
│   └── claude.js          ← Vercel serverless function (proxy AI)
├── public/
│   ├── favicon.svg
│   ├── icon-192.png       ← PWA icon
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── src/
│   ├── App.jsx            ← โค้ดทั้งแอป
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js         ← PWA config
└── vercel.json
```

---

## 💾 ข้อมูล

เก็บใน browser ของเครื่องคุณ (localStorage) — ไม่ส่งไปไหน

- เคลียร์ cache Safari = ข้อมูลหาย → จดน้ำหนัก/สแกน screenshot ไว้บ้าง
- ใช้ iCloud Sync ระหว่างเครื่องไม่ได้ (PWA limitation)

ถ้าอยากให้ sync ข้ามเครื่อง / backup cloud จริงๆ — ต้องเพิ่ม backend (เช่น Supabase) — บอกได้

---

## 🐛 ปัญหาที่อาจเจอ

**"AI วิเคราะห์ไม่สำเร็จ"** → เช็ค Environment Variable `ANTHROPIC_API_KEY` ใน Vercel ว่าตั้งถูกไหม + API key ยังไม่หมดอายุ

**"Add to Home Screen ไม่โผล่"** → ต้องใช้ Safari (ไม่ใช่ Chrome/Firefox) บน iOS

**"ไอคอนเบลอ"** → ลบ shortcut เก่าออก แล้ว Add to Home Screen ใหม่

---

สนุกกับการ deploy 💖 ถ้าติดตรงไหนถาม Claude ได้
