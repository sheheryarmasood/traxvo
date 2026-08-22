/* ============================================================
   Maid Ops — agent brain + quote engine
   ------------------------------------------------------------
   THE RATE CARD BELOW IS THE ONLY THING THAT NEEDS TO BE
   CORRECTED BEFORE THIS IS REAL. It is anchored to the one
   real figure we have — $150–200 for ~2,500 sq ft on a
   recurring clean, 2-person crew, 2–3 hours. Everything else
   (frequency and service-type multipliers, add-on prices) is a
   reasonable industry placeholder, NOT the client's data.
   The owners should overwrite these numbers directly.
   ============================================================ */

const USE_LLM = false;   // demo path: scripted, offline, deterministic

const PERSONA = {
  name: 'Maya',
  role: 'TidyNest Cleaning — booking assistant',
  greeting: "Hi, you've reached TidyNest Cleaning — I'm Maya. 👋 I can price a clean and book it for you right now, no home visit needed. Are you looking for a regular clean, a one-time clean, or a move-in/move-out?"
};

/* ------------------------------------------------------------
   1. RATE CARD — recurring (bi-weekly) baseline, 2-person crew.
   Anchor: 2,000–2,500 sq ft => $150–200, 2.5–3 hrs. CLIENT-CONFIRMED.
   ------------------------------------------------------------ */
const RATE_BANDS = [
  { maxSqft: 1000, low:110, high:140, hours:1.5, label:'Condo / apartment' },
  { maxSqft: 1500, low:125, high:160, hours:2.0, label:'Small home' },
  { maxSqft: 2000, low:140, high:180, hours:2.5, label:'Mid-size home' },
  { maxSqft: 2500, low:150, high:200, hours:3.0, label:'Standard home' },   // <-- the real anchor
  { maxSqft: 3500, low:190, high:250, hours:3.5, label:'Large home' },
  { maxSqft: Infinity, low:null, high:null, hours:null, label:'Estate — in-home estimate' }
];

/* Multipliers applied to the recurring baseline. PLACEHOLDERS —
   these are the numbers most likely to be wrong. */
const FREQUENCY_MULT = {
  'weekly':    { m:0.90, label:'Weekly' },
  'bi-weekly': { m:1.00, label:'Every 2 weeks' },
  'monthly':   { m:1.15, label:'Monthly' }
};
/* m = price multiplier, hoursM = time multiplier. They are NOT the same:
   a move-out costs 2.4x a recurring clean but takes 2x the time, because
   the premium is scarcity and scope, not purely labour hours.
   Calibration note: these are set so a 1,800 sq ft one-time lands near
   $295–380, which brackets the publicly reported $300–450 for that size.
   Replace with the franchise's real numbers. */
const SERVICE_MULT = {
  'recurring':  { m:1.00, hoursM:1.0, label:'Recurring clean',       estimate:false },
  'first':      { m:1.70, hoursM:1.5, label:'First-time deep clean', estimate:false },
  'onetime':    { m:2.10, hoursM:1.6, label:'One-time clean',        estimate:false },
  'moveout':    { m:2.40, hoursM:2.0, label:'Move-in / move-out',    estimate:false },
  'postreno':   { m:2.80, hoursM:2.4, label:'Post-renovation',       estimate:true  },
  'commercial': { m:null, hoursM:null,label:'Light commercial',      estimate:true  }
};

const ADDONS = {
  'windows':  { price:60, label:'Interior windows' },
  'fridge':   { price:35, label:'Inside fridge' },
  'oven':     { price:35, label:'Inside oven' },
  'cabinets': { price:45, label:'Inside cabinets' },
  'basement': { price:30, label:'Finished basement' }
};
const PET_SURCHARGE  = 15;    // extra hair / time
const HEAVY_CONDITION_MULT = 1.25;

/* When the agent must stop quoting and book a real visit.
   The point of the agent is not to quote everything — it is to
   quote the 80% that is standard and protect the margin on the rest. */
const ESTIMATE_TRIGGERS = [
  'Over 3,500 sq ft',
  'Post-renovation or post-construction',
  'Light commercial / office',
  'Customer describes heavy build-up, hoarding, or biohazard',
  'Customer asks for an in-home visit'
];

/* ------------------------------------------------------------
   2. QUOTE ENGINE
   ------------------------------------------------------------ */
function bandFor(sqft){ return RATE_BANDS.find(b => sqft <= b.maxSqft); }

function quote({ sqft, service='recurring', frequency='bi-weekly', addons=[], pets=false, heavy=false }){
  const band = bandFor(sqft);
  const svc  = SERVICE_MULT[service] || SERVICE_MULT.recurring;

  if(!band.low || svc.estimate || heavy){
    return { estimateRequired:true, band, service:svc,
             reason: !band.low ? 'over 3,500 sq ft'
                   : svc.estimate ? svc.label.toLowerCase()
                   : 'heavy build-up described' };
  }

  const freq = (service==='recurring') ? (FREQUENCY_MULT[frequency] || FREQUENCY_MULT['bi-weekly'])
                                       : { m:1, label:'One-off' };
  const mult = svc.m * freq.m * (heavy ? HEAVY_CONDITION_MULT : 1);
  const addonTotal = addons.reduce((s,a)=> s + (ADDONS[a]?.price || 0), 0);
  const pet = pets ? PET_SURCHARGE : 0;

  const low  = Math.round((band.low  * mult + addonTotal + pet) / 5) * 5;
  const high = Math.round((band.high * mult + addonTotal + pet) / 5) * 5;
  const hours = Math.round(band.hours * (svc.hoursM ?? 1) * 2) / 2;

  return { estimateRequired:false, low, high, hours, band, service:svc, frequency:freq,
           addonTotal, pet, crewSize: BIZ.crewSize };
}

/* What an in-home estimate actually costs to run — this is the
   number the demo counts up every time the agent avoids one. */
const ESTIMATE_COST = { minutes:90, km:34, staffCost:55 };

/* ------------------------------------------------------------
   3. CANCELLATION BACKFILL
   A same-day cancel strands a 2-person crew and a company car.
   ------------------------------------------------------------ */
const BACKFILL = {
  offerCount: 3,          // how many flexible customers get the offer at once
  discountPct: 15,        // short-notice incentive
  responseSec: 6          // demo-compressed; real world is minutes
};

/* ------------------------------------------------------------
   4. ESCALATE TO THE HUMAN MANAGER
   The agent takes repetitive volume. Judgement stays human.
   ------------------------------------------------------------ */
const ESCALATE = {
  match: ['complaint','damaged','broke','stolen','missing','theft','injured','refund',
          'cancel my service','cancel my contract','speak to a manager','speak to someone',
          'talk to a human','manager','supervisor','lawyer','insurance'],
  response:
    "That's one for a person, not me — I'm not going to try to handle it myself.<br><br>" +
    "I've passed the full details to our operations manager along with your account and " +
    "today's schedule, and they'll call you back directly. If it's urgent you can reach " +
    "the office on <b>905.555.0142</b> (Brampton East) or <b>289.555.0198</b> (Brampton West)."
};

/* Satisfaction guarantee is a brand obligation — it gets its own lane. */
const GUARANTEE = {
  match: ['not happy','unhappy','not satisfied','wasn\'t clean','was not clean','poor job',
          'missed a room','missed the','did a bad','redo','re-clean','reclean','disappointed'],
  response:
    "I'm sorry — that shouldn't have happened, and it's covered by our " +
    "<b>Clean-Again Promise</b>.<br><br>" +
    "I can book a <b>re-clean of the areas you're not happy with, at no charge, within 24 hours</b>. " +
    "Which rooms were the problem?"
};

/* ------------------------------------------------------------
   5. GENERAL INTENTS
   Every fact traceable to tidynest.ca.
   ------------------------------------------------------------ */
const GENERAL_INTENTS = [
  { id:'hours', match:['hours','open','what time','closed','sunday','weekend'],
    reply:"The office is open <b>Mon–Fri 8:00am–9:30pm</b> and <b>Sat 9:00am–2:00pm</b>, closed Sunday — " +
          "but I'm here any hour, so I can price and book your clean right now regardless." },
  { id:'area', match:['do you cover','service area','do you come to','are you in','which areas'],
    reply:"We cover <b>Brampton East</b> — Albion, Bolton, Bramalea, Caledon East, Castlemore, Tullamore, Woodhill — " +
          "and <b>Brampton West</b> — Boston Mills, Cheltenham, Churchville, Huttonville, Inglewood, Mount Pleasant, " +
          "Northwood Park and Peel Village. Which neighbourhood are you in?" },
  { id:'supplies', match:['supplies','products','bring your own','equipment','vacuum','eco','green','chemicals'],
    reply:"Our teams bring everything — supplies and equipment included, nothing for you to provide. " +
          "We also offer <b>green / eco cleaning</b> if you'd prefer that. Any products you'd like us to avoid?" },
  { id:'trust', match:['insured','bonded','background','police check','trust','same cleaner','who comes'],
    reply:"Every clean is done by a <b>2-person TidyNest team</b> in a company vehicle — trained, screened and insured — " +
          "and we work to keep the same team on your home. Everything is backed by our " +
          "<b>Clean-Again Promise</b>." },
  { id:'home', match:['do i need to be home','have to be home','not home','key','lockbox','alarm code','garage code'],
    reply:"You don't need to be home. Most of our customers give us a key, a lockbox code or a garage code, " +
          "and we note the alarm instructions on your file. Would you like to set that up when we book?" },
  { id:'reschedule', match:['reschedule','move my','change my appointment','different day','push back','skip'],
    reply:"I can do that now. What's the name on the account, and which date are you trying to move?" },
  { id:'whattime', match:['what time','when are they coming','are they coming','eta','running late','how long'],
    reply:"I can check that. What's the name on the account? I'll pull up today's route and tell you the arrival window." },
  { id:'payment', match:['pay','payment','credit card','e-transfer','invoice','tip','cash'],
    reply:"Payment is taken on the day of service, and we can keep a card securely on file so there's nothing to handle each visit. " +
          "I can't take card details over chat — the office sets that up on a secure link." },
  { id:'thanks', match:['thank','thanks','appreciate','great','perfect'],
    reply:"My pleasure. 🙂 Anything else I can sort out?" },
  { id:'bye', match:['bye','goodbye','that\'s all','thats all','nothing else','all good'],
    reply:"Lovely — we'll see you then. If anything changes, just message this number any time." }
];

const FALLBACK =
  "I want to get this right rather than guess. Could you tell me a bit more?<br><br>" +
  "If it's easier, I can have our operations manager call you back — or reach the office on " +
  "<b>905.555.0142</b> (East) / <b>289.555.0198</b> (West).";

/* ------------------------------------------------------------
   6. CHANNELS — this franchise does NOT control tidynest.ca,
   so there is no website widget. Phone and text are the product.
   ------------------------------------------------------------ */
const CHANNELS = [
  { id:'voice', icon:'📞', name:'Voice', tag:'VOICE · transcribed', status:'live',
    platform:'Twilio ConversationRelay',
    note:'Answers both local numbers. Unlimited simultaneous calls — the manager can only take one.' },
  { id:'sms', icon:'💬', name:'SMS', tag:'SMS', status:'live',
    platform:'Twilio Programmable Messaging',
    note:'Same two numbers. Reschedules, arrival windows and short-notice offers.' },
  { id:'wa', icon:'🟩', name:'WhatsApp', tag:'WHATSAPP', status:'live',
    platform:'Twilio WhatsApp Business API',
    note:'Widely used across Brampton — worth switching on at launch, not later.' },
  { id:'email', icon:'✉️', name:'Email', tag:'EMAIL', status:'planned',
    platform:'SendGrid — send + Inbound Parse',
    note:'Quote confirmations and booking receipts. Phase 2.' },
  { id:'web', icon:'🚫', name:'Website widget', tag:'WEB', status:'blocked',
    platform:'tidynest.ca is corporate-controlled',
    note:'Franchisee cannot modify the corporate site. Phone and text are the front door instead.' }
];
