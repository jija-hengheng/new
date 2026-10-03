import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const nm = n => !n ? "" : (n.startsWith("คุณ") ? n : "คุณ" + n);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ฟังข้อมูลสดจาก Firestore: state = คิวที่กำลังเรียก, waiting = คิวที่รอ (เรียงตามเลข)
export function watch(cb) {
  let state = null, waiting = [], called = 0;
  const err = e => { console.error(e); const b = document.getElementById("err"); if (b) { b.hidden = false; b.textContent = "เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจค่า config และ Rules"; } };
  onSnapshot(doc(db, "meta", "state"), s => { state = s.exists() ? s.data() : null; cb(state, waiting, called); }, err);
  onSnapshot(query(collection(db, "queue_items"), where("status", "==", "WAITING")), s => {
    waiting = s.docs.map(d => d.data()).sort((a, b) => a.queueNumber - b.queueNumber);
    cb(state, waiting, called);
  }, err);
}

export function speak(n, name) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(`ถึงคิวที่ ${n} ของ${nm(name)} ออเดอร์เสร็จแล้วครับ`);
  let p = {}; try { p = JSON.parse(localStorage.getItem("voicePref") || "{}"); } catch (e) {}
  u.lang = "th-TH"; u.rate = p.rate || 0.9; u.pitch = p.pitch || 1;
  const v = p.voice && speechSynthesis.getVoices().find(x => x.name === p.voice);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// เล่นแอนิเมชันเมื่อเลขเปลี่ยน
export function pop(el) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
