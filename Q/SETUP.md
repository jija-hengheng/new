# ตั้งค่าระบบคิว จิจะ เฮงเฮง (ทำครั้งเดียว)

1. console.firebase.google.com > สร้างโปรเจกต์ใหม่ (ไม่ต้องเปิด Hosting)
2. Build > Firestore Database > Create database
3. Build > Authentication > Get started > เปิด Email/Password
   > แท็บ Users > Add user: อีเมล `jijahengheng@gmail.com` + รหัสผ่านที่พนักงานจะพิมพ์ (6 ตัวขึ้นไป)
4. Firestore > แท็บ Rules > วางข้อความนี้แล้วกด Publish

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /queue_items/{id} { allow read: if true; allow write: if isAdmin(); }
    match /meta/{id}        { allow read: if true; allow write: if isAdmin(); }
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == 'jijahengheng@gmail.com';
    }
  }
}
```
5. Project settings (ไอคอนเฟือง) > Your apps > ไอคอน `</>` > คัดลอกค่า firebaseConfig ไปวางใน `config.js`
6. อัปโหลดโฟลเดอร์ `Q` ทั้งโฟลเดอร์ไปใน repo เว็บร้านบน GitHub แล้ว commit
7. ใส่ลิงก์ในเว็บร้านไป `/Q/`

## ลิงก์ใช้งาน
- ลูกค้า: `/Q/`  (ทำ QR code ติดหน้าร้าน)
- พนักงาน: `/Q/admin.html`
- จอร้าน: `/Q/tv.html` (กด "เปิดเสียง" หนึ่งครั้งตอนเริ่มวัน)

หมายเหตุ: เปิดไฟล์ผ่านเว็บ (GitHub Pages) เท่านั้น ดับเบิลคลิกเปิดไฟล์ตรง ๆ จะใช้ไม่ได้
