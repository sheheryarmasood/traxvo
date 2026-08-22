/* ============================================================
   Maid Ops — simulated operations data
   ------------------------------------------------------------
   DEMO DATA. Crews, cars, customers and today's schedule are
   fictional stand-ins. Territories, neighbourhoods, phone
   numbers and hours are real, from tidynest.ca.
   ============================================================ */

const BIZ = {
  name: 'TidyNest',
  territoryLabel: 'Brampton East & West',
  owners: 'Renu & Dev Anand',
  hours: 'Mon–Fri 8:00am – 9:30pm · Sat 9:00am – 2:00pm · Sun closed',
  guarantee: 'Clean-Again Promise — not satisfied, we make it right.',
  manager: 'Ops Manager',          // the single human this agent takes load off
  crewSize: 2                       // 2-person teams
};

const TERRITORIES = {
  east: { id:'east', name:'Brampton East', phone:'905.555.0142',
          areas:['Albion','Bolton','Bramalea','Caledon East','Castlemore','Tullamore','Woodhill'] },
  west: { id:'west', name:'Brampton West', phone:'289.555.0198',
          areas:['Boston Mills','Cheltenham','Churchville','Huttonville','Inglewood',
                 'Mount Pleasant','Northwood Park','Peel Village'] }
};

/* Crews run out of company vehicles. Assignment is by territory AND
   route density — sending a West crew to Bolton wrecks the day. */
const CREWS = [
  { id:'C1', name:'Crew 1', members:['Anita','Rosa'],    territory:'east', car:'VAN-04' },
  { id:'C2', name:'Crew 2', members:['Marta','Joy'],     territory:'east', car:'VAN-07' },
  { id:'C3', name:'Crew 3', members:['Simran','Delia'],  territory:'west', car:'VAN-02' },
  { id:'C4', name:'Crew 4', members:['Grace','Nadia'],   territory:'west', car:'VAN-09' }
];

/* Today's board. "flexible" customers have told us they'll take a
   short-notice slot — that list is what makes cancellation backfill work. */
const SCHEDULE = [
  { id:'J1', crew:'C1', start:'08:30', end:'11:00', customer:'Sharma residence',  area:'Bramalea',      sqft:2100, type:'Recurring · bi-weekly', price:165, status:'done' },
  { id:'J2', crew:'C1', start:'11:45', end:'14:15', customer:'Okonkwo residence', area:'Castlemore',    sqft:2400, type:'Recurring · bi-weekly', price:180, status:'active' },
  { id:'J3', crew:'C1', start:'15:00', end:'17:30', customer:'Patel residence',   area:'Bolton',        sqft:2600, type:'Recurring · monthly',   price:205, status:'booked' },
  { id:'J4', crew:'C2', start:'08:30', end:'11:30', customer:'Byrne residence',   area:'Caledon East',  sqft:2900, type:'One-time deep',         price:320, status:'done' },
  { id:'J5', crew:'C2', start:'12:15', end:'14:45', customer:'Liu residence',     area:'Albion',        sqft:2200, type:'Recurring · weekly',    price:150, status:'active' },
  { id:'J6', crew:'C3', start:'09:00', end:'11:00', customer:'Nguyen residence',  area:'Mount Pleasant',sqft:1400, type:'Condo · bi-weekly',     price:135, status:'done' },
  { id:'J7', crew:'C3', start:'11:45', end:'14:45', customer:'Ferreira residence',area:'Churchville',   sqft:2800, type:'Move-out',              price:395, status:'active' },
  { id:'J8', crew:'C4', start:'08:30', end:'11:00', customer:'Kaur residence',    area:'Peel Village',  sqft:1900, type:'Recurring · bi-weekly', price:158, status:'done' },
  { id:'J9', crew:'C4', start:'11:45', end:'14:15', customer:'Doyle residence',   area:'Huttonville',   sqft:2300, type:'Recurring · bi-weekly', price:172, status:'booked' }
];

/* Existing customers the agent can reach for short-notice slots.
   flexible = has opted in to short-notice offers. */
const CUSTOMERS = [
  { name:'Rebecca Toh',     phone:'(905) 555-0117', area:'Peel Village',    sqft:1800, freq:'bi-weekly', flexible:true,  note:'Asked to move up next clean' },
  { name:'Amrit Gill',      phone:'(647) 555-0134', area:'Huttonville',     sqft:2200, freq:'monthly',   flexible:true,  note:'On short-notice list' },
  { name:'Dana Whitmore',   phone:'(905) 555-0159', area:'Mount Pleasant',  sqft:2000, freq:'bi-weekly', flexible:true,  note:'Works from home, flexible' },
  { name:'Priyanka Sethi',  phone:'(416) 555-0188', area:'Churchville',     sqft:2500, freq:'bi-weekly', flexible:false, note:'Fixed Thursdays only' },
  { name:'Colin Marsh',     phone:'(905) 555-0171', area:'Bramalea',        sqft:1600, freq:'weekly',    flexible:false, note:'' }
];

function territoryFor(area){
  const a = (area||'').toLowerCase().trim();
  for(const t of Object.values(TERRITORIES)){
    if(t.areas.some(x=>x.toLowerCase() === a || a.includes(x.toLowerCase()))) return t;
  }
  return null;
}
function crewsIn(territoryId){ return CREWS.filter(c=>c.territory===territoryId); }
function jobsFor(crewId){ return SCHEDULE.filter(j=>j.crew===crewId); }
function flexibleCustomers(area){
  const t = territoryFor(area);
  return CUSTOMERS.filter(c=>c.flexible && (!t || (territoryFor(c.area)||{}).id === t.id));
}
