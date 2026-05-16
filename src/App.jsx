import { useState, useEffect, useMemo, useRef } from "react";

// ═══════════════════════════════════════════════════════
//  NUTTHANIT · 65KG TRACKER  —  rounded & friendly
// ═══════════════════════════════════════════════════════

// ─── THEME · dark navy / pink / green / blue ─────────────────────
const C = {
  bg:"#0e1320", bg2:"#151b2e", card:"#1b2238", cardHi:"#222a44",
  border:"#2c3552", borderHi:"#3d4870",
  cream:"#eef1fa", text:"#bcc4dd", muted:"#7682a3", faint:"#525d7d",
  pink:"#ff6b9d", pinkL:"#ff9ec0",
  green:"#4ade9b", greenL:"#7defc0",
  blue:"#52a9ff", blueL:"#8cc5ff",
  gold:"#ffc857", purple:"#a78bfa",
};
const F = { round:"'Nunito','Baloo 2',-apple-system,sans-serif" };

// ─── PLAN ────────────────────────────────────────────────────────
const PHASES = [
  { id:1, full:"PHASE 1 · BUILD",   start:"2026-05-16", end:"2026-05-28", cal:1450, protein:125, accent:C.pink,   note:"75→73 kg · ปรับตัว" },
  { id:2, full:"PHASE 2 · TRAVEL",  start:"2026-05-29", end:"2026-06-14", cal:1700, protein:100, accent:C.blue,   note:"73→71 kg · เมกา" },
  { id:3, full:"PHASE 3 · PUSH",    start:"2026-06-15", end:"2026-07-15", cal:1450, protein:125, accent:C.green,  note:"71→67.5 kg · หนักสุด" },
  { id:4, full:"PHASE 4 · FINISH",  start:"2026-07-16", end:"2026-08-31", cal:1440, protein:120, accent:C.gold,   note:"67.5→65 kg · ใกล้ 10K" },
];
const getPhase = (d) => PHASES.find(p => d >= p.start && d <= p.end) || PHASES[0];
const macroGoals = (cal, protein) => {
  const fat = Math.round((cal * 0.28) / 9);
  return { cal, protein, fat, carbs: Math.max(0, Math.round((cal - protein*4 - fat*9) / 4)) };
};
const GOAL_START = 75, GOAL_END = 65, GOAL_DATE = new Date("2026-08-31");
const TODAY = new Date().toISOString().split("T")[0];
const daysLeft = () => Math.max(0, Math.round((GOAL_DATE.getTime() - Date.now()) / 86400000));
const wdOf = (d) => new Date(d + "T12:00:00").getDay();

const DEFAULT_WPLAN = {
  1:{title:"จันทร์ · Easy Run + มวยไทย",focus:"Zone 2 — สร้าง aerobic base",loc:"JETT + Project H",items:[{id:"m1",text:"Easy Run 4 km · Zone 2",hr:"138–158"},{id:"m2",text:"Project H 1 ชม. footwork + combo"}]},
  2:{title:"อังคาร · Lower Body + มวยไทย",focus:"ขา · สะโพก · glute",loc:"JETT + Project H",items:[{id:"t1",text:"Leg Press / Curl / Hip Abd / Glute Kickback 3 เซ็ต"},{id:"t2",text:"Stairmaster 15 นาที"},{id:"t3",text:"Project H 1 ชม. เตะสูง"}]},
  3:{title:"พุธ · Interval ⭐ + มวยไทย",focus:"ดึง pace เร็วสุด — ห้ามข้าม",loc:"JETT + Project H",items:[{id:"w1",text:"Interval เร็ว 1' / เดิน 2' × 6–8",hr:"168–178"},{id:"w2",text:"Core 15 นาที"},{id:"w3",text:"Project H 1 ชม. เทคนิค"}]},
  4:{title:"พฤหัส · Upper Body + มวยไทย",focus:"หลัง · ไหล่ · V-shape",loc:"JETT + Project H",items:[{id:"h1",text:"Lat Pulldown / Cable Row / Shoulder Press / Tricep"},{id:"h2",text:"Rowing 18 นาที Zone 2"},{id:"h3",text:"Project H 1 ชม. หมัด combo"}]},
  5:{title:"ศุกร์ · Tempo Run + มวยไทย",focus:"Zone 3 — lactate threshold",loc:"JETT + Project H",items:[{id:"f1",text:"Tempo Run 20–30 นาที Zone 3",hr:"158–168"},{id:"f2",text:"Core 15 นาที"},{id:"f3",text:"Project H 1 ชม."}]},
  6:{title:"เสาร์ · Long Run ⭐⭐",focus:"เพิ่มระยะทุกสัปดาห์ — กุญแจสู่ 10K",loc:"สวนสาธารณะ",items:[{id:"s1",text:"P1: 4–5 km · P3: 6–7 km · P4: 8–9 km",hr:"138–168"},{id:"s2",text:"ดื่มน้ำทุก 15 นาที"}]},
  0:{title:"อาทิตย์ · Rest & Recovery",focus:"กล้ามโตตอนพัก — ห้ามออกหนัก",loc:"บ้าน",items:[{id:"u1",text:"เดินเบา 20 นาที"},{id:"u2",text:"ยืดเหยียด 15 นาที"}]},
};

// goal physique reference — เฟิร์น พิมพ์ชนก style: lean, toned, athletic-feminine
const GOAL_PHYSIQUE = {
  name:"หุ่นในฝัน — เฟิร์น พิมพ์ชนก",
  bodyFatPct:[19,23],      // lean but healthy feminine athletic
  visceralFat:[1,6],
  skeletalMuscleKeep:true,  // keep/build muscle, lose fat
  waistHip:[0.70,0.78],
  notes:"ลีน กระชับ มีกล้ามเนื้อพอประมาณ เอวคอด สะโพกได้รูป — เน้นลดไขมัน รักษามวลกล้าม",
};

// ─── DEVICE RECONCILIATION ───────────────────────────────────────
function reconcileRun(run) {
  const notes = [];
  let km = 0, kmSrc = "—";
  if (run.outdoor) {
    if (run.stravaKm != null) { km = run.stravaKm; kmSrc = "Strava GPS"; }
    else if (run.garminKm != null) { km = run.garminKm; kmSrc = "Garmin GPS"; }
  } else {
    if (run.treadmillKm != null) { km = run.treadmillKm; kmSrc = "ลู่วิ่ง"; }
    else if (run.garminKm != null) { km = run.garminKm; kmSrc = "Garmin"; }
  }
  const corrected = [];
  if (run.treadmillCal != null) { corrected.push(run.treadmillCal * 0.88); notes.push("ลู่ −12% · ลู่ประเมินแคลสูงเกินจริง"); }
  if (run.garminCal != null)    { corrected.push(run.garminCal * 1.10);    notes.push("Garmin +10% · นาฬิกาประเมินแคลต่ำตอนวิ่งช้า"); }
  if (run.stravaCal != null)    { corrected.push(run.stravaCal);            notes.push("Strava · ใช้เป็นค่ากลาง"); }
  const cal = corrected.length ? Math.round(corrected.reduce((a,b)=>a+b,0)/corrected.length) : 0;
  const band = Math.round(cal * (corrected.length > 1 ? 0.08 : 0.13));
  return { km, kmSrc, cal, band, notes };
}

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── UNIT CONVERSIONS ──────────────────────────────────────────
// แปลงหน่วยทั่วไป → กรัม (ของแข็ง) หรือ มล. (ของเหลว)
const UNIT_CONVERT = {
  "ฟอง":      {gPerUnit: 50},    // ไข่ไก่เบอร์ M = 50g (USDA)
  "ฟองL":     {gPerUnit: 56},    // ไข่ไก่เบอร์ L
  "ฟองM":     {gPerUnit: 50},    // ไข่ไก่เบอร์ M
  "ฟองS":     {gPerUnit: 43},    // ไข่ไก่เบอร์ S
  "ทัพพี":     {gPerUnit: 60},    // 1 ทัพพีข้าวสุก ≈ 60g (INMU)
  "ช้อนโต๊ะ":   {gPerUnit: 15},    // 1 tbsp ≈ 15g/ml
  "ช้อนชา":    {gPerUnit: 5},     // 1 tsp ≈ 5g/ml
  "ถ้วย":      {gPerUnit: 240},   // 1 cup ≈ 240ml
  "แก้ว":      {gPerUnit: 240},   // 1 glass ≈ 240ml
  "ใบ":       {gPerUnit: 0.5},   // 1 ใบสมุนไพร ≈ 0.5g (กะเพรา/โหระพา)
};

// ─── FOOD NUTRITION DATABASE ──────────────────────────────────────
// ค่าโภชนาการต่อ 100g (ของแข็ง) หรือ 100ml (ของเหลว)
// แหล่งอ้างอิง:
//   • USDA FoodData Central (fdc.nal.usda.gov) — มาตรฐานสากล
//   • INMU Thai Food Composition Database (มหาวิทยาลัยมหิดล) — มาตรฐานไทย
//   • Thai RDI ค่าอ้างอิงโภชนาการที่ควรได้รับประจำวัน (สำนักโภชนาการ กรมอนามัย)
const FOOD_DB = [
  // ━━ เนื้อสัตว์ & โปรตีน (USDA) ━━
  {k:["อกไก่","ไก่อก","chicken breast"],         n:"อกไก่ไม่ติดหนัง (ดิบ)",        cal:120, p:22.5, c:0,    f:2.6,  src:"USDA 05062"},
  {k:["อกไก่ย่าง","อกไก่สุก","grilled chicken"], n:"อกไก่ย่าง",                    cal:165, p:31,   c:0,    f:3.6,  src:"USDA 05064"},
  {k:["น่องไก่","สะโพกไก่","chicken thigh"],     n:"น่องไก่ติดหนัง",                cal:209, p:26,   c:0,    f:10.9, src:"USDA 05098"},
  {k:["ปีกไก่","chicken wing"],                  n:"ปีกไก่ติดหนัง",                 cal:222, p:23,   c:0,    f:14,   src:"USDA 05113"},
  {k:["หมูสับ","minced pork","ground pork"],     n:"หมูสับ",                       cal:263, p:16.9, c:0,    f:21.2, src:"USDA 10219"},
  {k:["หมูเนื้อแดง","หมูไม่ติดมัน","lean pork"], n:"หมูเนื้อแดง (สันใน)",         cal:143, p:21,   c:0,    f:5.9,  src:"USDA 10093"},
  {k:["หมูสามชั้น","pork belly"],                n:"หมูสามชั้น",                   cal:518, p:9.3,  c:0,    f:53,   src:"USDA 10123"},
  {k:["คอหมูย่าง","หมูคอ"],                      n:"คอหมูย่าง",                    cal:286, p:24,   c:0,    f:21,   src:"USDA 10093"},
  {k:["เนื้อวัว","beef","เนื้อ"],                n:"เนื้อวัวเนื้อแดง",              cal:250, p:26,   c:0,    f:15,   src:"USDA 13364"},
  {k:["เนื้อบด","minced beef"],                  n:"เนื้อบด",                      cal:254, p:17.2, c:0,    f:20,   src:"USDA 23566"},
  {k:["ปลาแซลมอน","salmon"],                     n:"แซลมอน",                       cal:208, p:20.4, c:0,    f:13.4, src:"USDA 15076"},
  {k:["ปลาทูน่ากระป๋อง","tuna can"],             n:"ทูน่ากระป๋อง (น้ำแร่)",        cal:116, p:25.5, c:0,    f:0.8,  src:"USDA 15121"},
  {k:["ปลาทูน่า","tuna","ทูน่าสด"],              n:"ทูน่าสด",                      cal:144, p:23.3, c:0,    f:4.9,  src:"USDA 15117"},
  {k:["ปลานิล","ปลาทับทิม","tilapia"],           n:"ปลานิล",                       cal:96,  p:20.1, c:0,    f:1.7,  src:"USDA 15261"},
  {k:["ปลาดอลลี่","ปลาสวาย","dory","basa"],      n:"ปลาดอลลี่/สวาย",                cal:78,  p:14,   c:0,    f:2.4,  src:"INMU"},
  {k:["ปลาทู","mackerel"],                       n:"ปลาทู",                        cal:189, p:18.6, c:0,    f:12,   src:"INMU"},
  {k:["กุ้ง","shrimp","prawn","กุ้งขาว"],        n:"กุ้ง",                         cal:99,  p:24,   c:0.2,  f:0.3,  src:"USDA 15149"},
  {k:["ปู","crab","เนื้อปู"],                    n:"เนื้อปู",                      cal:97,  p:19.4, c:0,    f:1.5,  src:"USDA 15140"},
  {k:["ปลาหมึก","หมึก","squid"],                 n:"ปลาหมึก",                      cal:92,  p:15.6, c:3.1,  f:1.4,  src:"USDA 15169"},
  {k:["ไข่ไก่","ไข่","egg"],                     n:"ไข่ไก่ทั้งฟอง",                 cal:155, p:12.6, c:1.1,  f:10.6, src:"USDA 01129"},
  {k:["ไข่ขาว","egg white"],                     n:"ไข่ขาว",                       cal:52,  p:10.9, c:0.7,  f:0.2,  src:"USDA 01124"},
  {k:["ไข่แดง","egg yolk"],                      n:"ไข่แดง",                       cal:322, p:15.9, c:3.6,  f:26.5, src:"USDA 01125"},
  {k:["เต้าหู้","tofu","เต้าหู้ขาว"],            n:"เต้าหู้ขาวอ่อน",                cal:76,  p:8.1,  c:1.9,  f:4.8,  src:"USDA 16127"},
  {k:["เต้าหู้แข็ง","firm tofu"],                n:"เต้าหู้แข็ง",                  cal:144, p:17.3, c:2.8,  f:8.7,  src:"USDA 16158"},

  // ━━ คาร์โบไฮเดรต (USDA + INMU) ━━
  {k:["ข้าวสวย","ข้าวขาว","ข้าวสุก","white rice","rice"], n:"ข้าวสวย (สุก)",       cal:130, p:2.7,  c:28.2, f:0.3,  src:"USDA 20444"},
  {k:["ข้าวกล้อง","brown rice"],                 n:"ข้าวกล้อง (สุก)",              cal:123, p:2.7,  c:25.6, f:1,    src:"USDA 20037"},
  {k:["ข้าวเหนียว","sticky rice"],               n:"ข้าวเหนียว (สุก)",             cal:97,  p:2,    c:21,   f:0.2,  src:"INMU"},
  {k:["ข้าวไรซ์เบอร์รี่","riceberry"],           n:"ข้าวไรซ์เบอร์รี่ (สุก)",       cal:111, p:2.4,  c:23.1, f:0.9,  src:"INMU"},
  {k:["ขนมปังขาว","white bread","ขนมปัง"],       n:"ขนมปังขาว",                    cal:265, p:9,    c:49,   f:3.2,  src:"USDA 18069"},
  {k:["ขนมปังโฮลวีท","whole wheat bread"],       n:"ขนมปังโฮลวีท",                 cal:247, p:13,   c:41,   f:3.4,  src:"USDA 18075"},
  {k:["บะหมี่","เส้นบะหมี่","egg noodle"],       n:"บะหมี่ (สุก)",                  cal:138, p:4.5,  c:25,   f:2.1,  src:"USDA 20109"},
  {k:["เส้นใหญ่","เส้นเล็ก","ก๋วยเตี๋ยว","rice noodle"], n:"เส้นก๋วยเตี๋ยว (สุก)", cal:109, p:0.9,  c:25,   f:0.2,  src:"USDA 20445"},
  {k:["พาสต้า","สปาเก็ตตี้","pasta","spaghetti"], n:"พาสต้า (สุก)",                cal:158, p:5.8,  c:30.9, f:0.9,  src:"USDA 20121"},
  {k:["มันฝรั่ง","potato"],                      n:"มันฝรั่ง (ต้ม)",                cal:87,  p:1.9,  c:20.1, f:0.1,  src:"USDA 11367"},
  {k:["มันหวาน","sweet potato","มันเทศ"],        n:"มันหวาน (ต้ม)",                cal:86,  p:1.6,  c:20.1, f:0.1,  src:"USDA 11507"},
  {k:["ข้าวโพด","corn"],                         n:"ข้าวโพด",                      cal:86,  p:3.3,  c:18.7, f:1.4,  src:"USDA 11167"},
  {k:["ข้าวโอ๊ต","oat","oatmeal","โอ๊ต"],        n:"ข้าวโอ๊ต (ดิบ)",                cal:389, p:16.9, c:66.3, f:6.9,  src:"USDA 08120"},
  {k:["ฟักทอง","pumpkin"],                       n:"ฟักทอง",                       cal:26,  p:1,    c:6.5,  f:0.1,  src:"USDA 11422"},

  // ━━ ผัก (USDA + INMU) ━━
  {k:["บร็อคโคลี่","broccoli"],                  n:"บร็อคโคลี่",                   cal:34,  p:2.8,  c:6.6,  f:0.4,  src:"USDA 11090"},
  {k:["กะหล่ำปลี","cabbage"],                    n:"กะหล่ำปลี",                    cal:25,  p:1.3,  c:5.8,  f:0.1,  src:"USDA 11109"},
  {k:["ผักโขม","ผักปวยเล้ง","spinach"],          n:"ผักโขม",                       cal:23,  p:2.9,  c:3.6,  f:0.4,  src:"USDA 11457"},
  {k:["ผักบุ้ง","morning glory"],                n:"ผักบุ้ง",                      cal:19,  p:2.6,  c:3.1,  f:0.2,  src:"INMU"},
  {k:["คะน้า","kale","chinese kale"],            n:"คะน้า",                        cal:35,  p:2.7,  c:6,    f:0.5,  src:"INMU"},
  {k:["มะเขือเทศ","tomato"],                     n:"มะเขือเทศ",                    cal:18,  p:0.9,  c:3.9,  f:0.2,  src:"USDA 11529"},
  {k:["แตงกวา","cucumber"],                      n:"แตงกวา",                       cal:15,  p:0.7,  c:3.6,  f:0.1,  src:"USDA 11205"},
  {k:["แครอท","carrot"],                         n:"แครอท",                        cal:41,  p:0.9,  c:9.6,  f:0.2,  src:"USDA 11124"},
  {k:["หอมใหญ่","หัวหอม","onion"],               n:"หอมใหญ่",                      cal:40,  p:1.1,  c:9.3,  f:0.1,  src:"USDA 11282"},
  {k:["กระเทียม","garlic"],                      n:"กระเทียม",                     cal:149, p:6.4,  c:33,   f:0.5,  src:"USDA 11215"},
  {k:["พริก","chili","พริกขี้หนู"],              n:"พริก",                         cal:40,  p:1.9,  c:8.8,  f:0.4,  src:"USDA 11819"},
  {k:["มะเขือยาว","eggplant"],                   n:"มะเขือยาว",                    cal:25,  p:1,    c:6,    f:0.2,  src:"USDA 11209"},
  {k:["เห็ด","mushroom","เห็ดฟาง"],              n:"เห็ด",                         cal:22,  p:3.1,  c:3.3,  f:0.3,  src:"USDA 11260"},
  {k:["ถั่วฝักยาว","yard long bean"],            n:"ถั่วฝักยาว",                   cal:47,  p:2.8,  c:8,    f:0.4,  src:"USDA 11201"},

  // ━━ ผลไม้ (USDA) ━━
  {k:["กล้วย","banana","กล้วยหอม"],              n:"กล้วยหอม",                     cal:89,  p:1.1,  c:22.8, f:0.3,  src:"USDA 09040"},
  {k:["แอปเปิ้ล","apple"],                       n:"แอปเปิ้ล",                     cal:52,  p:0.3,  c:13.8, f:0.2,  src:"USDA 09003"},
  {k:["ส้ม","orange"],                           n:"ส้ม",                          cal:47,  p:0.9,  c:11.8, f:0.1,  src:"USDA 09200"},
  {k:["มะม่วง","mango"],                         n:"มะม่วงสุก",                    cal:60,  p:0.8,  c:15,   f:0.4,  src:"USDA 09176"},
  {k:["มะละกอ","papaya"],                        n:"มะละกอสุก",                    cal:43,  p:0.5,  c:10.8, f:0.3,  src:"USDA 09226"},
  {k:["แตงโม","watermelon"],                     n:"แตงโม",                        cal:30,  p:0.6,  c:7.6,  f:0.2,  src:"USDA 09326"},
  {k:["สับปะรด","pineapple"],                    n:"สับปะรด",                      cal:50,  p:0.5,  c:13.1, f:0.1,  src:"USDA 09266"},
  {k:["องุ่น","grape"],                          n:"องุ่น",                        cal:69,  p:0.7,  c:18.1, f:0.2,  src:"USDA 09132"},
  {k:["สตรอเบอร์รี่","strawberry"],              n:"สตรอเบอร์รี่",                 cal:32,  p:0.7,  c:7.7,  f:0.3,  src:"USDA 09316"},
  {k:["บลูเบอร์รี่","blueberry"],                n:"บลูเบอร์รี่",                  cal:57,  p:0.7,  c:14.5, f:0.3,  src:"USDA 09050"},
  {k:["อะโวคาโด","avocado"],                     n:"อะโวคาโด",                     cal:160, p:2,    c:8.5,  f:14.7, src:"USDA 09037"},

  // ━━ ผลิตภัณฑ์นม (USDA + INMU) ━━
  {k:["นมจืด","นมวัว","นมสด","milk"],            n:"นมจืด (รสจืด)",                cal:42,  p:3.4,  c:5,    f:1,    src:"USDA 01077"}, // per 100 ml
  {k:["นมไม่มีไขมัน","นมพร่อง","skim milk"],     n:"นมพร่องไขมัน",                 cal:34,  p:3.4,  c:5,    f:0.1,  src:"USDA 01085"},
  {k:["นมอัลมอนด์","almond milk"],               n:"นมอัลมอนด์ (ไม่หวาน)",         cal:15,  p:0.6,  c:0.6,  f:1.2,  src:"USDA 14091"},
  {k:["นมถั่วเหลือง","soy milk"],                n:"นมถั่วเหลือง",                 cal:54,  p:3.3,  c:6.3,  f:1.8,  src:"USDA 16131"},
  {k:["โยเกิร์ต","yogurt","yoghurt"],            n:"โยเกิร์ตธรรมดา",               cal:59,  p:3.5,  c:4.7,  f:3.3,  src:"USDA 01116"},
  {k:["กรีกโยเกิร์ต","greek yogurt"],            n:"กรีกโยเกิร์ต (รสจืด)",         cal:59,  p:10,   c:3.6,  f:0.4,  src:"USDA 01256"},
  {k:["ชีส","cheese","ชีสเชดดาร์"],              n:"ชีสเชดดาร์",                   cal:402, p:25,   c:1.3,  f:33,   src:"USDA 01009"},
  {k:["เนย","butter"],                           n:"เนย",                          cal:717, p:0.9,  c:0.1,  f:81,   src:"USDA 01145"},

  // ━━ น้ำมัน & ไขมัน (USDA) ━━
  {k:["น้ำมันมะกอก","olive oil"],                n:"น้ำมันมะกอก",                  cal:884, p:0,    c:0,    f:100,  src:"USDA 04053"},
  {k:["น้ำมันพืช","น้ำมันถั่วเหลือง","oil"],     n:"น้ำมันพืช",                    cal:884, p:0,    c:0,    f:100,  src:"USDA 04044"},
  {k:["น้ำมันมะพร้าว","coconut oil"],            n:"น้ำมันมะพร้าว",                cal:892, p:0,    c:0,    f:99,   src:"USDA 04047"},
  {k:["อัลมอนด์","almond","อัลมอน"],             n:"อัลมอนด์",                     cal:579, p:21.2, c:21.6, f:49.9, src:"USDA 12061"},
  {k:["วอลนัท","walnut"],                        n:"วอลนัท",                       cal:654, p:15.2, c:13.7, f:65.2, src:"USDA 12155"},
  {k:["เม็ดมะม่วง","cashew"],                    n:"เม็ดมะม่วงหิมพานต์",            cal:553, p:18.2, c:30.2, f:43.9, src:"USDA 12087"},
  {k:["ถั่วลิสง","peanut"],                      n:"ถั่วลิสง",                     cal:567, p:25.8, c:16.1, f:49.2, src:"USDA 16087"},

  // ━━ เครื่องดื่ม (USDA) ━━
  {k:["น้ำเปล่า","water"],                       n:"น้ำเปล่า",                     cal:0,   p:0,    c:0,    f:0,    src:"USDA 14555"},
  {k:["กาแฟดำ","black coffee"],                  n:"กาแฟดำ (ไม่เติม)",             cal:2,   p:0.3,  c:0,    f:0,    src:"USDA 14209"},
  {k:["ชาเขียว","green tea"],                    n:"ชาเขียวไม่หวาน",                cal:1,   p:0,    c:0.2,  f:0,    src:"USDA 14278"},
  {k:["น้ำส้ม","orange juice"],                  n:"น้ำส้มคั้น",                   cal:45,  p:0.7,  c:10.4, f:0.2,  src:"USDA 09206"},
  {k:["โค้ก","coke","น้ำอัดลม","soda"],          n:"น้ำอัดลม",                     cal:42,  p:0,    c:10.6, f:0,    src:"USDA 14400"},
  {k:["เบียร์","beer"],                          n:"เบียร์",                       cal:43,  p:0.5,  c:3.6,  f:0,    src:"USDA 14003"},

  // ━━ อาหารไทย/จานเดียว (INMU per ~250-300g serving, normalized to 100g) ━━
  // ━━ สมุนไพรไทย / Thai herbs (INMU + USDA) ━━
  {k:["ใบกะเพรา","กะเพรา","holy basil","basil"],  n:"ใบกะเพรา",                     cal:23,  p:3.2,  c:2.7,  f:0.6,  src:"INMU"},
  {k:["ใบโหระพา","โหระพา","sweet basil"],          n:"ใบโหระพา",                     cal:23,  p:3.2,  c:2.7,  f:0.6,  src:"USDA 02044"},
  {k:["ใบสะระแหน่","สะระแหน่","mint"],            n:"ใบสะระแหน่",                   cal:44,  p:3.3,  c:8.4,  f:0.7,  src:"USDA 02064"},
  {k:["ผักชี","cilantro","coriander"],            n:"ผักชี",                        cal:23,  p:2.1,  c:3.7,  f:0.5,  src:"USDA 11165"},
  {k:["ผักชีฝรั่ง"],                              n:"ผักชีฝรั่ง",                   cal:36,  p:3.3,  c:6.3,  f:0.6,  src:"INMU"},
  {k:["ตะไคร้","lemongrass"],                     n:"ตะไคร้",                       cal:99,  p:1.8,  c:25,   f:0.5,  src:"USDA 11979"},
  {k:["ใบมะกรูด","kaffir lime leaf"],              n:"ใบมะกรูด",                     cal:46,  p:2.4,  c:10,   f:0.6,  src:"INMU"},
  {k:["ขิง","ginger"],                            n:"ขิงสด",                        cal:80,  p:1.8,  c:18,   f:0.8,  src:"USDA 11216"},
  {k:["ข่า","galangal"],                          n:"ข่า",                          cal:71,  p:1.1,  c:15,   f:0.7,  src:"INMU"},

  // ━━ คาร์บดิบ (ก่อนหุง) — เพิ่มให้ recipe ใช้สะดวก ━━
  {k:["ข้าวสาร","ข้าวขาวดิบ","raw white rice"],   n:"ข้าวสารขาว (ดิบ)",             cal:365, p:7.1,  c:80,   f:0.7,  src:"USDA 20444"},
  {k:["ข้าวกล้องสาร","ข้าวกล้องดิบ"],              n:"ข้าวกล้อง (ดิบ)",              cal:370, p:7.9,  c:77,   f:2.9,  src:"USDA 20036"},
  {k:["ถั่วลันเตา","green peas","ถั่วลันเตาแช่แข็ง"], n:"ถั่วลันเตา (แช่แข็ง)",      cal:77,  p:5.2,  c:13.7, f:0.4,  src:"USDA 11313"},
  {k:["ข้าวโพดเม็ด","corn kernel","ข้าวโพดแช่แข็ง"], n:"ข้าวโพดเม็ด",                cal:88,  p:3.3,  c:20,   f:1.3,  src:"USDA 11168"},
  {k:["แครอทหั่น","diced carrot"],                n:"แครอทหั่นเต๋า",                 cal:35,  p:0.8,  c:8.2,  f:0.2,  src:"USDA 11125"},

  // ━━ อาหารไทย/จานเดียว (INMU per 100g serving) ━━
  {k:["ผัดกะเพราหมู","ผัดกะเพราไก่","ผัดกะเพรา"], n:"ผัดกะเพราหมูสับ (สุก)",        cal:175, p:9,    c:14,   f:10,   src:"INMU"},
  {k:["ผัดไทย","pad thai"],                      n:"ผัดไทยกุ้งสด",                  cal:182, p:7.5,  c:25,   f:6,    src:"INMU"},
  {k:["ส้มตำ","papaya salad"],                   n:"ส้มตำไทย",                     cal:54,  p:1.5,  c:11,   f:0.7,  src:"INMU"},
  {k:["ต้มยำกุ้ง","tom yum"],                    n:"ต้มยำกุ้งน้ำใส",               cal:42,  p:5,    c:3,    f:1.5,  src:"INMU"},
  {k:["แกงเขียวหวาน","green curry"],             n:"แกงเขียวหวานไก่",              cal:135, p:6,    c:9,    f:9,    src:"INMU"},
  {k:["ข้าวมันไก่","khao man gai"],              n:"ข้าวมันไก่",                   cal:185, p:8,    c:22,   f:7,    src:"INMU"},
  {k:["ข้าวผัด","fried rice"],                   n:"ข้าวผัด",                      cal:175, p:5.5,  c:24,   f:6,    src:"INMU"},
  {k:["ก๋วยเตี๋ยวต้มยำ","ก๋วยเตี๋ยวน้ำใส"],     n:"ก๋วยเตี๋ยวน้ำใส",              cal:75,  p:4,    c:11,   f:1.8,  src:"INMU"},
];

// หาในฐานข้อมูล: เปรียบเทียบชื่อแบบ case-insensitive, fuzzy substring match
function lookupFood(name){
  const q = name.trim().toLowerCase();
  if(!q) return null;
  // 1) exact key match
  for(const item of FOOD_DB){
    if(item.k.some(k=>k.toLowerCase()===q)) return item;
  }
  // 2) substring match — query is in key OR key is in query
  for(const item of FOOD_DB){
    if(item.k.some(k=>{
      const kk=k.toLowerCase();
      return q.includes(kk)||kk.includes(q);
    })) return item;
  }
  return null;
}

// คำนวณสารอาหารจากชื่อ + ปริมาณ
function calcNutrition(name, amount, unit){
  const item = lookupFood(name);
  if(!item) return null;
  const factor = (amount||0) / 100;  // ค่าใน DB เป็นต่อ 100g/100ml
  return {
    cal:     Math.round(item.cal * factor),
    protein: Math.round(item.p   * factor * 10) / 10,
    carbs:   Math.round(item.c   * factor * 10) / 10,
    fat:     Math.round(item.f   * factor * 10) / 10,
    matched: item.n,
    src:     item.src,
  };
}

const LS = {
  get: (k, fb) => { try { return JSON.parse(localStorage.getItem(k)||"") ; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── HABIT / STARS SYSTEM ────────────────────────────────────────
// ระดับรางวัล Tier (สะสมดาวรวมตลอด journey 75→65 kg พ.ค.-ส.ค. 2026 ≈ 100 วัน × 5 ⭐ = 500 max)
const TIERS = [
  {min:0,   icon:"🌰", name:"Seed",       msg:"เริ่มต้นการเดินทาง 75→65"},
  {min:10,  icon:"🌱", name:"Sprout",     msg:"เริ่มต้นได้สวย!"},
  {min:25,  icon:"🔥", name:"On Fire",    msg:"ไฟแห่งความมุ่งมั่น"},
  {min:50,  icon:"💪", name:"Strong",     msg:"เริ่มเห็นผล กล้ามขึ้น"},
  {min:100, icon:"⚡", name:"Powerful",   msg:"ครึ่งทางแล้ว ตัวเบาขึ้น"},
  {min:200, icon:"🥇", name:"Champion",   msg:"ระดับนักกีฬา · เฟิร์น/พิมพ์ชนกใกล้แล้ว"},
  {min:350, icon:"💎", name:"Diamond",    msg:"แข็งแกร่งดั่งเพชร"},
  {min:500, icon:"👑", name:"Queen 65",   msg:"🎉 ชัยชนะ! คุณคือผู้พิชิต 65kg"},
];

const STREAK_MILESTONES = [
  {days:3,   icon:"🔥",  name:"Hot streak"},
  {days:7,   icon:"⚡",  name:"Week warrior"},
  {days:14,  icon:"💫",  name:"Two weeks!"},
  {days:30,  icon:"🌟",  name:"Monthly hero"},
  {days:60,  icon:"💎",  name:"Diamond mind"},
  {days:100, icon:"👑",  name:"Legend"},
];

function getTier(totalStars){
  let cur = TIERS[0], next = null;
  for(let i=0;i<TIERS.length;i++){
    if(totalStars>=TIERS[i].min) cur=TIERS[i];
    else { next=TIERS[i]; break; }
  }
  return {cur, next, progress: next? (totalStars-cur.min)/(next.min-cur.min) : 1};
}

function getStreakBadge(days){
  let earned = null;
  for(const m of STREAK_MILESTONES){
    if(days>=m.days) earned = m;
    else break;
  }
  const nextIdx = STREAK_MILESTONES.findIndex(m=>m.days>days);
  return {earned, next: nextIdx>=0?STREAK_MILESTONES[nextIdx]:null};
}

// คำนวณดาวที่ได้จากวันหนึ่ง — เกณฑ์ 5 หมวด ดวงละ 1 ดาว
//  1⭐ แคล: อยู่ใน ±15% ของเป้า (ไม่น้อย/มากเกินไป)
//  2⭐ โปรตีน: ถึง ≥90% ของเป้า
//  3⭐ ออกกำลังกาย: เช็คครบหรือมีบันทึก run/muay/checked >= 3 รายการ
//  4⭐ น้ำหนัก: บันทึกน้ำหนักวันนี้
//  5⭐ อาหารครบมื้อ: บันทึกอาหาร ≥ 3 รายการ
function calcStars(day, goals){
  if(!day||!goals) return {stars:0, total:5, details:[]};
  const eaten = (day.foods||[]).reduce((a,f)=>({cal:a.cal+f.cal,protein:a.protein+f.protein}),{cal:0,protein:0});
  const calPct = goals.cal>0 ? eaten.cal/goals.cal : 0;
  const protPct = goals.protein>0 ? eaten.protein/goals.protein : 0;
  const checked = Object.values(day.checked||{}).filter(Boolean).length;
  const hasRun = day.run && (day.run.distance>0 || day.run.duration>0);
  const hasMuay = day.muay && (day.muay.rounds>0 || day.muay.duration>0 || day.muay.cal>0);
  const hasClass = day.classes && day.classes.length>0 && day.classes.some(c=>c.cal>0||c.min>0);
  const exerciseDone = checked>=3 || hasRun || hasMuay || hasClass;
  const hasWeight = !!day.weight;
  const mealsLogged = (day.foods||[]).length;

  const details = [
    {id:"cal", icon:"🍽️", label:"แคลพอดี", got: calPct>=0.85 && calPct<=1.15, value:`${Math.round(calPct*100)}% ของเป้า`},
    {id:"protein", icon:"💪", label:"โปรตีนถึงเป้า", got: protPct>=0.9, value:`${Math.round(protPct*100)}% ของเป้า`},
    {id:"exercise", icon:"🏃‍♀️", label:"ออกกำลังกาย", got: exerciseDone, value: hasRun?"วิ่ง ✓":hasMuay?"มวย ✓":hasClass?"คลาส ✓":checked>=3?`เช็คครบ ${checked}`:`${checked}/3 รายการ`},
    {id:"weight", icon:"⚖️", label:"บันทึกน้ำหนัก", got: hasWeight, value: hasWeight?`${day.weight} kg`:"ยังไม่บันทึก"},
    {id:"meals", icon:"📋", label:"บันทึกอาหาร", got: mealsLogged>=3, value:`${mealsLogged}/3 รายการ`},
  ];
  return {stars: details.filter(d=>d.got).length, total:5, details};
}

// คำนวณ streak จาก logs ทั้งหมด
function calcStreak(logs, goalsBuilder){
  const dates = Object.keys(logs||{}).sort();
  if(!dates.length) return {current:0, best:0};
  let current=0, best=0, streak=0;
  const today = new Date().toISOString().slice(0,10);
  // คำนวณ streak ปัจจุบัน — นับจากวันนี้ย้อนกลับ
  let d = new Date();
  while(true){
    const k = d.toISOString().slice(0,10);
    const day = logs[k];
    if(!day) break;
    const goals = goalsBuilder(k);
    const {stars} = calcStars(day, goals);
    if(stars>=4){ current++; }
    else if(k===today){ /* วันนี้ยังไม่ครบ ไม่หัก */ }
    else break;
    d.setDate(d.getDate()-1);
    if(current>300) break; // safety
  }
  // คำนวณ best streak
  for(const k of dates){
    const day = logs[k];
    const goals = goalsBuilder(k);
    const {stars} = calcStars(day, goals);
    if(stars>=4){ streak++; if(streak>best) best=streak; }
    else streak=0;
  }
  return {current, best};
}

// คำนวณดาวสะสมรวมทั้งหมด
function calcTotalStars(logs, goalsBuilder){
  let total=0;
  for(const k of Object.keys(logs||{})){
    const day=logs[k];
    const goals=goalsBuilder(k);
    const {stars}=calcStars(day,goals);
    total+=stars;
  }
  return total;
}

// ─── SHARED UI ────────────────────────────────────────────────────
function Ring({ value, max, size=74, stroke=9, color, label, sub }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, pct=Math.max(0,Math.min(1,max>0?value/max:0)), over=value>max;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={over?C.pink:color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
            style={{transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:size*0.27,fontWeight:800,color:over?C.pink:C.cream,lineHeight:1}}>{Math.round(value)}</span>
          <span style={{fontSize:8.5,color:C.faint,fontWeight:700}}>/{max}</span>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:10,fontWeight:800,color:over?C.pink:color}}>{label}</div>
        <div style={{fontSize:9.5,color:C.faint,marginTop:1,fontWeight:600}}>{sub}</div>
      </div>
    </div>
  );
}

function Sec({ children, accent=C.gold }) {
  return <div style={{fontSize:15,fontWeight:800,color:accent,margin:"22px 0 11px",display:"flex",alignItems:"center",gap:7}}>{children}</div>;
}

function Modal({ close, title, children }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&close()} style={{position:"fixed",inset:0,background:"rgba(6,9,18,0.86)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:C.bg2,borderRadius:"24px 24px 0 0",border:`1px solid ${C.borderHi}`,width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:800,color:C.cream}}>{title}</span>
          <span onClick={close} style={{cursor:"pointer",color:C.muted,fontSize:24,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:C.card}}>×</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════
export default function Tracker() {
  const [tab, setTab]       = useState("today");
  const [logs, setLogs]     = useState(()=>LS.get("nt5_logs",{}));
  const [recipes, setRecipes] = useState(()=>LS.get("nt5_recipes",[]));
  const [date, setDate]     = useState(TODAY);
  // customPlan: { cal, protein, focus, extraItems[], appliedDate } — overrides PHASES when present
  const [customPlan, setCustomPlan] = useState(()=>LS.get("nt5_custom",null));
  // scans: array of past Evolt scan results + AI advice
  const [scans, setScans] = useState(()=>LS.get("nt5_scans",[]));

  useEffect(()=>LS.set("nt5_logs",logs),[logs]);
  useEffect(()=>LS.set("nt5_recipes",recipes),[recipes]);
  useEffect(()=>LS.set("nt5_custom",customPlan),[customPlan]);
  useEffect(()=>LS.set("nt5_scans",scans),[scans]);

  const day = logs[date] || { date, foods:[], checked:{}, extraExercises:[] };
  const basePhase = getPhase(date);
  const phase = customPlan ? { ...basePhase, cal: customPlan.cal, protein: customPlan.protein, note: customPlan.note || basePhase.note } : basePhase;
  const goals = macroGoals(phase.cal, phase.protein);
  const eaten = day.foods.reduce((a,f)=>({cal:a.cal+f.cal,protein:a.protein+f.protein,carbs:a.carbs+f.carbs,fat:a.fat+f.fat}),{cal:0,protein:0,carbs:0,fat:0});
  const remain = { cal:goals.cal-eaten.cal, protein:goals.protein-eaten.protein, carbs:goals.carbs-eaten.carbs, fat:goals.fat-eaten.fat };

  const patch = (fn) =>
    setLogs(p=>({...p,[date]:fn(p[date]||{date,foods:[],checked:{},extraExercises:[]})}));

  const basePlan = DEFAULT_WPLAN[wdOf(date)];
  const plan = customPlan?.extraItems?.length
    ? { ...basePlan, items: [...basePlan.items, ...customPlan.extraItems] }
    : basePlan;
  const runRec = day.run ? reconcileRun(day.run) : null;
  const exerciseCal = (runRec?.cal||0) + (day.muay?.cal||0) + (day.classes||[]).reduce((s,c)=>s+(c.cal||0),0);
  const tdee = day.daily?.tdee ?? null;

  // ─── Stars / Tier / Streak (memoized) ───
  const goalsFor = (k) => {
    const ph = getPhase(k);
    const p = customPlan ? { ...ph, cal: customPlan.cal, protein: customPlan.protein } : ph;
    return macroGoals(p.cal, p.protein);
  };
  const totalStars = useMemo(()=>calcTotalStars(logs, goalsFor),[logs, customPlan]);
  const streak = useMemo(()=>calcStreak(logs, goalsFor),[logs, customPlan]);
  const tier = getTier(totalStars);
  const streakBadge = getStreakBadge(streak.current);

  const card = {background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:16,marginBottom:12};
  const inp  = {background:C.bg2,border:`1.5px solid ${C.borderHi}`,borderRadius:13,color:C.cream,padding:"11px 13px",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",fontFamily:F.round,fontWeight:600};
  const lbl  = {fontSize:11,color:C.muted,fontWeight:800,marginBottom:7,display:"block"};
  const btn = (col=C.gold) => ({background:"transparent",border:`1.5px solid ${col}`,color:col,padding:"10px 18px",borderRadius:14,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:F.round});
  const btnF= (col=C.gold) => ({background:col,border:`1.5px solid ${col}`,color:C.bg,padding:"12px 18px",borderRadius:14,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:F.round,width:"100%"});

  const sx = { card, inp, lbl, btn, btnF };

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:F.round,fontWeight:600,paddingBottom:90,backgroundImage:`radial-gradient(circle at 85% -8%, ${phase.accent}22 0%, transparent 50%), radial-gradient(circle at 10% 105%, ${C.purple}14 0%, transparent 45%)`}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@400..800&display=swap');*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}input::placeholder{color:${C.faint};font-weight:600}textarea::placeholder{color:${C.faint}}::-webkit-scrollbar{width:0}button:active{transform:scale(.97)}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.7) brightness(1.4)}`}</style>

      <div style={{background:`linear-gradient(165deg,${C.bg2},${C.bg})`,borderBottom:`1px solid ${C.border}`,padding:"26px 16px 18px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-70,right:-50,width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${phase.accent}33 0%,transparent 70%)`}}/>
        <div style={{maxWidth:480,margin:"0 auto",position:"relative"}}>
          <div style={{fontSize:11,letterSpacing:1.5,color:C.muted,fontWeight:800,marginBottom:4}}>✨ NUTTHANIT · 65 KG BY AUGUST</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            <div style={{fontSize:44,fontWeight:900,color:C.cream,lineHeight:.95}}>65<span style={{fontSize:20,color:C.muted}}> kg</span></div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700}}>เหลืออีก</div>
              <div style={{fontSize:28,fontWeight:900,color:phase.accent,lineHeight:1}}>{daysLeft()} <span style={{fontSize:13,color:C.muted}}>วัน</span></div>
            </div>
          </div>
          <div style={{marginTop:11,display:"inline-block",padding:"5px 13px",borderRadius:20,fontSize:11,fontWeight:800,color:phase.accent,background:`${phase.accent}22`,border:`1px solid ${phase.accent}55`}}>{phase.full}</div>
          <span style={{fontSize:11,color:C.faint,marginLeft:8,fontWeight:600}}>{phase.note}</span>
          {customPlan&&<div style={{marginTop:8,fontSize:10.5,color:C.purple,fontWeight:800,display:"flex",alignItems:"center",gap:6}}>
            ✨ ใช้แพลนที่ปรับโดย AI จากผลสแกน <span onClick={()=>{if(confirm("ยกเลิกแพลนที่ปรับ กลับไปใช้แพลนเดิม?"))setCustomPlan(null);}} style={{color:C.muted,cursor:"pointer",textDecoration:"underline"}}>(ยกเลิก)</span>
          </div>}
        </div>
      </div>

      <div style={{display:"flex",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:30,maxWidth:480,margin:"0 auto",padding:"7px 8px",gap:5}}>
        {[["today","วันนี้","📊"],["food","อาหาร","🍱"],["exercise","ออกกำลัง","💪"],["progress","Progress","📈"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 2px",borderRadius:13,background:tab===id?`${phase.accent}22`:"transparent",border:tab===id?`1.5px solid ${phase.accent}66`:"1.5px solid transparent",cursor:"pointer",fontFamily:F.round,fontSize:11,fontWeight:tab===id?800:700,color:tab===id?phase.accent:C.faint,transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:15}}>{ic}</span>{lbl}
          </button>
        ))}
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"0 16px"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",margin:"14px 0 4px"}}>
          <input type="date" value={date} max={TODAY} onChange={e=>setDate(e.target.value)} style={{...inp,flex:1,fontSize:13}}/>
          {date!==TODAY&&<button onClick={()=>setDate(TODAY)} style={btn(phase.accent)}>วันนี้</button>}
        </div>

        {tab==="today"    && <TodayTab    day={day} goals={goals} eaten={eaten} remain={remain} phase={phase} plan={plan} patch={patch} sx={sx} recipes={recipes} totalStars={totalStars} tier={tier} streak={streak} streakBadge={streakBadge}/>}
        {tab==="food"     && <FoodTab     day={day} patch={patch} sx={sx} recipes={recipes} setRecipes={setRecipes} eaten={eaten} goals={goals}/>}
        {tab==="exercise" && <ExerciseTab day={day} patch={patch} sx={sx} plan={plan} runRec={runRec} exerciseCal={exerciseCal} tdee={tdee}/>}
        {tab==="progress" && <ProgressTab logs={logs} day={day} patch={patch} sx={sx} phase={phase} scans={scans} setScans={setScans} customPlan={customPlan} setCustomPlan={setCustomPlan} goalsFor={goalsFor} totalStars={totalStars} tier={tier} streak={streak} streakBadge={streakBadge}/>}
      </div>
    </div>
  );
}

// ═══════════════ TODAY ═══════════════
function TodayTab({day,goals,eaten,remain,phase,plan,patch,sx,recipes,totalStars,tier,streak,streakBadge}){
  const [photoModal,setPhotoModal]=useState(false);
  const [showStarDetail,setShowStarDetail]=useState(false);
  const starInfo = calcStars(day, goals);
  return <>
    {/* ─── TIER + STREAK BANNER ─── */}
    <div style={{...sx.card,padding:"14px 16px",margin:"0 0 12px",background:`linear-gradient(135deg,${C.purple}25,${C.gold}15)`,borderColor:`${C.gold}55`}}>
      <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:tier.next?9:0}}>
        <div style={{fontSize:32}}>{tier.cur.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:900,color:C.gold,letterSpacing:.3}}>{tier.cur.name}</div>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,marginTop:1}}>{tier.cur.msg}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:20,fontWeight:900,color:C.gold,fontFamily:F.round,lineHeight:1}}>{totalStars}<span style={{fontSize:11,color:C.faint,fontWeight:700}}>⭐</span></div>
          <div style={{fontSize:9,color:C.faint,fontWeight:700,marginTop:2}}>สะสม</div>
        </div>
      </div>
      {tier.next&&<div>
        <div style={{height:8,background:C.bg2,borderRadius:5,overflow:"hidden",border:`1px solid ${C.border}`}}>
          <div style={{width:`${Math.min(100,tier.progress*100)}%`,height:"100%",background:`linear-gradient(90deg,${C.gold},${C.pink})`,transition:"width .8s ease"}}/>
        </div>
        <div style={{fontSize:10,color:C.faint,fontWeight:700,marginTop:5,textAlign:"center"}}>อีก {tier.next.min - totalStars} ⭐ ถึง {tier.next.icon} {tier.next.name}</div>
      </div>}
      {/* Streak */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:11,paddingTop:11,borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:20}}>{streakBadge.earned?streakBadge.earned.icon:"🔥"}</span>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:streak.current>0?C.pink:C.faint,fontFamily:F.round}}>{streak.current} วัน</div>
            <div style={{fontSize:9.5,color:C.faint,fontWeight:700,marginTop:1}}>ติดต่อกัน{streakBadge.earned?` · ${streakBadge.earned.name}`:""}</div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:C.cream,fontWeight:800}}>Best: {streak.best} 🏆</div>
          {streakBadge.next&&<div style={{fontSize:9,color:C.faint,fontWeight:700,marginTop:1}}>อีก {streakBadge.next.days - streak.current} วัน → {streakBadge.next.icon}</div>}
        </div>
      </div>
    </div>

    {/* ─── STAR BAR วันนี้ ─── */}
    <div onClick={()=>setShowStarDetail(!showStarDetail)} style={{...sx.card,cursor:"pointer",background:`linear-gradient(135deg,${C.gold}15,${C.pink}10)`,borderColor:`${C.gold}55`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:starInfo.stars===5?6:0}}>
        <div>
          <div style={{fontSize:11,color:C.gold,fontWeight:800,letterSpacing:.5,marginBottom:3}}>⭐ ดาวประจำวันนี้</div>
          <div style={{fontSize:22,letterSpacing:2}}>{[1,2,3,4,5].map(i=>i<=starInfo.stars?"⭐":"⚪")}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,color:starInfo.stars===5?C.gold:C.cream,fontFamily:F.round,lineHeight:1}}>{starInfo.stars}<span style={{fontSize:14,color:C.faint,fontWeight:700}}>/5</span></div>
          <div style={{fontSize:9.5,color:C.faint,fontWeight:700,marginTop:3}}>{showStarDetail?"ปิดรายละเอียด":"แตะดูรายละเอียด"}</div>
        </div>
      </div>
      {starInfo.stars===5&&<div style={{fontSize:12,color:C.gold,fontWeight:800,textAlign:"center",marginTop:4}}>🎉 วันนี้ครบสมบูรณ์! สุดยอด!</div>}
      {showStarDetail&&<div style={{marginTop:11,paddingTop:11,borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
        {starInfo.details.map(d=>(
          <div key={d.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 11px",background:d.got?`${C.green}15`:C.bg2,borderRadius:10,border:`1px solid ${d.got?C.green+"55":C.border}`}}>
            <div style={{fontSize:18}}>{d.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:d.got?C.green:C.cream,fontWeight:800}}>{d.label}</div>
              <div style={{fontSize:10.5,color:C.faint,fontWeight:600,marginTop:1}}>{d.value}</div>
            </div>
            <div style={{fontSize:18,color:d.got?C.green:C.faint}}>{d.got?"⭐":"⚪"}</div>
          </div>
        ))}
      </div>}
    </div>

    <Sec accent={phase.accent}>🎯 โควต้าวันนี้</Sec>
    <div style={{...sx.card,background:`linear-gradient(155deg,${C.cardHi},${C.card})`}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:4}}>
        <Ring value={eaten.cal}     max={goals.cal}     color={C.gold}   label="แคล"    sub={`เหลือ ${Math.round(remain.cal)}`}/>
        <Ring value={eaten.protein} max={goals.protein} color={C.pink}   label="โปรตีน" sub={`${Math.round(remain.protein)}g`}/>
        <Ring value={eaten.carbs}   max={goals.carbs}   color={C.green}  label="คาร์บ"  sub={`${Math.round(remain.carbs)}g`}/>
        <Ring value={eaten.fat}     max={goals.fat}     color={C.blue}   label="ไขมัน"  sub={`${Math.round(remain.fat)}g`}/>
      </div>
      <div style={{marginTop:12,padding:"12px 14px",background:C.bg2,borderRadius:15,border:`1px solid ${C.border}`,fontSize:13,color:C.text,lineHeight:1.7}}>
        {remain.cal>0
          ? <>🍽️ เหลือกินได้อีก <b style={{color:C.gold}}>{Math.round(remain.cal)} kcal</b> · ควรเป็นโปรตีนอีก <b style={{color:C.pink}}>{Math.max(0,Math.round(remain.protein))}g</b> {remain.protein>0&&<span style={{color:C.faint}}>(≈ อกไก่ {Math.round(remain.protein/31*100)}g)</span>}</>
          : <span style={{color:C.pink}}>⚠️ เกินโควต้า {Math.abs(Math.round(remain.cal))} kcal — มื้อถัดไปเน้นโปรตีนล้วน/ผัก</span>}
      </div>
    </div>

    <Sec accent={C.pink}>🍱 บันทึกอาหาร</Sec>

    <QuickAdd patch={patch} sx={sx} recipes={recipes||[]}/>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
      <button onClick={()=>setPhotoModal(true)} style={{...sx.card,margin:0,cursor:"pointer",textAlign:"center",padding:"20px 10px",borderColor:`${C.pink}44`,background:`${C.pink}10`}}>
        <div style={{fontSize:30,marginBottom:6}}>📷</div>
        <div style={{fontSize:13,fontWeight:800,color:C.cream}}>ถ่ายรูปอาหาร</div>
        <div style={{fontSize:10,color:C.faint,marginTop:3,fontWeight:600}}>AI ประเมินแคล + สารอาหาร</div>
      </button>
      <div style={{...sx.card,margin:0,textAlign:"center",padding:"20px 10px",opacity:.55}}>
        <div style={{fontSize:30,marginBottom:6}}>📋</div>
        <div style={{fontSize:13,fontWeight:800,color:C.cream}}>กรอกเอง / Recipe</div>
        <div style={{fontSize:10,color:C.faint,marginTop:3,fontWeight:600}}>ดูที่แท็บ "อาหาร"</div>
      </div>
    </div>

    <div style={sx.card}>
      <span style={sx.lbl}>กินไปแล้ววันนี้ · {day.foods.length} รายการ</span>
      {day.foods.length===0&&<div style={{color:C.faint,fontSize:13,textAlign:"center",padding:"16px 0",fontWeight:600}}>ยังไม่มีรายการ 🍽️</div>}
      {day.foods.map((f)=>(
        <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13.5,color:C.cream,fontWeight:700}}>{f.src==="photo"?"📷 ":f.src==="recipe"?"🍱 ":""}{f.name}</div>
            <div style={{fontSize:10.5,color:C.faint,marginTop:2,fontWeight:600}}>P{f.protein.toFixed(0)} · C{f.carbs.toFixed(0)} · F{f.fat.toFixed(0)} · {f.time}</div>
          </div>
          <span style={{fontSize:18,fontWeight:900,color:C.gold}}>{Math.round(f.cal)}</span>
          <span onClick={()=>patch((d)=>({...d,foods:d.foods.filter(x=>x.id!==f.id)}))} style={{cursor:"pointer",color:C.pink,fontSize:18,paddingLeft:12,fontWeight:800}}>×</span>
        </div>
      ))}
    </div>

    <div style={sx.card}>
      <span style={sx.lbl}>⚖️ น้ำหนักเช้านี้</span>
      <WeightQ day={day} patch={patch} sx={sx}/>
    </div>

    <Sec accent={C.blue}>📅 ตารางวันนี้</Sec>
    <div style={{...sx.card,borderColor:`${C.blue}44`}}>
      <div style={{fontSize:15,fontWeight:800,color:C.cream}}>{plan.title}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:3,marginBottom:11,fontWeight:600}}>{plan.focus} · 📍 {plan.loc}</div>
      {plan.items.map((it)=>{
        const done=!!day.checked[it.id];
        return <div key={it.id} onClick={()=>patch((d)=>({...d,checked:{...d.checked,[it.id]:!d.checked[it.id]}}))}
          style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:20,height:20,borderRadius:7,flexShrink:0,marginTop:1,border:`2px solid ${done?C.green:C.borderHi}`,background:done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontSize:12,fontWeight:900}}>{done?"✓":""}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12.5,color:done?C.faint:C.text,textDecoration:done?"line-through":"none",fontWeight:700}}>{it.text}</div>
            {it.hr&&<div style={{fontSize:10.5,color:C.pink,marginTop:2,fontWeight:700}}>💓 HR {it.hr} bpm</div>}
          </div>
        </div>;
      })}
    </div>

    {photoModal&&<PhotoModal close={()=>setPhotoModal(false)} patch={patch} sx={sx}/>}
  </>;
}

function WeightQ({day,patch,sx}){
  const [v,setV]=useState("");
  return <div style={{display:"flex",gap:8,alignItems:"center"}}>
    {day.weight&&<div style={{fontSize:30,fontWeight:900,color:C.cream,lineHeight:1,flexShrink:0}}>{day.weight}<span style={{fontSize:14,color:C.muted}}> kg</span></div>}
    <input style={{...sx.inp,flex:1}} type="number" step="0.1" placeholder={day.weight?"แก้ไข":"กรอก kg (เช้า หลังห้องน้ำ)"} value={v} onChange={e=>setV(e.target.value)}/>
    <button style={sx.btn(C.green)} onClick={()=>{const w=parseFloat(v);if(w>=30&&w<=200){patch((d)=>({...d,weight:w}));setV("");}}}>บันทึก</button>
  </div>;
}

function PhotoModal({close,patch,sx}){
  const [img,setImg]=useState(null);
  const [b64,setB64]=useState(null);
  const [hint,setHint]=useState("");
  const [loading,setLoading]=useState(false);
  const [res,setRes]=useState(null);
  const [err,setErr]=useState("");
  const ref=useRef(null);

  const onFile=(e)=>{
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>{const d=r.result;setImg(d);setB64(d.split(",")[1]);setRes(null);setErr("");};r.readAsDataURL(f);
  };

  const analyze=async()=>{
    setErr("");setRes(null);

    // ถ้ามีรูป → ส่งให้ AI วิเคราะห์รูป (ใช้ API)
    if(b64&&img){
      setLoading(true);
      try{
        const mt=img.substring(img.indexOf(":")+1,img.indexOf(";"));
        const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:800,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mt,data:b64}},
            {type:"text",text:`วิเคราะห์อาหารในรูปนี้${hint?`\nข้อมูลที่ผู้ใช้ทราบ (เชื่อเป็นหลัก): ${hint}`:""}\nตอบ JSON เท่านั้น ไม่มี markdown:\n{"name":"ชื่ออาหารภาษาไทย","cal":number,"protein":number,"carbs":number,"fat":number,"reasoning":"อธิบาย 1-2 ประโยค"}`}
          ]}]
        })});
        const data=await r.json();
        if(data.error)throw new Error(data.error.message||JSON.stringify(data.error).slice(0,100));
        const txt=(data.content||[]).map(c=>c.text||"").join("");
        const m=txt.match(/\{[\s\S]*\}/);
        if(!m)throw new Error("AI ตอบไม่ใช่ JSON");
        const p=JSON.parse(m[0]);
        setRes({name:p.name,cal:+p.cal,protein:+p.protein,carbs:+p.carbs,fat:+p.fat,reasoning:p.reasoning||"วิเคราะห์โดย AI จากรูป"});
      }catch(e){setErr("วิเคราะห์รูปไม่สำเร็จ: "+(e.message||e)+" · ลองกรอกข้อมูลในช่องด้านล่างแทน");}
      finally{setLoading(false);}
      return;
    }

    // ไม่มีรูป → ใช้ database lookup จาก hint text
    if(!hint||!hint.trim()){setErr("กรุณาถ่ายรูป หรือพิมพ์รายละเอียดอาหารในช่องด้านล่าง · เช่น 'อกไก่ 150g, ข้าวกล้อง 100g'");return;}
    const parts = hint.split(/[,+\n]/).map(s=>s.trim()).filter(Boolean);
    const matched=[]; const notFound=[];
    for(const part of parts){
      const m = part.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*(g|ml|กรัม|มล)?$/i);
      if(!m){notFound.push(part);continue;}
      const itemName = m[1].trim();
      const amt = parseFloat(m[2]);
      const unit = (m[3]||"g").toLowerCase().replace("กรัม","g").replace("มล","ml");
      const r = calcNutrition(itemName, amt, unit);
      if(!r){notFound.push(`${itemName} ${amt}${unit}`);continue;}
      matched.push({...r,amount:amt,unit,raw:part});
    }
    if(!matched.length){
      setErr(`ไม่พบในฐานข้อมูล: ${notFound.join(", ")} · ลองพิมพ์ชื่อหลัก เช่น "อกไก่ 150g"`);
      return;
    }
    const sum = matched.reduce((s,r)=>({cal:s.cal+r.cal,p:s.p+r.protein,c:s.c+r.carbs,f:s.f+r.fat}),{cal:0,p:0,c:0,f:0});
    setRes({
      name: matched.map(r=>`${r.matched} ${r.amount}${r.unit}`).join(" + "),
      cal: sum.cal, protein: Math.round(sum.p*10)/10, carbs: Math.round(sum.c*10)/10, fat: Math.round(sum.f*10)/10,
      reasoning: `รวม ${matched.length} รายการจากฐานข้อมูล USDA/INMU${notFound.length?` · ไม่พบ: ${notFound.join(", ")}`:""}`,
    });
  };

  const add=()=>{
    if(!res)return;
    patch((d)=>({...d,foods:[...d.foods,{id:uid(),name:res.name,cal:res.cal,protein:res.protein,carbs:res.carbs,fat:res.fat,src:"photo",time:new Date().toTimeString().slice(0,5)}]}));
    close();
  };

  return <Modal close={close} title="📷 ถ่ายรูปอาหาร">
    <input ref={ref} type="file" accept="image/*" capture="environment" onChange={onFile} style={{display:"none"}}/>
    {!img
      ?<div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${C.borderHi}`,borderRadius:18,padding:"38px 16px",textAlign:"center",cursor:"pointer"}}>
        <div style={{fontSize:42,marginBottom:8}}>📸</div>
        <div style={{fontSize:14,color:C.cream,fontWeight:800}}>แตะเพื่อถ่ายรูป / เลือกรูป</div>
      </div>
      :<img src={img} alt="food" style={{width:"100%",borderRadius:18,maxHeight:220,objectFit:"cover",cursor:"pointer"}} onClick={()=>ref.current?.click()}/>}

    <div style={{marginTop:14}}>
      <span style={sx.lbl}>ข้อมูลที่ชั่ง/ตวงเอง (ช่วยให้แม่นขึ้น)</span>
      <textarea value={hint} onChange={e=>setHint(e.target.value)} placeholder="เช่น: อกไก่ 150g, ข้าวกล้อง 100g สุก, น้ำมันมะกอก 1 ช้อนชา" style={{...sx.inp,minHeight:62,resize:"vertical"}}/>
    </div>

    {img&&!res&&<button onClick={analyze} disabled={loading} style={{...sx.btnF(C.pink),marginTop:14,opacity:loading?.6:1}}>{loading?"กำลังวิเคราะห์… ✨":"✨ ให้ AI ประเมินสารอาหาร"}</button>}
    {err&&<div style={{color:C.pink,fontSize:12,marginTop:8,textAlign:"center",fontWeight:700}}>{err}</div>}

    {res&&<div style={{marginTop:14,background:C.bg2,border:`1.5px solid ${C.gold}66`,borderRadius:18,padding:16}}>
      <div style={{fontSize:15,fontWeight:800,color:C.cream}}>{res.name}</div>
      <div style={{display:"flex",gap:14,margin:"10px 0",alignItems:"baseline"}}>
        <span style={{fontSize:28,fontWeight:900,color:C.gold}}>{Math.round(res.cal)}<span style={{fontSize:11,color:C.muted}}> kcal</span></span>
        <span style={{fontSize:12,color:C.text,fontWeight:700}}>P<b style={{color:C.pink}}>{res.protein.toFixed(0)}g</b> · C<b style={{color:C.green}}>{res.carbs.toFixed(0)}g</b> · F<b style={{color:C.blue}}>{res.fat.toFixed(0)}g</b></span>
      </div>
      <div style={{fontSize:11.5,color:C.muted,lineHeight:1.6,borderLeft:`3px solid ${C.gold}`,paddingLeft:10,fontWeight:600}}>{res.reasoning}</div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={()=>setRes(null)} style={{...sx.btn(C.muted),flex:1}}>วิเคราะห์ใหม่</button>
        <button onClick={add} style={{...sx.btnF(C.green),flex:2}}>+ เพิ่มเข้าวันนี้</button>
      </div>
    </div>}
  </Modal>;
}

// ═══════════════ FOOD TAB ═══════════════
function FoodTab({day,patch,sx,recipes,setRecipes,eaten,goals}){
  const [mode,setMode]=useState("log");
  const [rm,setRm]=useState(false);
  const [mm,setMm]=useState(false);
  return <>
    <div style={{...sx.card,display:"flex",justifyContent:"space-around",textAlign:"center",padding:"14px 8px"}}>
      {[["แคล",eaten.cal,goals.cal,C.gold],["P",eaten.protein,goals.protein,C.pink],["C",eaten.carbs,goals.carbs,C.green],["F",eaten.fat,goals.fat,C.blue]].map(([l,v,m,c])=>(
        <div key={l}><div style={{fontSize:20,fontWeight:900,color:v>m?C.pink:c}}>{Math.round(v)}</div><div style={{fontSize:9.5,color:C.faint,fontWeight:700}}>{l}/{m}</div></div>
      ))}
    </div>

    <div style={{display:"flex",gap:8,marginBottom:12}}>
      {[["log","📋 บันทึกรายการ"],["recipes","🍱 เมนูของฉัน"]].map(([m,t])=>(
        <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"11px",borderRadius:14,fontSize:12.5,fontWeight:800,cursor:"pointer",fontFamily:F.round,border:`1.5px solid ${mode===m?C.gold:C.border}`,color:mode===m?C.gold:C.muted,background:mode===m?`${C.gold}1a`:"transparent"}}>{t}</button>
      ))}
    </div>

    {mode==="log"?<>
      <button onClick={()=>setMm(true)} style={{...sx.btnF(C.pink),marginBottom:12}}>+ เพิ่มวัตถุดิบ / รายการอาหาร</button>
      {recipes.length>0&&<div style={sx.card}>
        <span style={sx.lbl}>⚡ คลิกเดียวจากเมนูที่บันทึกไว้</span>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {recipes.map((r)=>(
            <button key={r.id} onClick={()=>patch((d)=>({...d,foods:[...d.foods,{id:uid(),name:r.name,cal:r.cal,protein:r.protein,carbs:r.carbs,fat:r.fat,src:"recipe",time:new Date().toTimeString().slice(0,5)}]}))}
              style={{background:C.bg2,border:`1.5px solid ${C.borderHi}`,borderRadius:20,padding:"7px 13px",fontSize:12,color:C.cream,cursor:"pointer",fontFamily:F.round,fontWeight:700}}>
              {r.emoji} {r.name} <span style={{color:C.gold,fontWeight:900}}>{r.cal}</span>
            </button>
          ))}
        </div>
      </div>}
      <div style={sx.card}>
        <span style={sx.lbl}>รายการวันนี้</span>
        {day.foods.length===0&&<div style={{color:C.faint,fontSize:13,textAlign:"center",padding:"16px 0",fontWeight:600}}>ยังไม่มีรายการ</div>}
        {day.foods.map((f)=>(
          <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5,color:C.cream,fontWeight:700}}>{f.src==="recipe"?"🍱 ":f.src==="photo"?"📷 ":""}{f.name}</div>
              <div style={{fontSize:10.5,color:C.faint,marginTop:2,fontWeight:600}}>P{f.protein.toFixed(0)} · C{f.carbs.toFixed(0)} · F{f.fat.toFixed(0)} · {f.time}</div>
            </div>
            <span style={{fontSize:18,fontWeight:900,color:C.gold}}>{Math.round(f.cal)}</span>
            <span onClick={()=>patch((d)=>({...d,foods:d.foods.filter(x=>x.id!==f.id)}))} style={{cursor:"pointer",color:C.pink,fontSize:18,paddingLeft:12,fontWeight:800}}>×</span>
          </div>
        ))}
      </div>
    </>:<>
      <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.6,fontWeight:600}}>สร้างเมนูที่ทำกินบ่อยๆ เช่น "กุ้ง + ข้าว" — บันทึกครั้งเดียว ใช้ซ้ำได้คลิกเดียว ✨</div>
      <button onClick={()=>setRm(true)} style={{...sx.btnF(C.green),marginBottom:12}}>+ สร้างเมนูใหม่</button>
      {recipes.length===0&&<div style={{color:C.faint,fontSize:13,textAlign:"center",padding:"24px 0",fontWeight:600}}>ยังไม่มีเมนูที่บันทึก 🍱</div>}
      {recipes.map((r)=>(
        <div key={r.id} style={{...sx.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14.5,fontWeight:800,color:C.cream}}>{r.emoji} {r.name}</div><div style={{fontSize:10.5,color:C.faint,marginTop:3,fontWeight:600}}>P{r.protein.toFixed(0)}g · C{r.carbs.toFixed(0)}g · F{r.fat.toFixed(0)}g</div></div>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <span style={{fontSize:21,fontWeight:900,color:C.gold}}>{r.cal}</span>
            <span onClick={()=>setRecipes((rs)=>rs.filter(x=>x.id!==r.id))} style={{cursor:"pointer",color:C.pink,fontSize:13,fontWeight:800}}>ลบ</span>
          </div>
        </div>
      ))}
    </>}

    {mm&&<ManualModal close={()=>setMm(false)} patch={patch} sx={sx}/>}
    {rm&&<RecipeModal close={()=>setRm(false)} setRecipes={setRecipes} sx={sx}/>}
  </>;
}

// Quick-add inline on TodayTab: name + amount + unit → AI → instant add
function QuickAdd({patch,sx,recipes}){
  const [mode,setMode]=useState("db");  // "db" or "recipe"
  const [name,setName]=useState("");
  const [amount,setAmount]=useState("");
  const [unit,setUnit]=useState("g");
  const [state,setState]=useState("raw"); // ดิบ/สุก
  const [recipeId,setRecipeId]=useState("");
  const [recipeAmt,setRecipeAmt]=useState("");
  const [err,setErr]=useState("");
  const [ok,setOk]=useState(false);

  const stateFactor={"ข้าว":2.5,"พาสต้า":2.4,"บะหมี่":2.2,"โอ๊ต":2.0,"เนื้อ":0.75,"ไก่":0.75,"หมู":0.75,"ปลา":0.85,"กุ้ง":0.85};
  const findFactor=(n)=>{for(const k of Object.keys(stateFactor)){if(n.includes(k))return stateFactor[k];}return 1;};

  const addFromDB=()=>{
    if(!name.trim()||!amount)return;
    setErr("");setOk(false);
    const item = lookupFood(name);
    if(!item){setErr(`ไม่พบ "${name}" ในฐานข้อมูล · ลองพิมพ์ชื่อหลัก เช่น "อกไก่", "ใบกะเพรา", "ไข่ไก่"`);return;}
    // แปลงหน่วยพิเศษ → กรัม
    let amtInG = +amount;
    if(UNIT_CONVERT[unit]) amtInG = +amount * UNIT_CONVERT[unit].gPerUnit;
    // ปรับ ดิบ/สุก
    const dbIsRaw = !item.n.includes("สุก")&&!item.n.includes("ย่าง")&&!item.n.includes("ต้ม")&&!item.n.includes("ดาว")&&!item.n.includes("เจียว");
    let amtForCalc = amtInG;
    if(state==="cooked"&&dbIsRaw) amtForCalc = amtInG / findFactor(item.n);
    else if(state==="raw"&&!dbIsRaw) amtForCalc = amtInG * findFactor(item.n);
    const factor = amtForCalc / 100;
    patch((d)=>({...d,foods:[...d.foods,{
      id:uid(),
      name:`${item.n} ${amount}${unit}${state==="cooked"?" สุก":""}`,
      cal:Math.round(item.cal*factor),
      protein:Math.round(item.p*factor*10)/10,
      carbs:Math.round(item.c*factor*10)/10,
      fat:Math.round(item.f*factor*10)/10,
      src:"ingredient", time:new Date().toTimeString().slice(0,5),
    }]}));
    setName("");setAmount("");setOk(true);
    setTimeout(()=>setOk(false),1800);
  };

  const addFromRecipe=()=>{
    if(!recipeId||!recipeAmt)return;
    setErr("");setOk(false);
    const r = recipes.find(x=>x.id===recipeId);
    if(!r){setErr("ไม่พบเมนูที่เลือก");return;}
    const g = +recipeAmt;
    let cal, p, c, f;
    if(r.perGram){
      cal = Math.round(r.perGram.cal * g);
      p = Math.round(r.perGram.p * g * 10) / 10;
      c = Math.round(r.perGram.c * g * 10) / 10;
      f = Math.round(r.perGram.f * g * 10) / 10;
    }else{
      // recipe เก่าไม่มี perGram → ใช้ค่ารวมเฉยๆ (1 portion)
      cal = r.cal; p = r.protein; c = r.carbs; f = r.fat;
    }
    patch((d)=>({...d,foods:[...d.foods,{
      id:uid(),
      name:`${r.emoji||"🍱"} ${r.name}${r.perGram?` ${g}g`:""}`,
      cal, protein:p, carbs:c, fat:f,
      src:"recipe", time:new Date().toTimeString().slice(0,5),
    }]}));
    setRecipeId("");setRecipeAmt("");setOk(true);
    setTimeout(()=>setOk(false),1800);
  };

  return <div style={{...sx.card,borderColor:`${C.green}44`,background:`${C.green}0a`}}>
    <span style={{...sx.lbl,color:C.green}}>⚡ กรอกเร็ว</span>
    {/* Mode toggle */}
    <div style={{display:"flex",gap:6,marginBottom:9}}>
      <button onClick={()=>{setMode("db");setErr("");}} style={{flex:1,padding:"9px 0",borderRadius:11,border:`1.5px solid ${mode==="db"?C.green:C.border}`,background:mode==="db"?`${C.green}22`:"transparent",color:mode==="db"?C.green:C.muted,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:F.round}}>🥦 วัตถุดิบ</button>
      <button onClick={()=>{setMode("recipe");setErr("");}} disabled={recipes.length===0} style={{flex:1,padding:"9px 0",borderRadius:11,border:`1.5px solid ${mode==="recipe"?C.gold:C.border}`,background:mode==="recipe"?`${C.gold}22`:"transparent",color:mode==="recipe"?C.gold:recipes.length===0?C.faint:C.muted,fontSize:12,fontWeight:800,cursor:recipes.length===0?"not-allowed":"pointer",fontFamily:F.round,opacity:recipes.length===0?.5:1}}>🍱 จาก Recipe ({recipes.length})</button>
    </div>

    {mode==="db"?<>
      <input style={sx.inp} placeholder="ชื่อ เช่น อกไก่, ใบกะเพรา, ไข่ไก่" value={name} onChange={e=>setName(e.target.value)}/>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <input style={{...sx.inp,flex:1}} type="number" inputMode="decimal" placeholder="150" value={amount} onChange={e=>setAmount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFromDB()}/>
        <select style={{...sx.inp,flex:1.2}} value={unit} onChange={e=>setUnit(e.target.value)}>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="ฟอง">ฟอง (50g)</option>
          <option value="ฟองL">ฟอง L (56g)</option>
          <option value="ทัพพี">ทัพพี (60g)</option>
          <option value="ช้อนโต๊ะ">ช้อนโต๊ะ</option>
          <option value="ช้อนชา">ช้อนชา</option>
          <option value="ใบ">ใบ</option>
        </select>
      </div>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <button onClick={()=>setState("raw")} style={{flex:1,padding:"9px 0",borderRadius:11,border:`1.5px solid ${state==="raw"?C.gold:C.border}`,background:state==="raw"?`${C.gold}22`:"transparent",color:state==="raw"?C.gold:C.muted,fontSize:11.5,fontWeight:800,cursor:"pointer",fontFamily:F.round}}>🥩 ดิบ</button>
        <button onClick={()=>setState("cooked")} style={{flex:1,padding:"9px 0",borderRadius:11,border:`1.5px solid ${state==="cooked"?C.green:C.border}`,background:state==="cooked"?`${C.green}22`:"transparent",color:state==="cooked"?C.green:C.muted,fontSize:11.5,fontWeight:800,cursor:"pointer",fontFamily:F.round}}>🍳 สุก</button>
      </div>
      <button onClick={addFromDB} disabled={!name.trim()||!amount} style={{...sx.btnF(C.green),marginTop:9,opacity:!name.trim()||!amount?.5:1}}>{ok?"✓ เพิ่มแล้ว!":"✨ คำนวณ + เพิ่ม"}</button>
    </>:<>
      <select style={sx.inp} value={recipeId} onChange={e=>setRecipeId(e.target.value)}>
        <option value="">— เลือกเมนู —</option>
        {recipes.map(r=>(<option key={r.id} value={r.id}>{r.emoji||"🍱"} {r.name}{r.perGram?` (${Math.round(r.perGram.cal*100)/100} kcal/g)`:""}</option>))}
      </select>
      <input style={{...sx.inp,marginTop:8}} type="number" inputMode="decimal" placeholder="ตักกินกี่กรัม? เช่น 100" value={recipeAmt} onChange={e=>setRecipeAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFromRecipe()}/>
      {recipeId&&recipeAmt&&(()=>{
        const r=recipes.find(x=>x.id===recipeId);
        if(!r||!r.perGram)return null;
        return <div style={{fontSize:11.5,color:C.gold,fontWeight:800,marginTop:6,padding:"7px 11px",background:`${C.gold}15`,borderRadius:9}}>= {Math.round(r.perGram.cal*+recipeAmt)} kcal · P {Math.round(r.perGram.p*+recipeAmt*10)/10}g</div>;
      })()}
      <button onClick={addFromRecipe} disabled={!recipeId||!recipeAmt} style={{...sx.btnF(C.gold),marginTop:9,opacity:!recipeId||!recipeAmt?.5:1}}>{ok?"✓ เพิ่มแล้ว!":"✨ เบิกจาก Recipe + เพิ่ม"}</button>
    </>}

    {err&&<div style={{color:C.pink,fontSize:11,fontWeight:700,marginTop:7,padding:"9px 11px",background:`${C.pink}15`,borderRadius:9,lineHeight:1.5}}>⚠️ {err}</div>}
  </div>;
}

function ManualModal({close,patch,sx}){
  const [f,setF]=useState({name:"",amount:"",unit:"g",cal:"",protein:"",carbs:"",fat:""});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [aiDone,setAiDone]=useState(false);

  const askAI=async()=>{
    if(!f.name.trim()||!f.amount)return;
    setErr("");setAiDone(false);
    const result = calcNutrition(f.name, +f.amount, f.unit);
    if(!result){
      setErr(`ไม่พบ "${f.name}" ในฐานข้อมูล · ลองพิมพ์เป็นชื่อหลัก เช่น "อกไก่", "ข้าวสวย", "ไข่ไก่" หรือกรอกค่าเองด้านล่าง`);
      return;
    }
    setF(prev=>({...prev,name:result.matched,cal:String(result.cal),protein:String(result.protein),carbs:String(result.carbs),fat:String(result.fat)}));
    setAiDone(true);
  };

  const save=()=>{
    if(!f.name||!f.cal)return;
    const fullName=f.amount?`${f.name} ${f.amount}${f.unit}`:f.name;
    patch((d)=>({...d,foods:[...d.foods,{id:uid(),name:fullName,cal:+f.cal,protein:+f.protein||0,carbs:+f.carbs||0,fat:+f.fat||0,src:"ingredient",time:new Date().toTimeString().slice(0,5)}]}));
    close();
  };

  return <Modal close={close} title="📋 เพิ่มวัตถุดิบ">
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div>
        <span style={sx.lbl}>ชื่ออาหาร / วัตถุดิบ</span>
        <input style={sx.inp} placeholder="เช่น อกไก่ย่าง, นมจืด, ข้าวกล้องสุก" value={f.name} onChange={e=>{setF(p=>({...p,name:e.target.value}));setAiDone(false);}}/>
      </div>
      <div>
        <span style={sx.lbl}>ปริมาณ (กรอกแล้วกด ✨ ระบบเปิดดูสารอาหารให้)</span>
        <div style={{display:"flex",gap:7}}>
          <input style={{...sx.inp,flex:1}} type="number" placeholder="150" value={f.amount} onChange={e=>{setF(p=>({...p,amount:e.target.value}));setAiDone(false);}} onKeyDown={e=>e.key==="Enter"&&askAI()}/>
          <div style={{display:"flex",border:`1.5px solid ${C.borderHi}`,borderRadius:13,overflow:"hidden"}}>
            {["g","ml"].map(u=>(
              <button key={u} onClick={()=>setF(p=>({...p,unit:u}))} style={{background:f.unit===u?C.blue:"transparent",color:f.unit===u?C.bg:C.muted,border:"none",padding:"0 14px",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:F.round}}>{u}</button>
            ))}
          </div>
          <button onClick={askAI} disabled={loading||!f.name.trim()||!f.amount} style={{...sx.btnF(C.blue),width:"auto",padding:"11px 14px",opacity:loading||!f.name.trim()||!f.amount?.5:1}}>{loading?"…":"✨"}</button>
        </div>
        <div style={{fontSize:10.5,color:C.faint,marginTop:5,fontWeight:600}}>💡 กด Enter หรือปุ่ม ✨ ให้ AI คำนวณ · แก้ตัวเลขเองได้</div>
      </div>
      {err&&<div style={{color:C.pink,fontSize:11.5,fontWeight:700,textAlign:"center"}}>{err}</div>}
      {aiDone&&<div style={{fontSize:11,color:C.green,fontWeight:700,textAlign:"center"}}>✓ AI ประเมินให้แล้ว — แก้ตัวเลขได้ตามต้องการ</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><span style={sx.lbl}>แคลอรี่</span><input style={{...sx.inp,...(aiDone&&{borderColor:`${C.green}66`})}} type="number" value={f.cal} onChange={e=>setF(p=>({...p,cal:e.target.value}))}/></div>
        <div><span style={sx.lbl}>โปรตีน g</span><input style={{...sx.inp,...(aiDone&&{borderColor:`${C.green}66`})}} type="number" value={f.protein} onChange={e=>setF(p=>({...p,protein:e.target.value}))}/></div>
        <div><span style={sx.lbl}>คาร์บ g</span><input style={{...sx.inp,...(aiDone&&{borderColor:`${C.green}66`})}} type="number" value={f.carbs} onChange={e=>setF(p=>({...p,carbs:e.target.value}))}/></div>
        <div><span style={sx.lbl}>ไขมัน g</span><input style={{...sx.inp,...(aiDone&&{borderColor:`${C.green}66`})}} type="number" value={f.fat} onChange={e=>setF(p=>({...p,fat:e.target.value}))}/></div>
      </div>
      <button style={sx.btnF(C.pink)} onClick={save}>เพิ่มเข้าวันนี้</button>
    </div>
  </Modal>;
}

function RecipeModal({close,setRecipes,sx}){
  const EM=["🍱","🍗","🥗","🍳","🐟","🍜","🥩","🍚","🥪","🍲"];
  const [name,setName]=useState("");
  const [emoji,setEmoji]=useState("🍱");
  const [ings,setIngs]=useState([]); // [{name,amount,unit,state:"raw"|"cooked",cal,p,c,f,matched}]
  const [cookedWeight,setCookedWeight]=useState("");
  // ฟอร์มเพิ่มวัตถุดิบ
  const [iName,setIName]=useState("");
  const [iAmt,setIAmt]=useState("");
  const [iUnit,setIUnit]=useState("g");
  const [iState,setIState]=useState("raw");  // ดิบ/สุก
  const [err,setErr]=useState("");

  // ค่าแปลงดิบ→สุก (USDA factor): สุก = ดิบ × X
  // ใช้คูณค่าโภชนาการ "ต่อ 100g" ตอนเปลี่ยน state
  // ถ้า DB เป็นดิบ แต่ผู้ใช้กรอกน้ำหนักสุก → ต้องหาร factor (สุกหนักกว่าเพราะดูดน้ำ)
  const stateFactor={
    "ข้าว":     {rawToCooked:2.5},   // ข้าวดิบ 100g → สุก 250g
    "พาสต้า":   {rawToCooked:2.4},
    "บะหมี่":   {rawToCooked:2.2},
    "โอ๊ต":     {rawToCooked:2.0},
    "เนื้อ":    {rawToCooked:0.75},  // เนื้อสุกหดลง 25%
    "ไก่":      {rawToCooked:0.75},
    "หมู":      {rawToCooked:0.75},
    "ปลา":      {rawToCooked:0.85},
    "กุ้ง":     {rawToCooked:0.85},
  };
  // หาว่าวัตถุดิบเป็นกลุ่มไหน → ใช้ factor ไหน
  const findFactor=(n)=>{
    for(const k of Object.keys(stateFactor)){
      if(n.includes(k))return stateFactor[k].rawToCooked;
    }
    return 1; // ไม่รู้ → ไม่แปลง
  };

  const addIng=()=>{
    setErr("");
    if(!iName.trim()||!iAmt){setErr("กรอกชื่อ + ปริมาณ");return;}
    const item=lookupFood(iName);
    if(!item){setErr(`ไม่พบ "${iName}" ในฐานข้อมูล`);return;}
    let amtInG=+iAmt;
    // แปลงหน่วยพิเศษ → กรัม
    if(UNIT_CONVERT&&UNIT_CONVERT[iUnit]){
      amtInG = +iAmt * UNIT_CONVERT[iUnit].gPerUnit;
    }
    // ค่าใน DB เป็นดิบ — ถ้าผู้ใช้กรอกน้ำหนักสุก ต้องแปลงเป็นดิบก่อนคิด
    const dbIsRaw = !item.n.includes("สุก")&&!item.n.includes("ย่าง")&&!item.n.includes("ต้ม")&&!item.n.includes("ดาว")&&!item.n.includes("เจียว");
    let amtForCalc = amtInG;
    if(iState==="cooked"&&dbIsRaw){
      // ผู้ใช้กรอกน้ำหนักสุก แต่ DB เป็นดิบ → แปลงสุก→ดิบ
      const f = findFactor(item.n);
      amtForCalc = amtInG / f;
    }else if(iState==="raw"&&!dbIsRaw){
      // ผู้ใช้กรอกน้ำหนักดิบ แต่ DB เป็นสุก → แปลงดิบ→สุก
      const f = findFactor(item.n);
      amtForCalc = amtInG * f;
    }
    const factor=amtForCalc/100;
    setIngs(prev=>[...prev,{
      id:uid(),
      name:item.n, raw:iName,
      amount:+iAmt, unit:iUnit, amtInG, state:iState,
      cal:Math.round(item.cal*factor),
      p:Math.round(item.p*factor*10)/10,
      c:Math.round(item.c*factor*10)/10,
      f:Math.round(item.f*factor*10)/10,
    }]);
    setIName("");setIAmt("");setIUnit("g");setIState("raw");
  };

  const totals=ings.reduce((s,i)=>({cal:s.cal+i.cal,p:s.p+i.p,c:s.c+i.c,f:s.f+i.f}),{cal:0,p:0,c:0,f:0});

  const save=()=>{
    setErr("");
    if(!name.trim()){setErr("ตั้งชื่อเมนูก่อน");return;}
    if(ings.length===0){setErr("เพิ่มวัตถุดิบอย่างน้อย 1 อย่าง");return;}
    if(!cookedWeight){setErr("กรอกน้ำหนักหลังหุง/ทำเสร็จ");return;}
    const totalG=+cookedWeight;
    setRecipes(rs=>[...rs,{
      id:uid(), name, emoji,
      ingredients:ings.map(i=>({name:i.name,amount:i.amount,unit:i.unit,state:i.state})),
      totalCal:totals.cal, totalP:Math.round(totals.p*10)/10, totalC:Math.round(totals.c*10)/10, totalF:Math.round(totals.f*10)/10,
      cookedWeight:totalG,
      perGram:{cal:totals.cal/totalG,p:totals.p/totalG,c:totals.c/totalG,f:totals.f/totalG},
      // เก็บ field เก่าด้วยให้ backwards compatible
      cal:totals.cal, protein:Math.round(totals.p*10)/10, carbs:Math.round(totals.c*10)/10, fat:Math.round(totals.f*10)/10,
    }]);
    close();
  };

  return <Modal close={close} title="🍱 สร้างเมนูใหม่">
    <div style={{display:"flex",flexDirection:"column",gap:11}}>
      {/* ─── ส่วนหัว ชื่อ + icon ─── */}
      <div><span style={sx.lbl}>ไอคอน</span>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {EM.map(e=><span key={e} onClick={()=>setEmoji(e)} style={{fontSize:22,padding:7,borderRadius:12,cursor:"pointer",background:emoji===e?C.gold+"33":"transparent",border:`1.5px solid ${emoji===e?C.gold:C.border}`}}>{e}</span>)}
        </div>
      </div>
      <div><span style={sx.lbl}>ชื่อเมนู</span>
        <input style={sx.inp} placeholder="เช่น ข้าวผสมถั่วลันเตา" value={name} onChange={e=>setName(e.target.value)}/>
      </div>

      {/* ─── เพิ่มวัตถุดิบ ─── */}
      <div style={{...sx.card,margin:0,borderColor:`${C.blue}44`,background:`${C.blue}10`}}>
        <span style={{...sx.lbl,color:C.blue}}>+ เพิ่มวัตถุดิบ</span>
        <input style={sx.inp} placeholder="ชื่อ เช่น ข้าวสาร, ถั่วลันเตา" value={iName} onChange={e=>setIName(e.target.value)}/>
        <div style={{display:"flex",gap:6,marginTop:8}}>
          <input style={{...sx.inp,flex:1}} type="number" placeholder="150" value={iAmt} onChange={e=>setIAmt(e.target.value)}/>
          <select style={{...sx.inp,flex:1}} value={iUnit} onChange={e=>setIUnit(e.target.value)}>
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="ฟอง">ฟอง</option>
            <option value="ฟองL">ฟอง L</option>
            <option value="ฟองM">ฟอง M</option>
            <option value="ทัพพี">ทัพพี</option>
            <option value="ช้อนโต๊ะ">ช้อนโต๊ะ</option>
            <option value="ช้อนชา">ช้อนชา</option>
            <option value="ใบ">ใบ</option>
          </select>
        </div>
        <div style={{display:"flex",gap:6,marginTop:8}}>
          <button onClick={()=>setIState("raw")} style={{flex:1,padding:"9px 0",borderRadius:11,border:`1.5px solid ${iState==="raw"?C.gold:C.border}`,background:iState==="raw"?`${C.gold}22`:"transparent",color:iState==="raw"?C.gold:C.muted,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:F.round}}>🥩 ดิบ</button>
          <button onClick={()=>setIState("cooked")} style={{flex:1,padding:"9px 0",borderRadius:11,border:`1.5px solid ${iState==="cooked"?C.green:C.border}`,background:iState==="cooked"?`${C.green}22`:"transparent",color:iState==="cooked"?C.green:C.muted,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:F.round}}>🍳 สุก</button>
        </div>
        <button onClick={addIng} style={{...sx.btnF(C.blue),marginTop:10,padding:"10px 0",fontSize:13}}>+ เพิ่มเข้าเมนู</button>
      </div>

      {/* ─── รายการวัตถุดิบที่ใส่ ─── */}
      {ings.length>0&&<div>
        <span style={{...sx.lbl,color:C.cream}}>วัตถุดิบในเมนู ({ings.length})</span>
        {ings.map((i,idx)=>(
          <div key={i.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.bg2,borderRadius:10,marginBottom:5}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12.5,color:C.cream,fontWeight:700}}>{i.name}</div>
              <div style={{fontSize:10.5,color:C.faint,fontWeight:600,marginTop:1}}>{i.amount}{i.unit} {i.state==="raw"?"🥩 ดิบ":"🍳 สุก"} · {i.cal} kcal · P{i.p}g</div>
            </div>
            <button onClick={()=>setIngs(prev=>prev.filter(x=>x.id!==i.id))} style={{background:"transparent",border:"none",color:C.pink,fontSize:18,cursor:"pointer",padding:"0 5px"}}>×</button>
          </div>
        ))}
        <div style={{padding:"9px 11px",background:`${C.gold}15`,borderRadius:10,marginTop:8}}>
          <div style={{fontSize:11,color:C.faint,fontWeight:700}}>รวมสารอาหารทั้งเมนู</div>
          <div style={{fontSize:13,color:C.gold,fontWeight:800,marginTop:3}}>{totals.cal} kcal · P {Math.round(totals.p*10)/10}g · C {Math.round(totals.c*10)/10}g · F {Math.round(totals.f*10)/10}g</div>
        </div>
      </div>}

      {/* ─── น้ำหนักหลังหุง/ทำเสร็จ ─── */}
      {ings.length>0&&<div>
        <span style={sx.lbl}>⚖️ น้ำหนักหลังหุง/ทำเสร็จ (g)</span>
        <input style={sx.inp} type="number" placeholder="เช่น 380" value={cookedWeight} onChange={e=>setCookedWeight(e.target.value)}/>
        <div style={{fontSize:10.5,color:C.faint,marginTop:4,fontWeight:600,lineHeight:1.5}}>💡 ชั่งหลังทำเสร็จทั้งหมด เช่น ข้าวหุงเสร็จในหม้อ → ระบบจะคำนวณ kcal/g ให้ ตอนตักมากินจะคูณตามน้ำหนักที่กิน</div>
        {cookedWeight&&+cookedWeight>0&&<div style={{fontSize:12,color:C.green,fontWeight:800,marginTop:6,padding:"7px 11px",background:`${C.green}15`,borderRadius:9}}>
          ➗ {Math.round((totals.cal/+cookedWeight)*100)/100} kcal/g · ตักกิน 100g = {Math.round(totals.cal/+cookedWeight*100)} kcal
        </div>}
      </div>}

      {err&&<div style={{color:C.pink,fontSize:12,fontWeight:700,padding:"8px 11px",background:`${C.pink}15`,borderRadius:9}}>⚠️ {err}</div>}

      <button style={sx.btnF(C.green)} onClick={save}>💾 บันทึกเมนู</button>
    </div>
  </Modal>;
}

// ═══════════════ EXERCISE TAB ═══════════════
function ExerciseTab({day,patch,sx,plan,runRec,exerciseCal,tdee}){
  const [em,setEm]=useState(false);
  const n=(v)=>v===""?undefined:+v;
  const rr=day.run||{outdoor:false};
  const setR=(k,v)=>patch((d)=>({...d,run:{...(d.run||{outdoor:false}),[k]:v}}));
  const m=day.muay||{};
  const setM=(k,v)=>patch((d)=>({...d,muay:{...(d.muay||{}),[k]:v}}));
  const dl=day.daily||{};
  const setD=(k,v)=>patch((d)=>({...d,daily:{...(d.daily||{}),[k]:v}}));

  return <>
    <Sec accent={C.blue}>✅ เช็คลิสต์วันนี้</Sec>
    <div style={{...sx.card,borderColor:`${C.blue}44`}}>
      <div style={{fontSize:15,fontWeight:800,color:C.cream}}>{plan.title}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:3,marginBottom:11,fontWeight:600}}>{plan.focus} · 📍 {plan.loc}</div>
      {plan.items.map((it)=>{
        const done=!!day.checked[it.id];
        return <div key={it.id} onClick={()=>patch((d)=>({...d,checked:{...d.checked,[it.id]:!d.checked[it.id]}}))}
          style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:21,height:21,borderRadius:7,flexShrink:0,marginTop:1,border:`2px solid ${done?C.green:C.borderHi}`,background:done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontSize:12,fontWeight:900}}>{done?"✓":""}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:done?C.faint:C.text,textDecoration:done?"line-through":"none",fontWeight:700}}>{it.text}</div>
            {it.hr&&<div style={{fontSize:10.5,color:C.pink,marginTop:2,fontWeight:700}}>💓 เป้า HR {it.hr} bpm</div>}
          </div>
        </div>;
      })}
      {day.extraExercises.map((e)=>(
        <div key={e.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:21,height:21,borderRadius:7,flexShrink:0,marginTop:1,border:`2px solid ${C.green}`,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontSize:12,fontWeight:900}}>✓</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:C.text,fontWeight:700}}>{e.name} <span style={{fontSize:9.5,color:C.gold,fontWeight:800}}>(เพิ่มเอง)</span></div>
            {e.hr&&<div style={{fontSize:10.5,color:C.pink,marginTop:2,fontWeight:700}}>💓 HR {e.hr} bpm</div>}
            {e.note&&<div style={{fontSize:10,color:C.faint,marginTop:1,fontWeight:600}}>{e.note}</div>}
          </div>
          <span onClick={()=>patch((d)=>({...d,extraExercises:d.extraExercises.filter(x=>x.id!==e.id)}))} style={{cursor:"pointer",color:C.pink,fontSize:16,fontWeight:800}}>×</span>
        </div>
      ))}
      <button onClick={()=>setEm(true)} style={{...sx.btn(C.muted),width:"100%",marginTop:11}}>+ เพิ่มกิจกรรม + HR</button>
    </div>

    <Sec accent={C.pink}>🏃 วิ่ง · ข้อมูลจากอุปกรณ์</Sec>
    <div style={{...sx.card,borderColor:`${C.pink}33`}}>
      <div style={{display:"flex",gap:8,marginBottom:13}}>
        {[["🏠 ลู่วิ่ง (ในร่ม)",false],["🌳 วิ่งสวน (outdoor)",true]].map(([lbl,val])=>(
          <button key={String(val)} onClick={()=>setR("outdoor",val)} style={{flex:1,padding:"10px",borderRadius:13,fontSize:11.5,fontWeight:800,cursor:"pointer",fontFamily:F.round,border:`1.5px solid ${rr.outdoor===val?C.pink:C.border}`,color:rr.outdoor===val?C.pink:C.muted,background:rr.outdoor===val?`${C.pink}1a`:"transparent"}}>{lbl}</button>
        ))}
      </div>
      {!rr.outdoor?<>
        <span style={{...sx.lbl,color:C.green}}>ลู่วิ่ง · ระยะทางเชื่อตัวนี้ ✓</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
          <input style={sx.inp} type="number" step="0.01" placeholder="ระยะ km" value={rr.treadmillKm??""} onChange={e=>setR("treadmillKm",n(e.target.value))}/>
          <input style={sx.inp} type="number" placeholder="แคล (ลู่)" value={rr.treadmillCal??""} onChange={e=>setR("treadmillCal",n(e.target.value))}/>
        </div>
        <span style={sx.lbl}>Garmin Forerunner 165</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <input style={sx.inp} type="number" step="0.01" placeholder="ระยะ km" value={rr.garminKm??""} onChange={e=>setR("garminKm",n(e.target.value))}/>
          <input style={sx.inp} type="number" placeholder="แคล (Garmin)" value={rr.garminCal??""} onChange={e=>setR("garminCal",n(e.target.value))}/>
        </div>
      </>:<>
        <span style={{...sx.lbl,color:C.green}}>Strava · ระยะทาง GPS เชื่อตัวนี้ ✓</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
          <input style={sx.inp} type="number" step="0.01" placeholder="ระยะ km" value={rr.stravaKm??""} onChange={e=>setR("stravaKm",n(e.target.value))}/>
          <input style={sx.inp} type="number" placeholder="แคล (Strava)" value={rr.stravaCal??""} onChange={e=>setR("stravaCal",n(e.target.value))}/>
        </div>
        <span style={sx.lbl}>Garmin Forerunner 165</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <input style={sx.inp} type="number" step="0.01" placeholder="ระยะ km" value={rr.garminKm??""} onChange={e=>setR("garminKm",n(e.target.value))}/>
          <input style={sx.inp} type="number" placeholder="แคล (Garmin)" value={rr.garminCal??""} onChange={e=>setR("garminCal",n(e.target.value))}/>
        </div>
      </>}
      {runRec&&runRec.km>0&&<div style={{marginTop:14,padding:"14px",background:C.bg2,borderRadius:16,border:`1.5px solid ${C.pink}44`}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:800,marginBottom:9}}>✨ ค่าที่ปรับแล้ว · แม่นยำที่สุด</div>
        <div style={{display:"flex",justifyContent:"space-around",textAlign:"center",marginBottom:9}}>
          <div><div style={{fontSize:26,fontWeight:900,color:C.blue}}>{runRec.km.toFixed(2)}</div><div style={{fontSize:9.5,color:C.faint,fontWeight:600}}>km · {runRec.kmSrc}</div></div>
          <div><div style={{fontSize:26,fontWeight:900,color:C.pink}}>{runRec.cal}<span style={{fontSize:12,color:C.muted}}> ±{runRec.band}</span></div><div style={{fontSize:9.5,color:C.faint,fontWeight:600}}>kcal ({runRec.cal-runRec.band}–{runRec.cal+runRec.band})</div></div>
        </div>
        {runRec.notes.map((nn,i)=><div key={i} style={{fontSize:10,color:C.muted,lineHeight:1.6,fontWeight:600}}>· {nn}</div>)}
      </div>}
    </div>

    <Sec accent={C.gold}>🥊 มวยไทย · จากนาฬิกา</Sec>
    <div style={{...sx.card,borderColor:`${C.gold}33`}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
        <div><span style={sx.lbl}>เวลา นาที</span><input style={sx.inp} type="number" placeholder="60" value={m.minutes??""} onChange={e=>setM("minutes",n(e.target.value))}/></div>
        <div><span style={sx.lbl}>แคล</span><input style={sx.inp} type="number" placeholder="kcal" value={m.cal??""} onChange={e=>setM("cal",n(e.target.value))}/></div>
        <div><span style={sx.lbl}>HR เฉลี่ย</span><input style={sx.inp} type="number" placeholder="bpm" value={m.hr??""} onChange={e=>setM("hr",n(e.target.value))}/></div>
      </div>
    </div>

    <Sec accent={C.purple}>💃 คลาส Jetts · จาก Garmin</Sec>
    <div style={{...sx.card,borderColor:`${C.purple}33`}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:10,fontWeight:600}}>วันที่ไปเข้าคลาส (Yoga, Body Pump, HIIT, ฯลฯ) — แคลจาก Garmin จะรวมเข้าพลังงานใช้ของวัน</div>
      {(day.classes||[]).map((cl,idx)=>(
        <div key={cl.id} style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 0.8fr auto",gap:7,marginBottom:8,alignItems:"start"}}>
          <input style={sx.inp} placeholder="ชื่อคลาส เช่น HIIT" value={cl.name||""} onChange={e=>patch((d)=>({...d,classes:(d.classes||[]).map((c,i)=>i===idx?{...c,name:e.target.value}:c)}))}/>
          <input style={sx.inp} type="number" placeholder="แคล (Garmin)" value={cl.cal??""} onChange={e=>patch((d)=>({...d,classes:(d.classes||[]).map((c,i)=>i===idx?{...c,cal:n(e.target.value)}:c)}))}/>
          <input style={sx.inp} type="number" placeholder="นาที" value={cl.min??""} onChange={e=>patch((d)=>({...d,classes:(d.classes||[]).map((c,i)=>i===idx?{...c,min:n(e.target.value)}:c)}))}/>
          <button onClick={()=>patch((d)=>({...d,classes:(d.classes||[]).filter((_,i)=>i!==idx)}))} style={{background:"transparent",border:"none",color:C.pink,fontSize:20,cursor:"pointer",padding:"8px 4px",lineHeight:1}}>×</button>
        </div>
      ))}
      <button onClick={()=>patch((d)=>({...d,classes:[...(d.classes||[]),{id:uid(),name:"",cal:null,min:null}]}))} style={{...sx.btnF(C.purple),padding:"10px 0",fontSize:13}}>+ เพิ่มคลาส</button>
      {(day.classes||[]).length>0&&<div style={{marginTop:11,padding:"8px 12px",background:`${C.purple}15`,borderRadius:10,fontSize:12,color:C.purple,fontWeight:800}}>
        💪 รวมแคลคลาส: {(day.classes||[]).reduce((s,c)=>s+(c.cal||0),0)} kcal
      </div>}
    </div>

    <Sec accent={C.green}>👟 ชีวิตประจำวัน · Apple Health</Sec>
    <div style={{...sx.card,borderColor:`${C.green}33`}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:10,fontWeight:600}}>กรอกจากแอป Apple Health — TDEE จะถูกคำนวณความแม่นยำ ±10%</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div><span style={sx.lbl}>ก้าวเดิน</span><input style={sx.inp} type="number" placeholder="10000" value={dl.steps??""} onChange={e=>setD("steps",n(e.target.value))}/></div>
        <div><span style={sx.lbl}>Active kcal</span><input style={sx.inp} type="number" placeholder="kcal" value={dl.activeCal??""} onChange={e=>setD("activeCal",n(e.target.value))}/></div>
        <div style={{gridColumn:"1/-1"}}><span style={sx.lbl}>TDEE รวมทั้งวัน (Apple Health)</span><input style={sx.inp} type="number" placeholder="kcal รวม basal + active" value={dl.tdee??""} onChange={e=>setD("tdee",n(e.target.value))}/></div>
      </div>
    </div>

    <Sec accent={C.purple}>📊 สรุปวันนี้</Sec>
    <div style={{...sx.card,background:`linear-gradient(155deg,${C.cardHi},${C.card})`}}>
      <div style={{display:"flex",justifyContent:"space-around",textAlign:"center"}}>
        <div>
          <div style={{fontSize:30,fontWeight:900,color:C.pink}}>{exerciseCal||"—"}</div>
          <div style={{fontSize:10,color:C.muted,fontWeight:700}}>เผาจากออกกำลังกาย</div>
          <div style={{fontSize:9,color:C.faint,fontWeight:600}}>วิ่ง + มวย · ปรับค่าแล้ว</div>
        </div>
        <div style={{width:1,background:C.border}}/>
        <div>
          <div style={{fontSize:30,fontWeight:900,color:C.green}}>{tdee||"—"}</div>
          <div style={{fontSize:10,color:C.muted,fontWeight:700}}>TDEE วันนี้</div>
          <div style={{fontSize:9,color:C.faint,fontWeight:600}}>{tdee?`±${Math.round(tdee*0.1)} kcal คลาดเคลื่อน`:"(กรอกจาก Apple Health)"}</div>
        </div>
      </div>
      {tdee&&<div style={{marginTop:13,padding:"12px 14px",background:C.bg2,borderRadius:15,fontSize:11.5,color:C.text,lineHeight:1.65,fontWeight:600}}>
        📊 Apple Health คลาดเคลื่อนได้ราว ±10% — ช่วงที่น่าจะจริง: <b style={{color:C.green}}>{Math.round(tdee*0.9)}–{Math.round(tdee*1.1)} kcal</b>
      </div>}
    </div>

    {em&&<Modal close={()=>setEm(false)} title="+ เพิ่มกิจกรรม">
      <ExtraForm close={()=>setEm(false)} patch={patch} sx={sx}/>
    </Modal>}
  </>;
}

function ExtraForm({close,patch,sx}){
  const [e,setE]=useState({name:"",hr:"",note:""});
  return <div style={{display:"flex",flexDirection:"column",gap:10}}>
    <div><span style={sx.lbl}>กิจกรรม</span><input style={sx.inp} placeholder="เช่น โยคะ, ว่ายน้ำ" value={e.name} onChange={ev=>setE(p=>({...p,name:ev.target.value}))}/></div>
    <div><span style={sx.lbl}>HR เฉลี่ย (bpm)</span><input style={sx.inp} type="number" placeholder="ไม่บังคับ" value={e.hr} onChange={ev=>setE(p=>({...p,hr:ev.target.value}))}/></div>
    <div><span style={sx.lbl}>โน้ต</span><input style={sx.inp} placeholder="ไม่บังคับ" value={e.note} onChange={ev=>setE(p=>({...p,note:ev.target.value}))}/></div>
    <button style={sx.btnF(C.green)} onClick={()=>{if(!e.name)return;patch((d)=>({...d,extraExercises:[...d.extraExercises,{id:uid(),name:e.name,hr:e.hr?+e.hr:undefined,note:e.note||undefined,time:new Date().toTimeString().slice(0,5)}]}));close();}}>เพิ่ม</button>
  </div>;
}

// ═══════════════ PROGRESS TAB ═══════════════
function ProgressTab({logs,day,patch,sx,phase,scans,setScans,customPlan,setCustomPlan,goalsFor,totalStars,tier,streak,streakBadge}){
  const [section,setSection]=useState("weight");
  const [wi,setWi]=useState("");
  const [evoltModal,setEvoltModal]=useState(false);
  const [calMon,setCalMon]=useState(()=>new Date().toISOString().slice(0,7));

  const wHist=useMemo(()=>Object.values(logs).filter((l)=>l.weight).sort((a,b)=>a.date.localeCompare(b.date)).map((l)=>({date:l.date,weight:l.weight})),[logs]);
  const latest=wHist.length?wHist[wHist.length-1].weight:GOAL_START;
  const pct=Math.max(0,Math.min(100,((GOAL_START-latest)/(GOAL_START-GOAL_END))*100));

  const mon=day.date.slice(0,7);
  const monthKm=useMemo(()=>Object.values(logs).filter((l)=>l.date.slice(0,7)===mon&&l.run).reduce((s,l)=>s+reconcileRun(l.run).km,0),[logs,mon]);
  const allRuns=useMemo(()=>Object.values(logs).filter((l)=>l.run).map((l)=>({date:l.date,...reconcileRun(l.run)})).sort((a,b)=>a.date.localeCompare(b.date)),[logs]);
  const fb=useMemo(()=>wFeedback(wHist,phase),[wHist,phase]);

  return <>
    <div style={{...sx.card,background:`linear-gradient(155deg,${C.cardHi},${C.card})`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <div style={{fontSize:36,fontWeight:900,color:C.cream}}>{latest.toFixed(1)}<span style={{fontSize:15,color:C.muted}}> kg</span></div>
        <div style={{fontSize:32,fontWeight:900,color:phase.accent}}>{pct.toFixed(0)}%</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.faint,margin:"9px 0 5px",fontWeight:700}}>
        <span>75 kg</span><span style={{color:C.gold}}>{(GOAL_START-latest).toFixed(1)} kg ลงแล้ว</span><span style={{color:C.green}}>65 kg 🎯</span>
      </div>
      <div style={{background:C.border,borderRadius:8,height:11,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${C.pink},${C.gold},${C.green})`,transition:"width .8s ease"}}/>
      </div>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:12}}>
      {[["weight","⚖️ น้ำหนัก"],["running","🏃 วิ่ง"],["habits","⭐ Habits"]].map(([s,t])=>(
        <button key={s} onClick={()=>setSection(s)} style={{flex:1,padding:"11px 4px",borderRadius:14,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:F.round,border:`1.5px solid ${section===s?C.gold:C.border}`,color:section===s?C.gold:C.muted,background:section===s?`${C.gold}1a`:"transparent"}}>{t}</button>
      ))}
    </div>

    {section==="habits"?<HabitsSection logs={logs} sx={sx} goalsFor={goalsFor} totalStars={totalStars} tier={tier} streak={streak} streakBadge={streakBadge} calMon={calMon} setCalMon={setCalMon}/>:section==="weight"?<>
      <div style={sx.card}>
        <span style={sx.lbl}>ชั่งรายวัน (ทุกเช้า หลังห้องน้ำ)</span>
        <div style={{display:"flex",gap:8}}>
          <input style={{...sx.inp,flex:1}} type="number" step="0.1" placeholder={day.weight?`วันนี้: ${day.weight} kg`:"กรอก kg"} value={wi} onChange={e=>setWi(e.target.value)}/>
          <button style={sx.btn(C.green)} onClick={()=>{const w=parseFloat(wi);if(w>=30&&w<=200){patch((d)=>({...d,weight:w}));setWi("");}}}>บันทึก</button>
        </div>
      </div>

      {/* Evolt scan section */}
      <div style={{...sx.card,background:`linear-gradient(150deg,${C.purple}15,${C.card})`,borderColor:`${C.purple}55`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:14,fontWeight:900,color:C.purple}}>📐 สแกนรอบเดือน (Evolt / InBody)</span>
          {scans.length>0&&<span style={{fontSize:10,color:C.muted,fontWeight:700}}>{scans.length} ครั้ง</span>}
        </div>
        <div style={{fontSize:11,color:C.muted,marginBottom:11,lineHeight:1.6,fontWeight:600}}>อัปโหลดรูปผลสแกน — AI จะอ่านค่าทุกอย่าง (LBM · ไขมัน% · visceral · BMR · TEE · ส่วนต่างซ้ายขวา) แล้ววิเคราะห์ + แนะนำการปรับแพลน</div>
        <button onClick={()=>setEvoltModal(true)} style={{...sx.btnF(C.purple)}}>📸 อัปโหลดผลสแกนใหม่</button>

        {scans.length>0&&<div style={{marginTop:13}}>
          <div style={{fontSize:10,color:C.faint,fontWeight:800,marginBottom:7}}>ประวัติสแกน</div>
          {scans.slice().reverse().slice(0,3).map((sc,i)=>(
            <div key={sc.id} style={{background:C.bg2,borderRadius:11,padding:"9px 11px",marginBottom:6,fontSize:11.5,fontWeight:600}}>
              <div style={{display:"flex",justifyContent:"space-between",color:C.text}}>
                <span>{sc.date}</span>
                <span style={{color:C.purple,fontWeight:800}}>{sc.weight?`${sc.weight} kg`:""}</span>
              </div>
              {sc.fat!=null&&<div style={{color:C.faint,fontSize:10.5,marginTop:2}}>
                ไขมัน {sc.fat}% · LBM {sc.lbm} kg · visceral {sc.visceral}
              </div>}
            </div>
          ))}
        </div>}
      </div>

      {/* Pending coach advice — only if latest scan has advice not yet decided */}
      {scans.length>0&&scans[scans.length-1].adviceStatus==="pending"&&
        <CoachAdviceCard scan={scans[scans.length-1]} sx={sx}
          accept={()=>{
            const sc=scans[scans.length-1];
            setCustomPlan({cal:sc.advice.cal,protein:sc.advice.protein,note:sc.advice.note,extraItems:sc.advice.extraItems||[],appliedDate:new Date().toISOString().slice(0,10)});
            setScans(s=>s.map((x,i)=>i===s.length-1?{...x,adviceStatus:"accepted"}:x));
          }}
          reject={()=>setScans(s=>s.map((x,i)=>i===s.length-1?{...x,adviceStatus:"rejected"}:x))}
        />}

      {/* Most recent accepted advice — readable summary */}
      {customPlan&&<div style={{...sx.card,background:`${C.green}10`,border:`1.5px solid ${C.green}55`}}>
        <div style={{fontSize:13,fontWeight:900,color:C.green,marginBottom:6}}>✅ แพลนที่ปรับใหม่ (จากสแกนล่าสุด)</div>
        <div style={{fontSize:12,color:C.text,lineHeight:1.7,fontWeight:600}}>
          แคล <b style={{color:C.gold}}>{customPlan.cal}</b> · โปรตีน <b style={{color:C.pink}}>{customPlan.protein}g</b>
          {customPlan.note&&<div style={{color:C.muted,marginTop:4,fontSize:11}}>{customPlan.note}</div>}
        </div>
      </div>}

      <div style={sx.card}>
        <span style={sx.lbl}>📈 กราฟน้ำหนัก</span>
        <WChart data={wHist}/>
      </div>

      <div style={{...sx.card,background:`${fb.color}14`,border:`1.5px solid ${fb.color}55`}}>
        <div style={{fontSize:15,fontWeight:900,color:fb.color,marginBottom:8}}>{fb.headline}</div>
        <div style={{fontSize:12.5,color:C.text,lineHeight:1.75,fontWeight:600}}>{fb.body}</div>
        {fb.tip&&<div style={{fontSize:11.5,color:C.muted,marginTop:9,borderLeft:`3px solid ${fb.color}`,paddingLeft:10,lineHeight:1.6,fontWeight:600}}>{fb.tip}</div>}
      </div>
    </>:<>
      <div style={{...sx.card,background:`linear-gradient(150deg,${C.pink}22,${C.card})`,border:`1.5px solid ${C.pink}55`,textAlign:"center",padding:"22px 16px"}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:800}}>🏃 เก็บกิโลเดือนนี้</div>
        <div style={{fontSize:58,fontWeight:900,color:C.cream,lineHeight:1,margin:"5px 0"}}>{monthKm.toFixed(1)}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14,fontWeight:700}}>กิโลเมตร</div>
        <KmTrack km={monthKm}/>
      </div>

      <div style={sx.card}>
        <span style={sx.lbl}>📊 แนวโน้มระยะวิ่ง</span>
        {allRuns.length<2
          ?<div style={{color:C.faint,fontSize:12.5,textAlign:"center",padding:"18px 0",fontWeight:600}}>บันทึกการวิ่งอย่างน้อย 2 ครั้ง เพื่อดูแนวโน้ม</div>
          :<>
            <RChart data={allRuns}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:13}}>
              {[{l:"ระยะรวม",v:`${allRuns.reduce((s,r)=>s+r.km,0).toFixed(1)} km`,c:C.blue},{l:"วิ่งทั้งหมด",v:`${allRuns.length} ครั้ง`,c:C.purple},{l:"เฉลี่ย/ครั้ง",v:`${(allRuns.reduce((s,r)=>s+r.km,0)/allRuns.length).toFixed(1)} km`,c:C.green}].map(x=>(
                <div key={x.l} style={{textAlign:"center",background:C.bg2,borderRadius:13,padding:"11px 4px"}}>
                  <div style={{fontSize:16,fontWeight:900,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:9,color:C.faint,fontWeight:700,marginTop:2}}>{x.l}</div>
                </div>
              ))}
            </div>
          </>}
      </div>

      <div style={{...sx.card,background:`${C.blue}14`,border:`1.5px solid ${C.blue}55`}}>
        <div style={{fontSize:15,fontWeight:900,color:C.blue,marginBottom:8}}>🏃 โค้ชวิ่ง</div>
        <div style={{fontSize:12.5,color:C.text,lineHeight:1.75,fontWeight:600}}>{rFeedback(allRuns,monthKm)}</div>
      </div>
    </>}

    {evoltModal&&<EvoltModal close={()=>setEvoltModal(false)} sx={sx} scans={scans} setScans={setScans} latestWeight={latest} customPlan={customPlan}/>}
  </>;
}

// ─── COACH ADVICE CARD ──────────────────────────────────────────
function CoachAdviceCard({scan,accept,reject,sx}){
  const a=scan.advice||{};
  return <div style={{...sx.card,background:`linear-gradient(155deg,${C.purple}25,${C.card})`,border:`2px solid ${C.purple}`,padding:18}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <span style={{fontSize:20}}>🤖</span>
      <span style={{fontSize:16,fontWeight:900,color:C.purple}}>คำแนะนำจาก AI Coach</span>
    </div>
    <div style={{fontSize:11,color:C.faint,fontWeight:700,marginBottom:11}}>จากสแกน {scan.date} · เปรียบกับเป้า "ใบเฟิร์น พิมพ์ขนก" (ลีน + กล้ามชัด + สะโพกสวย)</div>

    {a.status&&<div style={{background:C.bg2,borderRadius:12,padding:"11px 13px",marginBottom:10}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:800,marginBottom:4}}>📊 สถานะปัจจุบัน</div>
      <div style={{fontSize:12.5,color:C.text,lineHeight:1.7,fontWeight:600}}>{a.status}</div>
    </div>}

    {a.distance&&<div style={{background:C.bg2,borderRadius:12,padding:"11px 13px",marginBottom:10}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:800,marginBottom:4}}>🎯 ห่างจากเป้าหุ่นในฝัน</div>
      <div style={{fontSize:12.5,color:C.text,lineHeight:1.7,fontWeight:600}}>{a.distance}</div>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
      <div style={{background:`${C.gold}1a`,border:`1px solid ${C.gold}55`,borderRadius:12,padding:"10px 11px"}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:800}}>แคลอรี่ใหม่</div>
        <div style={{fontSize:22,fontWeight:900,color:C.gold,marginTop:2}}>{a.cal}<span style={{fontSize:11,color:C.muted}}> kcal</span></div>
      </div>
      <div style={{background:`${C.pink}1a`,border:`1px solid ${C.pink}55`,borderRadius:12,padding:"10px 11px"}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:800}}>โปรตีนใหม่</div>
        <div style={{fontSize:22,fontWeight:900,color:C.pink,marginTop:2}}>{a.protein}<span style={{fontSize:11,color:C.muted}}> g</span></div>
      </div>
    </div>

    {a.workoutAdjust&&<div style={{background:C.bg2,borderRadius:12,padding:"11px 13px",marginBottom:10}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:800,marginBottom:4}}>💪 ปรับการออกกำลังกาย</div>
      <div style={{fontSize:12.5,color:C.text,lineHeight:1.7,fontWeight:600}}>{a.workoutAdjust}</div>
    </div>}

    {a.extraItems&&a.extraItems.length>0&&<div style={{background:C.bg2,borderRadius:12,padding:"11px 13px",marginBottom:10}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:800,marginBottom:6}}>➕ เพิ่มเข้าเช็คลิสต์ทุกวัน</div>
      {a.extraItems.map((it,i)=><div key={i} style={{fontSize:12,color:C.text,fontWeight:600,padding:"3px 0"}}>· {it.text}</div>)}
    </div>}

    {a.encourage&&<div style={{fontSize:12.5,color:C.purple,lineHeight:1.7,fontWeight:700,fontStyle:"italic",borderLeft:`3px solid ${C.purple}`,paddingLeft:11,marginBottom:13}}>💖 {a.encourage}</div>}

    <div style={{display:"flex",gap:9}}>
      <button onClick={reject} style={{...sx.btn(C.muted),flex:1,padding:"12px"}}>✗ ไม่ยอมรับ</button>
      <button onClick={accept} style={{...sx.btnF(C.green),flex:2,padding:"13px"}}>✓ ยอมรับ · ปรับแพลนเลย</button>
    </div>
  </div>;
}


// ─── EVOLT SCAN MODAL ───────────────────────────────────────────
// อัปโหลดรูปดูประกอบ + กรอกค่าจากรูปเอง + วิเคราะห์ด้วยสูตรวิทยาศาสตร์
function EvoltModal({close,sx,scans,setScans,latestWeight,customPlan}){
  const [img,setImg]=useState(null);
  const [b64,setB64]=useState(null);
  const [v,setV]=useState({weight:"",fat:"",lbm:"",muscle:"",visceral:"",bmr:"",tee:"",waist:""});
  const [err,setErr]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const ref=useRef(null);

  const onFile=(e)=>{
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>{const d=r.result;setImg(d);setB64(d.split(",")[1]);};r.readAsDataURL(f);
  };

  const setF=(k,val)=>setV(p=>({...p,[k]:val}));

  // ใช้ AI อ่านค่าจากรูปอัตโนมัติ (Vercel เท่านั้น)
  const aiReadImage=async()=>{
    if(!b64||!img)return;
    setAiLoading(true);setErr("");
    try{
      const mt=img.substring(img.indexOf(":")+1,img.indexOf(";"));
      const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:600,
        messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:mt,data:b64}},
          {type:"text",text:`อ่านค่าจากผลสแกน Evolt 360 / InBody ในรูปนี้ ตอบ JSON เท่านั้น ไม่มี markdown:\n{"weight":number,"fat":number,"lbm":number,"muscle":number,"visceral":number,"bmr":number,"tee":number,"waist":number_or_null}`}
        ]}]
      })});
      const data=await r.json();
      if(data.error)throw new Error(data.error.message||"AI error");
      const txt=(data.content||[]).map(c=>c.text||"").join("");
      const m=txt.match(/\{[\s\S]*\}/);
      if(!m)throw new Error("AI ตอบไม่ใช่ JSON");
      const p=JSON.parse(m[0]);
      setV({
        weight:p.weight?String(p.weight):"",
        fat:p.fat?String(p.fat):"",
        lbm:p.lbm?String(p.lbm):"",
        muscle:p.muscle?String(p.muscle):"",
        visceral:p.visceral?String(p.visceral):"",
        bmr:p.bmr?String(p.bmr):"",
        tee:p.tee?String(p.tee):"",
        waist:p.waist?String(p.waist):"",
      });
    }catch(e){setErr("AI อ่านรูปไม่สำเร็จ: "+(e.message||e)+" · ลองกรอกค่าเองด้านล่าง");}
    finally{setAiLoading(false);}
  };

  const analyze=()=>{
    if(!v.weight||!v.fat||!v.lbm){
      setErr("ต้องกรอกอย่างน้อย: น้ำหนัก, ไขมัน%, และ LBM");
      return;
    }
    const weight=+v.weight, fat=+v.fat, lbm=+v.lbm;
    const muscle=v.muscle?+v.muscle:lbm*0.54;  // skeletal muscle ≈ 54% of LBM
    const visceral=v.visceral?+v.visceral:null;
    const bmr=v.bmr?+v.bmr:Math.round(370+21.6*lbm);  // Katch-McArdle formula
    const tee=v.tee?+v.tee:Math.round(bmr*1.55);  // moderately active
    const waist=v.waist?+v.waist:null;
    const fatMass=weight*fat/100;

    // ─── สูตรคำนวณตามวิทยาศาสตร์ ───────────────────────────────
    // 1. โปรตีน: 2.0-2.4 g/kg LBM สำหรับ cut + รักษากล้ามเนื้อ (Helms et al. 2014)
    const proteinTarget=Math.round(lbm*2.2);

    // 2. แคล: deficit 20-25% จาก TEE (Aragon & Schoenfeld 2013 — รักษากล้ามได้ดี)
    const recommendedCal=Math.round(tee*0.78);

    // 3. status assessment
    const fatStatus = fat>=30?"สูง":fat>=25?"สูงเล็กน้อย":fat>=20?"ในเกณฑ์ดี":fat>=18?"ลีน":"ลีนมาก";
    const visceralStatus = visceral===null?"":visceral<=6?"ดี (≤6)":visceral<=9?"ปกติ-เริ่มสูง":visceral<=12?"สูง — ต้องลด":"สูงมาก — เสี่ยงสุขภาพ";

    // 4. distance from goal physique (เฟิร์น/พิมพ์ชนก: female lean ~19-23%)
    const targetFat=21, fatDiff=fat-targetFat;
    const fatMassToLose=Math.round(fatMass-(weight*targetFat/100)*10)/10;

    // 5. previous scan trend
    const prevScan=scans.length?scans[scans.length-1]:null;
    let trendNote="";
    if(prevScan){
      const wDiff=(weight-prevScan.weight).toFixed(1);
      const fDiff=(fat-prevScan.fat).toFixed(1);
      const lDiff=(lbm-prevScan.lbm).toFixed(1);
      trendNote=`เทียบครั้งก่อน: น้ำหนัก ${wDiff>0?"+":""}${wDiff} kg · ไขมัน ${fDiff>0?"+":""}${fDiff}% · LBM ${lDiff>0?"+":""}${lDiff} kg. `;
      if(+lDiff<-0.5) trendNote+="⚠️ กล้ามเนื้อหายเยอะ — ต้องเพิ่มโปรตีน + ลด deficit. ";
      else if(+fDiff<-0.5&&+lDiff>=-0.3) trendNote+="🎯 ลดไขมันรักษากล้าม — สมบูรณ์แบบ!";
    }

    // 6. workout adjust
    let workoutAdjust="";
    if(visceral!==null&&visceral>=10) workoutAdjust+="visceral fat สูง → เพิ่ม HIIT 15-20 นาที 2-3 ครั้ง/สัปดาห์. ";
    if(fat>=28) workoutAdjust+="เน้น weight training รักษากล้ามไว้ระหว่าง cut + cardio Zone 2 ยาวๆ. ";
    if(lbm<weight*0.65) workoutAdjust+="LBM ค่อนข้างต่ำเทียบน้ำหนัก → เน้น progressive overload ใน weight training, อย่าตัดแคลลึกเกิน. ";
    if(!workoutAdjust) workoutAdjust="continue แพลนเดิม — สัดส่วน LBM/fat อยู่ในจุดที่ดี เน้นความสม่ำเสมอ.";

    // 7. extra items based on metrics
    const extraItems=[];
    if(visceral!==null&&visceral>=10) extraItems.push({id:`x${Date.now()}_1`,text:"HIIT 15 นาที (ลู่/Bike) — วันพุธ/ศุกร์"});
    if(fat>=28&&!extraItems.length) extraItems.push({id:`x${Date.now()}_2`,text:"เดินเร็ว Zone 2 อีก 20 นาที วันที่ไม่เทรน"});

    const newScan={
      id:uid(), date:new Date().toISOString().slice(0,10),
      weight, fat, lbm, muscle:Math.round(muscle*10)/10, visceral, bmr, tee, waist, img,
      advice:{
        status:`ไขมัน ${fat}% (${fatStatus}) · LBM ${lbm} kg${visceral!==null?` · visceral ${visceral} (${visceralStatus})`:""} · BMR ${bmr} kcal`,
        distance:`เป้าหุ่นใบเฟิร์น/พิมพ์ชนก ~${targetFat}% body fat — ตอนนี้ห่าง ${fatDiff>0?fatDiff.toFixed(1):0}% · ต้องลดไขมันอีก ~${Math.max(0,fatMassToLose)} kg (โดยรักษา LBM ไว้)`,
        cal:recommendedCal, protein:proteinTarget,
        note:`คำนวณจากสูตร Katch-McArdle (BMR×activity 1.55 = TEE ${tee} kcal) แล้ว deficit 22% เพื่อลดไขมันรักษากล้าม · โปรตีน 2.2 g/kg LBM ตามงานวิจัย Helms et al. 2014 สำหรับ cut`,
        workoutAdjust:trendNote+workoutAdjust,
        extraItems,
        encourage: trendNote.includes("สมบูรณ์แบบ")?"กำลังไปทางที่ถูก รักษาจังหวะนี้ไว้ 💪":
                   fat<25?"ตัวเลข body comp อยู่ในระดับดีแล้ว — โฟกัสรายละเอียดต่อ ✨":
                   "ทุกตัวเลขกำลังขยับไปทางที่ดี อย่ายอมแพ้นะ 💖",
      },
      adviceStatus:"pending",
    };
    setScans(s=>[...s,newScan]);
    close();
  };

  const fields=[
    {k:"weight", label:"น้ำหนัก", unit:"kg", req:true, ph:"75.0"},
    {k:"fat",    label:"ไขมัน",    unit:"%",  req:true, ph:"33.0"},
    {k:"lbm",    label:"LBM (Lean Body Mass)", unit:"kg", req:true, ph:"50.0"},
    {k:"muscle", label:"กล้ามเนื้อโครงร่าง",     unit:"kg", req:false, ph:"27.0"},
    {k:"visceral",label:"Visceral Fat Level",   unit:"",   req:false, ph:"8"},
    {k:"bmr",    label:"BMR",     unit:"kcal", req:false, ph:"1450"},
    {k:"tee",    label:"TEE",     unit:"kcal", req:false, ph:"2200"},
    {k:"waist",  label:"รอบเอว",   unit:"cm",   req:false, ph:"88"},
  ];

  return <Modal close={close} title="📐 ผลสแกนรอบเดือน">
    <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{display:"none"}}/>

    {/* Image upload area */}
    {!img
      ?<div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${C.borderHi}`,borderRadius:16,padding:"24px 16px",textAlign:"center",cursor:"pointer",marginBottom:14}}>
        <div style={{fontSize:36,marginBottom:6}}>📸</div>
        <div style={{fontSize:13,color:C.cream,fontWeight:800}}>แตะอัปโหลดรูปผลสแกน (ไม่บังคับ)</div>
        <div style={{fontSize:10.5,color:C.faint,marginTop:4,fontWeight:600}}>Evolt 360 / InBody — เก็บไว้ดูประกอบ</div>
      </div>
      :<div style={{marginBottom:14}}>
        <div style={{position:"relative"}}>
          <img src={img} alt="scan" style={{width:"100%",borderRadius:16,maxHeight:280,objectFit:"contain",background:C.bg2,cursor:"pointer"}} onClick={()=>ref.current?.click()}/>
          <button onClick={()=>{setImg(null);setB64(null);}} style={{position:"absolute",top:8,right:8,background:C.pink,color:C.bg,border:"none",borderRadius:"50%",width:30,height:30,fontSize:16,fontWeight:900,cursor:"pointer"}}>×</button>
        </div>
        <button onClick={aiReadImage} disabled={aiLoading} style={{...sx.btnF(C.blue),marginTop:10,opacity:aiLoading?.6:1}}>{aiLoading?"🤖 AI กำลังอ่านค่า…":"✨ ให้ AI อ่านค่าจากรูปอัตโนมัติ"}</button>
      </div>}

    <div style={{fontSize:11.5,color:C.muted,marginBottom:11,lineHeight:1.6,fontWeight:600}}>📝 กรอกตัวเลขจากรูปด้านล่าง — ระบบจะวิเคราะห์ด้วยสูตรวิทยาศาสตร์ (Katch-McArdle BMR + protein 2.2g/kg LBM)</div>

    {/* Input grid */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {fields.map(f=>(
        <div key={f.k} style={{gridColumn:f.k==="lbm"?"1/-1":"auto"}}>
          <span style={sx.lbl}>{f.label} {f.unit&&<span style={{color:C.faint}}>({f.unit})</span>} {f.req&&<span style={{color:C.pink}}>*</span>}</span>
          <input style={sx.inp} type="number" step="0.1" placeholder={f.ph} value={v[f.k]} onChange={e=>setF(f.k,e.target.value)}/>
        </div>
      ))}
    </div>

    <button onClick={analyze} style={{...sx.btnF(C.purple),marginTop:14}}>✨ วิเคราะห์ + แนะนำการปรับแพลน</button>
    {err&&<div style={{color:C.pink,fontSize:12,marginTop:10,padding:"9px 12px",background:`${C.pink}15`,borderRadius:10,fontWeight:700}}>⚠️ {err}</div>}

    <div style={{fontSize:10,color:C.faint,marginTop:12,lineHeight:1.6,fontWeight:600}}>💡 ต้องกรอกอย่างน้อย: น้ำหนัก, ไขมัน%, LBM · ค่าที่เหลือกรอกได้จะแม่นขึ้น (ถ้าไม่กรอกระบบจะคำนวณจากสูตร)</div>
  </Modal>;
}


function KmTrack({km}){
  const ms=[10,25,50,75,100];
  return <div style={{position:"relative",marginTop:6}}>
    <div style={{background:C.border,borderRadius:8,height:12,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,(km/100)*100)}%`,height:"100%",background:`linear-gradient(90deg,${C.pink},${C.gold})`,transition:"width .8s ease"}}/>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:7}}>
      {ms.map(m=><div key={m} style={{textAlign:"center",flex:1}}>
        <div style={{fontSize:14,opacity:km>=m?1:.25}}>{km>=m?"🏅":"⚪"}</div>
        <div style={{fontSize:8.5,color:km>=m?C.gold:C.faint,fontWeight:800}}>{m}</div>
      </div>)}
    </div>
  </div>;
}

function WChart({data}){
  if(data.length<2) return <div style={{color:C.faint,fontSize:12.5,textAlign:"center",padding:"22px 0",fontWeight:600}}>ชั่งน้ำหนักอย่างน้อย 2 วัน เพื่อดูกราฟ</div>;
  const W=360,H=110,p=12,ws=data.map(d=>d.weight),mn=Math.min(...ws,GOAL_END)-.5,mx=Math.max(...ws)+.5;
  const xs=(i)=>p+(i/(data.length-1))*(W-p*2);
  const ys=(w)=>p+((mx-w)/(mx-mn))*(H-p*2);
  const ln=data.map((d,i)=>`${xs(i)},${ys(d.weight)}`).join(" ");
  const gY=ys(GOAL_END);
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%"}}>
    <defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity=".35"/><stop offset="100%" stopColor={C.blue} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`${xs(0)},${H-p} ${ln} ${xs(data.length-1)},${H-p}`} fill="url(#wg)"/>
    <line x1={p} x2={W-p} y1={gY} y2={gY} stroke={C.green} strokeWidth="1.5" strokeDasharray="5,4" opacity=".7"/>
    <text x={W-p} y={gY-5} fontSize="9" fill={C.green} textAnchor="end" fontWeight="700">เป้า 65</text>
    <polyline points={ln} fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
    {data.map((d,i)=><circle key={i} cx={xs(i)} cy={ys(d.weight)} r="3" fill={C.blueL}/>)}
  </svg>;
}

function RChart({data}){
  const W=360,H=90,p=10,max=Math.max(...data.map(d=>d.km),1),bw=(W-p*2)/data.length*.6;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%"}}>
    {data.map((d,i)=>{const x=p+(i+.5)/data.length*(W-p*2),h=(d.km/max)*(H-p*2);return <g key={i}>
      <rect x={x-bw/2} y={H-p-h} width={bw} height={h} rx={3} fill={C.pink} opacity={.55+.45*(i/data.length)}/>
      {data.length<=14&&<text x={x} y={H-1} fontSize="7" fill={C.faint} textAnchor="middle" fontWeight="700">{d.km.toFixed(1)}</text>}
    </g>;})}
  </svg>;
}

function wFeedback(hist,phase){
  if(hist.length<2)return{headline:"📝 เริ่มเก็บข้อมูล",body:"ชั่งน้ำหนักทุกเช้าให้ครบอย่างน้อย 1 สัปดาห์ แล้วระบบจะวิเคราะห์เทรนด์และให้ feedback ว่าโปรเกรสเป็นยังไง",tip:"💡 ดูค่าเฉลี่ย 7 วัน ไม่ใช่วันเดียว — น้ำหนักขึ้นลงรายวันเป็นเรื่องปกติ",color:C.muted};
  const r=hist.slice(-7),first=r[0].weight,last=r[r.length-1].weight;
  const days=Math.max(1,(new Date(r[r.length-1].date).getTime()-new Date(r[0].date).getTime())/86400000);
  const pw=(first-last)/days*7,t=0.83;
  if(pw>=t*.85)return{headline:"🔥 โปรเกรสเยี่ยมมาก",body:`7 วันล่าสุดลดได้ ${pw.toFixed(2)} kg/สัปดาห์ — ตรงหรือดีกว่าเป้าแผน (${t} kg/สัปดาห์) รักษาจังหวะนี้ไว้ เป้า 65 kg อยู่ในระยะที่ทำได้แน่`,tip:"💡 อย่าเร่งกว่านี้ — ลดเร็วเกินเสี่ยงเสียกล้าม โปรตีนให้ครบเป้าทุกวัน",color:C.green};
  if(pw>=t*.4)return{headline:"👍 ไปได้ดี แต่ช้ากว่าเป้านิด",body:`7 วันล่าสุดลด ${pw.toFixed(2)} kg/สัปดาห์ เป้าแผนคือ ${t} kg/สัปดาห์ ยังโอเค แต่ถ้าอยากตรงเป้าให้เช็ค deficit`,tip:`💡 ลองเพิ่ม NEAT (เดินให้ถึง 10,000 ก้าว) หรือเช็คว่าแคลที่กินตรงกับที่จดจริงไหม phase นี้เป้า ${phase.cal} kcal`,color:C.gold};
  if(pw>0)return{headline:"⚠️ โปรเกรสช้า",body:`7 วันล่าสุดลดแค่ ${pw.toFixed(2)} kg/สัปดาห์ ต่ำกว่าเป้า ${t} มาก อาจถึงจุด plateau หรือ deficit ไม่พอ`,tip:"💡 เช็ค 3 อย่าง: (1) ชั่งตวงอาหารแม่นไหม (2) นอนครบ 7 ชม.ไหม (3) โปรตีนถึง 110g+ ไหม",color:C.pink};
  return{headline:"📊 น้ำหนักนิ่ง/ขึ้น",body:`7 วันล่าสุดน้ำหนักไม่ลด (${pw.toFixed(2)} kg/สัปดาห์) — ถ้าเพิ่งเริ่ม phase หรือช่วงเมนส์ อาจเป็นน้ำ ปกติ`,tip:"💡 อย่าเพิ่งท้อ ดูต่ออีก 3-4 วัน · ถ้ายังนิ่ง ทบทวน deficit หรือปรึกษาหมอ",color:C.pink};
}

function rFeedback(runs,monthKm){
  if(runs.length<2)return"บันทึกการวิ่งให้ครบ 2-3 ครั้ง แล้วระบบจะวิเคราะห์แนวโน้มระยะทาง ความสม่ำเสมอ และแนะนำว่าควรเพิ่มระยะ Long Run ยังไงเพื่อไปให้ถึง 10K";
  const l3=runs.slice(-3),trend=l3[l3.length-1].km-l3[0].km,long=Math.max(...runs.map((r)=>r.km));
  let msg=`เดือนนี้สะสม ${monthKm.toFixed(1)} km จาก ${runs.length} การวิ่ง · ระยะไกลสุด ${long.toFixed(1)} km. `;
  if(trend>.3)msg+="ระยะกำลังเพิ่มขึ้นเรื่อยๆ — เยี่ยมมาก กำลังสร้าง base ที่ดีสู่ 10K ";
  else if(trend<-.3)msg+="ระยะ 3 ครั้งล่าสุดลดลง — สัปดาห์หน้าลองดันระยะ Long Run ขึ้นอีก 0.5-1 km ";
  else msg+="ระยะค่อนข้างคงที่ — ถ้าร่างกายไหว ลองเพิ่ม Long Run วันเสาร์ทีละนิด ";
  if(long<6)msg+="· เป้าถัดไป: แตะ 6 km ให้ได้ก่อนจบ Phase 3";
  else if(long<10)msg+="· เป้าถัดไป: ค่อยๆ ขยับเข้าใกล้ 10K ใน Phase 4";
  else msg+="· คุณแตะ 10K แล้ว! 🎉 รักษาความสม่ำเสมอไว้";
  return msg;
}

// ─── HABITS SECTION (Calendar + Streak + Tier) ───────────────────
function HabitsSection({logs,sx,goalsFor,totalStars,tier,streak,streakBadge,calMon,setCalMon}){
  // ปฏิทินของเดือน calMon (YYYY-MM)
  const [y,m] = calMon.split("-").map(Number);
  const firstDay = new Date(y,m-1,1).getDay(); // 0=Sun
  const daysInMonth = new Date(y,m,0).getDate();
  // จำนวนดาวต่อวัน
  const starsForDay = (k) => {
    const d = logs[k]; if(!d) return -1;
    const g = goalsFor(k);
    return calcStars(d,g).stars;
  };
  // สีตามจำนวนดาว
  const colorFor = (s) => s===5?C.gold:s===4?C.green:s===3?C.blue:s>=1?C.purple:s===0?C.pink:"transparent";
  const prevMon = () => {
    const dt=new Date(y,m-2,1);
    setCalMon(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);
  };
  const nextMon = () => {
    const dt=new Date(y,m,1);
    setCalMon(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);
  };
  const monStars = useMemo(()=>{
    let s=0;
    for(let i=1;i<=daysInMonth;i++){
      const k=`${y}-${String(m).padStart(2,"0")}-${String(i).padStart(2,"0")}`;
      const v=starsForDay(k);
      if(v>0) s+=v;
    }
    return s;
  },[logs,calMon]);

  const monthNames=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

  return <>
    {/* Tier card */}
    <div style={{...sx.card,background:`linear-gradient(135deg,${C.purple}30,${C.gold}20)`,borderColor:`${C.gold}66`,textAlign:"center"}}>
      <div style={{fontSize:50,marginBottom:6}}>{tier.cur.icon}</div>
      <div style={{fontSize:20,fontWeight:900,color:C.gold,fontFamily:F.round}}>{tier.cur.name}</div>
      <div style={{fontSize:11.5,color:C.muted,fontWeight:700,marginTop:4}}>{tier.cur.msg}</div>
      <div style={{marginTop:14,padding:"10px 14px",background:C.bg2,borderRadius:13,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
          <span style={{fontSize:11,color:C.faint,fontWeight:800}}>ดาวสะสมทั้งหมด</span>
          <span style={{fontSize:18,fontWeight:900,color:C.gold,fontFamily:F.round}}>{totalStars} ⭐</span>
        </div>
        {tier.next&&<>
          <div style={{height:8,background:C.border,borderRadius:5,overflow:"hidden"}}>
            <div style={{width:`${Math.min(100,tier.progress*100)}%`,height:"100%",background:`linear-gradient(90deg,${C.gold},${C.pink})`,transition:"width .8s ease"}}/>
          </div>
          <div style={{fontSize:10,color:C.faint,fontWeight:700,marginTop:6,textAlign:"center"}}>อีก {tier.next.min - totalStars} ⭐ → {tier.next.icon} {tier.next.name}</div>
        </>}
        {!tier.next&&<div style={{fontSize:11,color:C.gold,fontWeight:800,textAlign:"center",marginTop:4}}>🎉 พิชิตทุก Tier!</div>}
      </div>
    </div>

    {/* Streak card */}
    <div style={{...sx.card,background:`linear-gradient(135deg,${C.pink}20,${C.gold}15)`,borderColor:`${C.pink}55`}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{textAlign:"center",padding:"11px",background:C.bg2,borderRadius:13,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,fontWeight:900,color:C.pink,fontFamily:F.round}}>{streak.current}</div>
          <div style={{fontSize:10,color:C.muted,fontWeight:800,marginTop:2}}>🔥 ติดต่อกัน (วัน)</div>
        </div>
        <div style={{textAlign:"center",padding:"11px",background:C.bg2,borderRadius:13,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,fontWeight:900,color:C.gold,fontFamily:F.round}}>{streak.best}</div>
          <div style={{fontSize:10,color:C.muted,fontWeight:800,marginTop:2}}>🏆 Best Streak</div>
        </div>
      </div>
      {/* Streak milestones */}
      <div style={{marginTop:12,paddingTop:11,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:10.5,color:C.faint,fontWeight:800,marginBottom:8,letterSpacing:.4}}>STREAK MILESTONES</div>
        <div style={{display:"flex",justifyContent:"space-between",gap:5}}>
          {STREAK_MILESTONES.map(m=>{
            const got = streak.current>=m.days;
            return <div key={m.days} style={{flex:1,textAlign:"center",padding:"7px 2px",borderRadius:10,background:got?`${C.gold}25`:"transparent",border:`1px solid ${got?C.gold:C.border}`,opacity:got?1:.4}}>
              <div style={{fontSize:18,marginBottom:2}}>{m.icon}</div>
              <div style={{fontSize:9.5,color:got?C.gold:C.faint,fontWeight:800}}>{m.days}d</div>
            </div>;
          })}
        </div>
      </div>
    </div>

    {/* Calendar */}
    <div style={sx.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
        <button onClick={prevMon} style={{background:"transparent",border:`1.5px solid ${C.border}`,color:C.cream,width:34,height:34,borderRadius:"50%",fontSize:18,cursor:"pointer",fontWeight:900}}>‹</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:900,color:C.cream}}>📅 {monthNames[m-1]} {y+543}</div>
          <div style={{fontSize:10.5,color:C.gold,fontWeight:800,marginTop:2}}>เดือนนี้ได้ {monStars} ⭐</div>
        </div>
        <button onClick={nextMon} style={{background:"transparent",border:`1.5px solid ${C.border}`,color:C.cream,width:34,height:34,borderRadius:"50%",fontSize:18,cursor:"pointer",fontWeight:900}}>›</button>
      </div>
      {/* Days of week header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
        {["อา","จ","อ","พ","พฤ","ศ","ส"].map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:10,color:C.faint,fontWeight:800,padding:"4px 0"}}>{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const k=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const s=starsForDay(k);
          const today=k===new Date().toISOString().slice(0,10);
          const future=new Date(k)>new Date();
          return <div key={d} style={{aspectRatio:"1",borderRadius:9,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:s>=0?`${colorFor(s)}22`:future?"transparent":`${C.pink}08`,border:`1.5px solid ${today?C.gold:s>=0?colorFor(s)+"66":future?C.border:C.border}`,opacity:future?.4:1}}>
            <div style={{fontSize:11,fontWeight:800,color:today?C.gold:s>=0?colorFor(s):C.faint}}>{d}</div>
            {s>=0&&<div style={{fontSize:9,fontWeight:900,color:colorFor(s),marginTop:1}}>{s===5?"⭐⭐⭐⭐⭐":s===4?"⭐⭐⭐⭐":s===3?"⭐⭐⭐":s===2?"⭐⭐":s===1?"⭐":"·"}</div>}
          </div>;
        })}
      </div>
      {/* Legend */}
      <div style={{marginTop:13,paddingTop:11,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",fontSize:9.5,color:C.faint,fontWeight:700,flexWrap:"wrap",gap:5}}>
        <span><span style={{color:C.gold}}>●</span> 5⭐</span>
        <span><span style={{color:C.green}}>●</span> 4⭐</span>
        <span><span style={{color:C.blue}}>●</span> 3⭐</span>
        <span><span style={{color:C.purple}}>●</span> 1-2⭐</span>
        <span><span style={{color:C.pink}}>●</span> ขาด</span>
      </div>
    </div>

    {/* Tier list */}
    <div style={sx.card}>
      <div style={{fontSize:13,fontWeight:900,color:C.cream,marginBottom:11}}>🏆 Tier Roadmap · เส้นทางสู่ 65 kg</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {TIERS.map((t,i)=>{
          const reached = totalStars>=t.min;
          const isCur = tier.cur.min===t.min;
          return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:isCur?`${C.gold}22`:reached?`${C.green}15`:C.bg2,border:`1.5px solid ${isCur?C.gold:reached?C.green+"55":C.border}`,opacity:reached?1:.55}}>
            <div style={{fontSize:24}}>{t.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:900,color:isCur?C.gold:reached?C.green:C.cream}}>{t.name} {isCur&&<span style={{fontSize:10,color:C.gold,fontWeight:800}}>· ตอนนี้</span>}</div>
              <div style={{fontSize:10.5,color:C.muted,fontWeight:700,marginTop:1}}>{t.msg}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,fontWeight:900,color:reached?C.gold:C.faint}}>{t.min} ⭐</div>
              {reached&&<div style={{fontSize:9,color:C.green,fontWeight:800}}>✓</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
  </>;
}
