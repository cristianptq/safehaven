"use strict";

const APP_VERSION = "1.0.0";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

const CONTACT_CATEGORIES = [
  "Family",
  "Out-of-area",
  "Neighbor",
  "Medical",
  "Insurance",
  "Utility",
  "Work / School",
  "Emergency services",
  "Other"
];

const DOC_CATEGORIES = ["Identity", "Medical", "Insurance", "Financial", "Property", "Pet", "Other"];

const VITAL_CATEGORIES = [
  "Insurance",
  "Financial",
  "Medical",
  "Identity",
  "Household",
  "Online accounts",
  "Other"
];

// Pre-loaded from ready.gov/kit and Red Cross emergency kit guidance.
const KIT_TEMPLATE = [
  ["Water & Food", [
    ["Water", "4 L / 1 gal per person per day — at least 3 days"],
    ["Non-perishable food", "At least a 3-day supply"],
    ["Manual can opener", ""],
    ["Mess kits or utensils & cups", ""],
    ["Pet food & extra water", "If you have pets"]
  ]],
  ["Light & Power", [
    ["Flashlight or headlamp", "One per person"],
    ["Extra batteries", ""],
    ["Power bank & charging cables", "Keep them charged"],
    ["Battery or hand-crank radio", "For emergency broadcasts"],
    ["Matches / lighter", "In a waterproof container"]
  ]],
  ["First Aid & Health", [
    ["First aid kit", ""],
    ["Medications", "7+ day supply; note expiry dates"],
    ["Glasses / contact lenses & solution", ""],
    ["Hand sanitizer & soap", ""],
    ["N95 / dust masks", ""],
    ["Moist towelettes & garbage bags", "For sanitation"],
    ["Infant formula, bottles, diapers", "If needed"]
  ]],
  ["Tools & Safety", [
    ["Multi-tool", ""],
    ["Wrench or pliers", "To turn off utilities"],
    ["Fire extinguisher", ""],
    ["Work gloves", ""],
    ["Duct tape & plastic sheeting", "To shelter in place"],
    ["Whistle", "To signal for help"],
    ["Local paper maps", ""],
    ["Emergency blankets", ""],
    ["Rain gear / ponchos", ""]
  ]],
  ["Clothing & Warmth", [
    ["Change of clothes", "One per person, season-appropriate"],
    ["Sturdy shoes", ""],
    ["Blankets or sleeping bags", "One per person"]
  ]],
  ["Documents & Cash", [
    ["Copies of IDs & key documents", "Waterproof bag — see Vault"],
    ["Cash in small bills", "ATMs and card terminals may be down"],
    ["Printed contact list & plan", "Use Backup → Print"],
    ["Notebook & pen", ""]
  ]],
  ["Kids & Comfort", [
    ["Books, games, toys", ""],
    ["Comfort items", ""]
  ]]
];

const PLAN_CARDS = {
  numbers: {
    title: "Emergency numbers",
    hint: "Defaults follow the European 112 system — adjust to your country.",
    fields: [
      ["medical", "Ambulance", "tel"],
      ["police", "Police", "tel"],
      ["fire", "Fire brigade", "tel"],
      ["other", "Other", "text"]
    ]
  },
  outOfArea: {
    title: "Out-of-area contact",
    hint: "If you get separated, everyone calls or texts this person to check in.",
    fields: [
      ["name", "Name", "text"],
      ["phone", "Phone", "tel"]
    ]
  },
  meeting: {
    title: "Meeting places",
    hint: "Pick three: right outside your home, outside your neighborhood, and out of town.",
    meeting: true,
    places: [
      ["near", "Right outside home"],
      ["neighborhood", "Outside the neighborhood"],
      ["regional", "Out of town / regional"]
    ]
  },
  evacuation: {
    title: "Evacuation plan",
    hint: "Know where you will go and how you will get there. Practice twice a year.",
    fields: [
      ["routePrimary", "Primary route", "text"],
      ["routeAlt", "Alternate route", "text"],
      ["destination", "Destination / shelter", "text"],
      ["transport", "Transportation plan", "text"],
      ["pets", "Pet plan", "text"]
    ]
  },
  utilities: {
    title: "Utility shutoffs",
    hint: "Where each shutoff is and how to operate it. Turn off gas only if you suspect a leak.",
    fields: [
      ["gas", "Gas — location & how", "text"],
      ["water", "Water — location & how", "text"],
      ["electricity", "Electricity — location & how", "text"]
    ]
  }
};

const DEFAULT_PLACE = () => ({ label: "", address: "", lat: "", lng: "" });

const DEFAULT_PLAN = () => ({
  numbers: { medical: "112", police: "112", fire: "112", other: "" },
  outOfArea: { name: "", phone: "" },
  meeting: { near: DEFAULT_PLACE(), neighborhood: DEFAULT_PLACE(), regional: DEFAULT_PLACE() },
  evacuation: { routePrimary: "", routeAlt: "", destination: "", transport: "", pets: "" },
  utilities: { gas: "", water: "", electricity: "" },
  notes: ""
});

const state = {
  sections: {},
  filesMeta: [],
  route: "home",
  peopleTab: "household",
  vaultTab: "documents",
  docCategory: "Identity",
  shelterCounty: "",
  shelterSearch: "",
  deferredInstall: null
};

function seedKit() {
  const items = [];
  for (const [cat, arr] of KIT_TEMPLATE) {
    for (const [label, hint] of arr) {
      items.push({ id: uid(), cat, label, hint, qty: "", notes: "", done: false, custom: false });
    }
  }
  return items;
}

async function loadState() {
  state.sections = await db.getAllSections();
  if (!state.sections.meta) {
    state.sections.meta = { createdAt: new Date().toISOString(), lastExportAt: null };
    await db.setSection("meta", state.sections.meta);
  }
  if (!state.sections.plan) {
    state.sections.plan = DEFAULT_PLAN();
    await db.setSection("plan", state.sections.plan);
  } else {
    // migrate meeting places from plain strings to {label,address,lat,lng}
    const m = state.sections.plan.meeting;
    if (m) {
      let changed = false;
      for (const k of ["near", "neighborhood", "regional"]) {
        if (typeof m[k] === "string") {
          m[k] = { ...DEFAULT_PLACE(), label: m[k] };
          changed = true;
        } else if (!m[k]) {
          m[k] = DEFAULT_PLACE();
          changed = true;
        }
      }
      if (changed) await db.setSection("plan", state.sections.plan);
    }
  }
  if (!state.sections.household) {
    state.sections.household = { members: [], pets: [] };
    await db.setSection("household", state.sections.household);
  }
  if (!state.sections.contacts) {
    state.sections.contacts = { list: [] };
    await db.setSection("contacts", state.sections.contacts);
  }
  if (!state.sections.vital) {
    state.sections.vital = { records: [] };
    await db.setSection("vital", state.sections.vital);
  }
  if (!state.sections.kit) {
    state.sections.kit = { items: seedKit() };
    await db.setSection("kit", state.sections.kit);
  }
}

async function save(id) {
  await db.setSection(id, state.sections[id]);
}

async function refreshFilesMeta() {
  const files = await db.getAllFiles();
  state.filesMeta = files.map(({ blob, ...meta }) => meta);
}
