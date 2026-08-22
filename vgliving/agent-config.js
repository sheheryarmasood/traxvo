/* ============================================================
   VG Care Ops — agent brain configuration
   ------------------------------------------------------------
   Everything the agent knows and every rule it follows lives in
   this file, deliberately. It is readable by a non-programmer,
   which means the client can audit and tune it.

   Demo runs fully offline on the rules below. Setting USE_LLM to
   true routes anything the rules don't match to a language model
   instead of the fallback line — the rules, guardrails and
   dispatch logic still run first, either way.
   ============================================================ */

const USE_LLM = false;   // demo path: scripted, offline, deterministic

const PERSONA = {
  name: 'Vera',
  role: "VG Living's Care assistant",
  greeting: "Hi, this is Vera — VG Living Care. 👋 Tell me what's happening and I'll get it handled. If it's an emergency, say so and I'll move immediately."
};

/* ------------------------------------------------------------
   1. LIFE SAFETY — bypasses all triage, deflection and queueing.
   These never become a ticket first. They become a phone call.
   ------------------------------------------------------------ */
const LIFE_SAFETY = {
  match: [
    'smell gas','gas smell','smells like gas','gas leak','natural gas',
    'fire','smoke in','something burning','burning smell','sparking','sparks',
    'carbon monoxide','co alarm','co detector',
    'stuck in the elevator','trapped in the elevator','stuck in elevator','elevator stuck',
    'someone is hurt','someone got hurt','injured','can\'t breathe','cant breathe',
    'break in','broke in','intruder'
  ],
  response:
    "⚠️ <b>Stop and do this first.</b><br><br>" +
    "1. Leave the unit now and get everyone out with you.<br>" +
    "2. Don't use light switches, appliances or the elevator.<br>" +
    "3. Once you're outside, call <b>911</b>.<br>" +
    "4. If you smell gas, also call Enbridge at <b>1-XXX-XXX-XXXX</b>.<br><br>" +
    "I've alerted VG Living's on-call manager with your unit number right now. " +
    "Do not wait for a reply from me — make the call."
};

/* ------------------------------------------------------------
   2. LEGAL GUARDRAIL — the agent does not practise law.
   Ontario tenancy questions get acknowledged and handed to a human.
   ------------------------------------------------------------ */
const LEGAL_GUARDRAIL = {
  match: [
    'evict','eviction','ltb','landlord and tenant board','landlord tenant board',
    'n1','n4','n5','n12','n13','notice to end','end my tenancy','end the tenancy',
    'rent increase','raise my rent','raise the rent','rent control','above guideline',
    'legal','lawyer','sue','court','my rights','tenant rights','illegal'
  ],
  response:
    "That's a tenancy-law question, and I'm not the right one to answer it — " +
    "getting it wrong could cost you or the owner real money, so I won't guess.<br><br>" +
    "I've flagged this for VG Living's management team and they'll follow up directly. " +
    "You can also reach them at <b>contact@vgliving.ca</b> or <b>+1 (XXX) XXX-XXXX</b>.<br><br>" +
    "Anything on the maintenance side I <i>can</i> take care of right now?"
};

/* ------------------------------------------------------------
   3. PRIORITY MATRIX
   slaOnSite    — what the tenant is promised
   escalateSec  — how long a vendor has to accept before the agent
                  automatically rolls the job to the next vendor
                  (demo seconds; realMin is what it means in production)
   ------------------------------------------------------------ */
const PRIORITIES = {
  P1: { label:'Emergency', color:'#e5484d', slaOnSite:'on site within 2 hours',        escalateSec:8,  realMin:10  },
  P2: { label:'Urgent',    color:'#E9BE61', slaOnSite:'on site within 24 hours',       escalateSec:10, realMin:30  },
  P3: { label:'Routine',   color:'#7d8896', slaOnSite:'on site within 3 business days', escalateSec:12, realMin:240 }
};

/* ------------------------------------------------------------
   4. TRIAGE RULES — first match wins, so order matters.
   deflect points at a self-resolution script (section 5).
   buildingWide marks categories that get deduplicated when
   several units report the same thing (section 6).
   ------------------------------------------------------------ */
const TRIAGE = [
  // --- plumbing
  { id:'flood',      label:'Burst pipe / flooding',    trade:'plumbing',   priority:'P1',
    match:['burst','flood','flooding','water everywhere','pouring','gushing','pipe broke','ceiling leaking','water coming through'],
    firstAid:"Turn off the shut-off valve if you can reach it safely — usually under the sink or behind the toilet. If it's the whole unit, the main is in the utility closet. Move anything valuable off the floor." },
  { id:'nowater',    label:'No water',                 trade:'plumbing',   priority:'P1',
    match:['no water','water is off','no running water'], buildingWide:true },
  { id:'sewage',     label:'Sewage backup',            trade:'plumbing',   priority:'P1',
    match:['sewage','sewer','backing up','back up into','toilet overflowing','overflowing'] },
  { id:'toiletclog', label:'Toilet clogged',           trade:'plumbing',   priority:'P2',
    match:['toilet is clogged','toilet clogged','toilet won\'t flush','toilet wont flush','clogged toilet'], deflect:'toilet_clog' },
  { id:'slowdrain',  label:'Slow / clogged drain',     trade:'plumbing',   priority:'P3',
    match:['slow drain','drain is slow','sink won\'t drain','sink wont drain','draining slowly','clogged drain','shower not draining'], deflect:'slow_drain' },
  { id:'drip',       label:'Dripping tap / minor leak',trade:'plumbing',   priority:'P3',
    match:['dripping','drip','small leak','faucet leaking','tap leaking','running toilet'] },

  // --- HVAC
  { id:'noheat',     label:'No heat',                  trade:'hvac',       priority:'P1',
    match:['no heat','heat is not working','heat isn\'t working','heating not working','freezing','so cold','radiator cold'],
    deflect:'thermostat_check', buildingWide:true,
    firstAid:"Heat is a legal requirement in Ontario between September 1 and June 15, so this gets treated as an emergency in that window." },
  { id:'nohotwater', label:'No hot water',             trade:'hvac',       priority:'P2',
    match:['no hot water','hot water','water is cold','only cold water','water not heating'], buildingWide:true },
  { id:'noac',       label:'No A/C',                   trade:'hvac',       priority:'P2',
    match:['no ac','no a/c','air conditioning','ac not working','ac is not working','too hot'], deflect:'thermostat_check' },

  // --- electrical
  { id:'nopower',    label:'No power — full unit',     trade:'electrical', priority:'P1',
    match:['no power at all','whole unit','power is out','no electricity','all the power'], buildingWide:true },
  { id:'partpower',  label:'No power — partial',       trade:'electrical', priority:'P2',
    match:['no power','outlet','outlets','plugs don\'t work','plugs dont work','half my unit','lights out','breaker'], deflect:'gfci_reset' },
  { id:'smokealarm', label:'Smoke alarm chirping',     trade:'life-safety',priority:'P2',
    match:['smoke alarm','smoke detector','chirping','beeping every'], deflect:'smoke_alarm_chirp' },

  // --- appliance
  { id:'fridge',     label:'Fridge not cooling',       trade:'appliance',  priority:'P2',
    match:['fridge','refrigerator','freezer','food spoiling'] },
  { id:'disposal',   label:'Garburator jammed',        trade:'appliance',  priority:'P3',
    match:['garburator','garbage disposal','disposal','humming'], deflect:'garburator_reset' },
  { id:'dishwasher', label:'Dishwasher not draining',  trade:'appliance',  priority:'P3',
    match:['dishwasher'], deflect:'dishwasher_filter' },
  { id:'appliance',  label:'Appliance fault',          trade:'appliance',  priority:'P3',
    match:['stove','oven','washer','dryer','microwave','range hood'] },

  // --- access & security
  { id:'lockout',    label:'Lockout',                  trade:'locksmith',  priority:'P1',
    match:['locked out','lost my key','lost my keys','key doesn\'t work','key doesnt work','can\'t get in','cant get in'] },
  { id:'security',   label:'Entry door not securing',  trade:'locksmith',  priority:'P2',
    match:['front door won\'t lock','door won\'t lock','door wont lock','lobby door','buzzer','fob not working'] },

  // --- common areas
  { id:'elevator',   label:'Elevator out of service',  trade:'general',    priority:'P2',
    match:['elevator','lift is'], buildingWide:true },
  { id:'pest',       label:'Pest control',             trade:'general',    priority:'P2',
    match:['cockroach','roaches','mice','mouse','rats','bed bug','bedbug','ants','pest'] },
  { id:'commonarea', label:'Common area issue',        trade:'general',    priority:'P3',
    match:['hallway','lobby','garbage room','parking','laundry room','stairwell','light in the hall'], buildingWide:true },

  // --- catch-alls. These sit LAST on purpose: first match wins, so every
  // specific rule above gets its shot first. Their job is to turn a vague
  // "something's wrong with my sink" into a real ticket instead of a dead end.
  { id:'plumbgen', label:'Plumbing — needs assessment', trade:'plumbing',  priority:'P3',
    match:['sink','faucet','shower','bathtub','plumbing','water pressure'] },
  { id:'generalfix', label:'General repair — needs assessment', trade:'general', priority:'P3',
    match:['window','door','wall','ceiling','floor','cabinet','handle','hinge','closet','blind',
           'broken','not working','isn\'t working','doesn\'t work','repair','fix','damaged'] }
];

/* ------------------------------------------------------------
   5. DEFLECTION SCRIPTS — try the free fix before spending money.
   savedFee is the call-out that did not get spent when it works.
   ------------------------------------------------------------ */
const DEFLECTIONS = {
  gfci_reset: { title:'GFCI / breaker reset', savedFee:195, trade:'electrical',
    ask:"Before I send an electrician — this is very often a tripped GFCI, and you can clear it in about a minute.<br><br>" +
        "1. Check the outlets in your <b>bathroom and kitchen</b> for a small <b>RESET</b> button between the plugs.<br>" +
        "2. Press it firmly until it clicks.<br>" +
        "3. If nothing, open your breaker panel and look for a switch sitting between ON and OFF. Push it fully <b>OFF</b>, then back <b>ON</b>.<br><br>" +
        "Did that bring the power back?" },
  breaker_reset: { title:'Breaker reset', savedFee:195, trade:'electrical',
    ask:"Open your breaker panel and look for a switch sitting between ON and OFF. Push it fully <b>OFF</b>, then firmly back <b>ON</b>. Any luck?" },
  garburator_reset: { title:'Disposal reset', savedFee:140, trade:'appliance',
    ask:"If it's humming but not turning, it's jammed rather than broken — there's a fix that takes 30 seconds.<br><br>" +
        "1. Switch it <b>off</b> at the wall.<br>" +
        "2. Underneath the unit there's a small <b>red reset button</b> — press it.<br>" +
        "3. Turn it back on and run cold water.<br><br>" +
        "⚠️ Never put your hand inside the unit. Did it clear?" },
  thermostat_check: { title:'Thermostat check', savedFee:220, trade:'hvac',
    ask:"Quick check first, because this is a very common one:<br><br>" +
        "1. Is the thermostat set to <b>HEAT</b> (or COOL) rather than OFF or FAN?<br>" +
        "2. Is the setpoint at least 3° past the current room temperature?<br>" +
        "3. Is the display dim or blank? If so it likely needs <b>batteries</b>.<br><br>" +
        "Any change?" },
  toilet_clog: { title:'Plunger guidance', savedFee:185, trade:'plumbing',
    ask:"Worth trying a plunger before I book a plumber — <b>stop flushing</b> first, or it'll overflow.<br><br>" +
        "Use a flange plunger, cover the drain hole completely, and give 10–15 firm pushes without breaking the seal. Did it clear?" },
  slow_drain: { title:'Drain clearing', savedFee:185, trade:'plumbing',
    ask:"Try this first: pull the stopper and clear any hair or buildup you can reach, then run <b>hot</b> water for two minutes.<br><br>" +
        "Please don't use chemical drain cleaner — it damages the pipes and we'd have to bill for that. Any better?" },
  dishwasher_filter: { title:'Filter clean', savedFee:140, trade:'appliance',
    ask:"Nine times in ten this is the filter. Pull out the bottom rack, twist the <b>round filter</b> at the base counter-clockwise, rinse it under the tap, and click it back in. Then run a short cycle. Did it drain?" },
  smoke_alarm_chirp: { title:'Alarm battery', savedFee:250, trade:'life-safety',
    ask:"A single chirp every 30–60 seconds is a low battery, not a fault.<br><br>" +
        "⚠️ First — is it <b>chirping intermittently</b>, or <b>sounding continuously</b>? If it's a continuous alarm, get out and call 911.<br><br>" +
        "If it's chirping: twist the alarm off its base and swap the 9V battery. Did that stop it?" }
};

/* ------------------------------------------------------------
   6. DEDUPLICATION — the building-vs-house rule.
   Several units reporting the same category inside the window is
   one building fault, not N tickets.
   ------------------------------------------------------------ */
const DEDUP = {
  windowMin: 60,      // reports within this window are considered related
  minReports: 2,      // at this many, escalate to a building-level work order
  broadcast: true     // and notify every unit so the phone stops ringing
};

/* ------------------------------------------------------------
   7. GENERAL Q&A — non-maintenance intents.
   Every fact here is traceable to vgliving.ca.
   ------------------------------------------------------------ */
const GENERAL_INTENTS = [
  { id:'rentpay', match:['pay rent','rent payment','pay my rent','e-transfer','pre-authorized','when is rent due','late on rent'],
    reply:"Rent is handled through the VG Living resident portal — you can pay and see your ledger there. " +
          "If you're having trouble logging in, email <b>care@vgliving.ca</b> and the team will sort it out.<br><br>" +
          "If this is about being short this month, tell the management team early rather than late — reach them at <b>contact@vgliving.ca</b>. I'll leave that with a human." },
  { id:'hours',   match:['hours','open','what time','after hours','weekend'],
    reply:"For maintenance, I'm here <b>24/7</b> — that's the point of me. Emergencies get dispatched immediately, any hour.<br><br>" +
          "Routine requests logged overnight get picked up first thing. The office line is <b>+1 (XXX) XXX-XXXX</b> (select <b>Care</b>)." },
  { id:'status',  match:['status','update','any news','when is someone coming','still waiting','eta'],
    reply:"I can check that. What's your <b>unit number</b>? I'll pull up the work order and tell you exactly where it stands and who's assigned." },
  { id:'owner',   match:['i own','my property','manage my','landlord','investment property','what do you charge','management fee','rental analysis','what should my property rent'],
    reply:"You're in the right place — VG Living manages property for owners across Ontario, with 20+ years of multi-residential experience behind it.<br><br>" +
          "I can set up a <b>free rental analysis</b> — what your property should rent for and what management would look like. What's the property address?",
    lane:'owner' },
  { id:'lease',   match:['for rent','available','vacancy','apply','application','viewing','tour','looking to rent'],
    reply:"We currently have <b>33 Erie Avenue #709, Brantford</b> — 3 bed, 2 bath, <b>$2,050/month</b>.<br><br>" +
          "Applications go through the VG Living portal, and screening covers credit history, employment verification and references. " +
          "Want me to send you the application link and pass your details to the leasing team?",
    lane:'lease' },
  { id:'who',     match:['who are you','are you a bot','are you human','is this a robot','real person'],
    reply:"I'm Vera — VG Living's Care assistant. I'm software, not a person, and I'd rather say so up front.<br><br>" +
          "I can triage and dispatch a repair end to end on my own. Anything involving money over the approval limit, tenancy law, or a judgement call goes to a human on the VG team." },
  { id:'thanks',  match:['thank','thanks','appreciate','cheers','great'],
    reply:"Any time. 🙂 Anything else while I'm here?" },
  { id:'bye',     match:['bye','goodbye','that\'s all','thats all','nothing else','all good'],
    reply:"Take care. If anything changes, message me any hour — <b>+1 (XXX) XXX-XXXX</b>, select Care." }
];

/* ------------------------------------------------------------
   8. CHANNELS — where the agent actually reaches people.
   "live" = built in phase 1. "planned" = phase 2, priced separately.
   The demo itself sends nothing; this is the production routing.
   ------------------------------------------------------------ */
const CHANNELS = [
  { id:'sms', icon:'💬', name:'SMS', tag:'SMS', status:'live',
    platform:'Twilio Programmable Messaging',
    note:'Local 289 number. The primary tenant channel — tenants text, they don\'t log into portals.' },
  { id:'voice', icon:'📞', name:'Voice', tag:'VOICE · transcribed', status:'live',
    platform:'Twilio ConversationRelay',
    note:'The existing "Select Care" option answers as Vera after hours. Hands to a human on request.' },
  { id:'email', icon:'✉️', name:'Email', tag:'EMAIL · care@', status:'live',
    platform:'SendGrid — send + Inbound Parse',
    note:'Sends as care@vgliving.ca. Tenant replies webhook straight back into the same thread.' },
  { id:'wa', icon:'🟩', name:'WhatsApp', tag:'WHATSAPP', status:'planned',
    platform:'Twilio WhatsApp Business API',
    note:'Adds Meta template approval and a 24-hour session window. Worth it only if tenants ask.' },
  { id:'buildium', icon:'🏢', name:'Buildium sync', tag:'BUILDIUM', status:'planned',
    platform:'Buildium Open API + webhooks',
    note:'Real rent roll and work orders instead of simulated. Requires Buildium Premium.' }
];

const FALLBACK =
  "I want to make sure I get this right rather than guess. Can you tell me a bit more — " +
  "what's the problem, and which <b>unit</b> are you in?<br><br>" +
  "If it's easier, call <b>+1 (XXX) XXX-XXXX</b> and select <b>Care</b>, or I can pass this to a human on the VG team now.";
