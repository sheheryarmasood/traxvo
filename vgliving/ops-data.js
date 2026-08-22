/* ============================================================
   VG Care Ops — simulated portfolio data
   ------------------------------------------------------------
   DEMO DATA. Buildings, units, tenants and vendors below are
   fictional stand-ins. In production these come from Buildium
   (rent roll + work orders) and VG Living's own vendor list.
   ============================================================ */

const PORTFOLIO = {
  company: {
    name: 'VG Living',
    legal: 'VoraG Living Inc.',
    phone: '+1 (XXX) XXX-XXXX',
    phoneDial: '+1XXXXXXXXXX',
    careEmail: 'care@example.com',
    rentEmail: 'rent@example.com',
    ownerEmail: 'contact@example.com',
    // Threshold above which a repair cannot proceed without owner sign-off.
    // Confirm the real number with Asad — this is a placeholder.
    approvalThreshold: 500
  },

  buildings: [
    {
      id: 'LT',
      name: 'Lakeshore Terrace',
      address: '1245 Lakeshore Rd E, Mississauga ON',
      units: 12,
      systems: ['Central boiler (DHW)', 'Rooftop HVAC', 'Elevator', 'Fire alarm panel'],
      owner: { name: 'M. Chandra', email: 'owner1@example.com' }
    },
    {
      id: 'EL',
      name: 'Erie Landing',
      address: '33 Erie Ave, Brantford ON',
      units: 12,
      systems: ['In-suite HVAC', 'Elevator', 'Fire alarm panel'],
      owner: { name: 'R. Whitfield', email: 'owner2@example.com' }
    }
  ],

  tenants: [
    { unit: '204', building: 'LT', name: 'Priya Raman',     phone: '(905) 555-0142', pets: 'Cat'  },
    { unit: '507', building: 'LT', name: 'Daniel Okafor',   phone: '(905) 555-0188', pets: 'None' },
    { unit: '311', building: 'LT', name: 'Marisol Vega',    phone: '(647) 555-0119', pets: 'Dog'  },
    { unit: '108', building: 'LT', name: 'Tomas Kaur',      phone: '(905) 555-0173', pets: 'None' },
    { unit: '709', building: 'EL', name: 'Alicia Brennan',  phone: '(519) 555-0164', pets: 'None' },
    { unit: '402', building: 'EL', name: 'Wesley Nakamura', phone: '(519) 555-0197', pets: 'Cat'  }
  ],

  /* Response profile drives the demo's dispatch simulation:
     acceptSec = simulated seconds to accept, null = will not respond
     (used to demonstrate automatic escalation to the next vendor). */
  vendors: [
    { id:'V1', name:'Rapid Flow Plumbing',      trades:['plumbing'],              afterHours:true,  callOut:185, rating:4.6, acceptSec:null, note:'Primary plumber' },
    { id:'V2', name:'Nightwatch Drain & Pipe',  trades:['plumbing'],              afterHours:true,  callOut:210, rating:4.8, acceptSec:4,    note:'Backup — 24/7' },
    { id:'V3', name:'Voltcore Electric',        trades:['electrical'],            afterHours:true,  callOut:195, rating:4.7, acceptSec:5,    note:'ESA licensed' },
    { id:'V4', name:'Northline HVAC',           trades:['hvac'],                  afterHours:true,  callOut:220, rating:4.5, acceptSec:5,    note:'Boiler + rooftop' },
    { id:'V5', name:'GTA Appliance Repair',     trades:['appliance'],             afterHours:false, callOut:140, rating:4.3, acceptSec:6,    note:'Business hours' },
    { id:'V6', name:'Sentry Lock & Key',        trades:['locksmith'],             afterHours:true,  callOut:160, rating:4.9, acceptSec:3,    note:'24/7 lockout' },
    { id:'V7', name:'Guardian Fire & Safety',   trades:['life-safety','general'], afterHours:true,  callOut:250, rating:4.8, acceptSec:4,    note:'Alarm + extinguishers' }
  ],

  /* Recurring building work. Intervals here are per each building's
     SERVICE CONTRACT as configured — not asserted as statutory minimums.
     Real deployment pulls the actual contract terms and any Fire Code /
     TSSA obligations from the client. */
  pmCalendar: [
    { building:'LT', task:'Fire alarm system inspection', vendor:'V7', due:'2026-09-04', status:'scheduled' },
    { building:'LT', task:'Boiler service (DHW)',         vendor:'V4', due:'2026-08-27', status:'booking'   },
    { building:'LT', task:'Elevator maintenance',         vendor:'V7', due:'2026-08-19', status:'scheduled' },
    { building:'EL', task:'Backflow prevention test',     vendor:'V1', due:'2026-09-15', status:'upcoming'  },
    { building:'EL', task:'Fire extinguisher check',      vendor:'V7', due:'2026-08-22', status:'booking'   },
    { building:'LT', task:'Dryer vent cleaning (common)', vendor:'V7', due:'2026-10-01', status:'upcoming'  }
  ]
};

function findTenant(unit, buildingId) {
  return PORTFOLIO.tenants.find(t =>
    t.unit === String(unit) && (!buildingId || t.building === buildingId));
}
function findBuilding(id) {
  return PORTFOLIO.buildings.find(b => b.id === id);
}
function vendorsForTrade(trade, afterHoursOnly) {
  return PORTFOLIO.vendors.filter(v =>
    v.trades.includes(trade) && (!afterHoursOnly || v.afterHours));
}
