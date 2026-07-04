/**
 * Normalização de veículos vindos do scraping.
 *
 * Objetivo: transformar títulos "sujos" (ex. "nissan qashqai 1 5 dci nacional")
 * em dados estruturados e limpos:
 *   brand:   "Nissan"
 *   model:   "Qashqai"
 *   version: "1.5 dCi Nacional"
 *   title:   "Nissan Qashqai 1.5 dCi Nacional"
 *
 * Módulo puro (sem Prisma/IO) — usado pelo scraper, pelo backfill e pela app.
 */

// ---------------------------------------------------------------------------
// Marcas: alias → nome canónico
// ---------------------------------------------------------------------------

export const BRAND_CANON: Record<string, string> = {
  vw: "Volkswagen",
  volkswagen: "Volkswagen",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  bmw: "BMW",
  seat: "SEAT",
  mini: "MINI",
  ds: "DS",
  mg: "MG",
  byd: "BYD",
  kgm: "KGM",
  gmc: "GMC",
  "alfa romeo": "Alfa Romeo",
  "alfa-romeo": "Alfa Romeo",
  alfa: "Alfa Romeo",
  "land rover": "Land Rover",
  "land-rover": "Land Rover",
  landrover: "Land Rover",
  "range rover": "Land Rover",
  "aston martin": "Aston Martin",
  "aston-martin": "Aston Martin",
  "rolls royce": "Rolls-Royce",
  "rolls-royce": "Rolls-Royce",
  citroen: "Citroën",
  citroën: "Citroën",
  skoda: "Škoda",
  škoda: "Škoda",
  hyundai: "Hyundai",
  ssangyong: "SsangYong",
  "ssang yong": "SsangYong",
};

// ---------------------------------------------------------------------------
// Modelos conhecidos por marca (mercado PT). Multi-palavra é tratado por
// ordenação por comprimento no matching. Nomes já na forma de exibição.
// ---------------------------------------------------------------------------

export const KNOWN_MODELS: Record<string, string[]> = {
  Abarth: ["500", "595", "695", "124 Spider"],
  "Alfa Romeo": [
    "Giulietta",
    "Giulia",
    "Stelvio",
    "Tonale",
    "MiTo",
    "147",
    "156",
    "159",
    "166",
    "GT",
    "Brera",
    "Spider",
    "4C",
  ],
  Audi: [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "A6",
    "A7",
    "A8",
    "Q2",
    "Q3",
    "Q4",
    "Q5",
    "Q7",
    "Q8",
    "TT",
    "R8",
    "e-tron",
    "RS3",
    "RS4",
    "RS6",
    "S3",
    "S4",
    "S5",
    "80",
    "100",
    "Allroad",
  ],
  BMW: [
    "Série 1",
    "Série 2",
    "Série 3",
    "Série 4",
    "Série 5",
    "Série 6",
    "Série 7",
    "Série 8",
    "X1",
    "X2",
    "X3",
    "X4",
    "X5",
    "X6",
    "X7",
    "Z3",
    "Z4",
    "i3",
    "i4",
    "i5",
    "i7",
    "iX",
    "iX1",
    "iX2",
    "iX3",
    "M2",
    "M3",
    "M4",
    "M5",
  ],
  BYD: ["Atto 3", "Seal", "Dolphin", "Han", "Tang", "Seal U"],
  Citroën: [
    "C1",
    "C2",
    "C3 Aircross",
    "C3 Picasso",
    "C3",
    "C4 Cactus",
    "C4 Picasso",
    "C4 Grand Picasso",
    "C4 SpaceTourer",
    "C4 X",
    "C4",
    "C5 Aircross",
    "C5 X",
    "C5",
    "C6",
    "C8",
    "Berlingo",
    "Xsara Picasso",
    "Xsara",
    "Saxo",
    "DS3",
    "DS4",
    "DS5",
    "Jumpy",
    "Jumper",
    "Nemo",
    "SpaceTourer",
    "AX",
    "ZX",
    "2CV",
    "ë-C4",
  ],
  Cupra: ["Formentor", "Born", "Leon", "Ateca", "Tavascan", "Terramar"],
  Dacia: [
    "Sandero Stepway",
    "Sandero",
    "Duster",
    "Logan",
    "Jogger",
    "Spring",
    "Lodgy",
    "Dokker",
  ],
  DS: ["DS3 Crossback", "DS3", "DS4", "DS5", "DS7 Crossback", "DS7", "DS9"],
  Fiat: [
    "500X",
    "500L",
    "500e",
    "500",
    "Panda",
    "Punto",
    "Grande Punto",
    "Tipo",
    "Bravo",
    "Brava",
    "Stilo",
    "Doblo",
    "Ducato",
    "Fiorino",
    "Qubo",
    "Freemont",
    "Uno",
    "Seicento",
    "Cinquecento",
    "Talento",
    "Scudo",
    "Multipla",
    "Idea",
    "Croma",
    "Marea",
    "Barchetta",
    "124 Spider",
    "600",
  ],
  Ford: [
    "Fiesta",
    "Focus",
    "Puma",
    "Kuga",
    "Mondeo",
    "EcoSport",
    "Edge",
    "Mustang Mach-E",
    "Mustang",
    "Galaxy",
    "S-Max",
    "C-Max",
    "Grand C-Max",
    "B-Max",
    "Ka+",
    "Ka",
    "Ranger",
    "Transit Custom",
    "Transit Connect",
    "Transit Courier",
    "Transit",
    "Tourneo Custom",
    "Tourneo Connect",
    "Tourneo Courier",
    "Escort",
    "Sierra",
    "Explorer",
    "F-150",
    "Bronco",
  ],
  Honda: [
    "Civic",
    "Jazz",
    "CR-V",
    "HR-V",
    "ZR-V",
    "e:Ny1",
    "Accord",
    "Insight",
    "Legend",
    "S2000",
    "NSX",
    "e",
  ],
  Hyundai: [
    "i10",
    "i20",
    "i30",
    "i40",
    "Kauai",
    "Kona",
    "Tucson",
    "Santa Fe",
    "Bayon",
    "Ioniq 5",
    "Ioniq 6",
    "Ioniq",
    "ix35",
    "ix20",
    "ix55",
    "Getz",
    "Atos",
    "Accent",
    "Elantra",
    "Veloster",
    "H-1",
    "H350",
    "Matrix",
  ],
  Jaguar: [
    "XE",
    "XF",
    "XJ",
    "XK",
    "E-Pace",
    "F-Pace",
    "I-Pace",
    "F-Type",
    "S-Type",
    "X-Type",
  ],
  Jeep: [
    "Renegade",
    "Compass",
    "Avenger",
    "Wrangler",
    "Grand Cherokee",
    "Cherokee",
    "Commander",
    "Gladiator",
    "Patriot",
  ],
  Kia: [
    "Picanto",
    "Rio",
    "Ceed",
    "XCeed",
    "ProCeed",
    "Stonic",
    "Niro",
    "Sportage",
    "Sorento",
    "EV6",
    "EV9",
    "Soul",
    "Venga",
    "Optima",
    "Stinger",
    "Carens",
    "Carnival",
    "Cerato",
    "Magentis",
  ],
  "Land Rover": [
    "Range Rover Evoque",
    "Range Rover Sport",
    "Range Rover Velar",
    "Range Rover",
    "Discovery Sport",
    "Discovery",
    "Defender",
    "Freelander",
  ],
  Lexus: [
    "CT",
    "IS",
    "ES",
    "GS",
    "LS",
    "NX",
    "RX",
    "UX",
    "LBX",
    "RZ",
    "LC",
    "RC",
  ],
  Mazda: [
    "2",
    "3",
    "5",
    "6",
    "CX-3",
    "CX-30",
    "CX-5",
    "CX-60",
    "CX-7",
    "MX-30",
    "MX-5",
    "RX-8",
    "323",
    "626",
    "Premacy",
  ],
  "Mercedes-Benz": [
    "Classe A",
    "Classe B",
    "Classe C",
    "Classe E",
    "Classe S",
    "Classe G",
    "CLA",
    "CLS",
    "CLK",
    "SLK",
    "SLC",
    "SL",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLK",
    "GLS",
    "ML",
    "EQA",
    "EQB",
    "EQC",
    "EQE",
    "EQS",
    "Vito",
    "Viano",
    "Sprinter",
    "Citan",
    "Classe V",
    "Classe R",
    "AMG GT",
    "190",
    "SLS",
  ],
  MG: ["ZS", "HS", "MG3", "MG4", "MG5", "EHS", "Marvel R", "ZR", "TF"],
  MINI: [
    "Cooper",
    "One",
    "Countryman",
    "Clubman",
    "Paceman",
    "Cabrio",
    "Aceman",
    "Electric",
  ],
  Mitsubishi: [
    "ASX",
    "Outlander",
    "Eclipse Cross",
    "Space Star",
    "Pajero",
    "L200",
    "Colt",
    "Lancer",
    "Canter",
    "Grandis",
  ],
  Nissan: [
    "Micra",
    "Note",
    "Juke",
    "Qashqai",
    "X-Trail",
    "Leaf",
    "Ariya",
    "Navara",
    "Pathfinder",
    "Pixo",
    "Pulsar",
    "Primera",
    "Almera",
    "Tiida",
    "350Z",
    "370Z",
    "GT-R",
    "Patrol",
    "Terrano",
    "NV200",
    "NV300",
    "NV400",
    "Townstar",
    "Primastar",
    "Interstar",
    "Cabstar",
    "Murano",
    "Skyline",
  ],
  Opel: [
    "Corsa",
    "Astra",
    "Insignia",
    "Mokka",
    "Crossland X",
    "Crossland",
    "Grandland X",
    "Grandland",
    "Meriva",
    "Zafira",
    "Adam",
    "Karl",
    "Agila",
    "Vectra",
    "Signum",
    "Tigra",
    "Antara",
    "Combo",
    "Vivaro",
    "Movano",
    "Kadett",
    "Omega",
    "Frontera",
    "GT",
  ],
  Peugeot: [
    "106",
    "107",
    "108",
    "205",
    "206",
    "207",
    "208",
    "2008",
    "306",
    "307",
    "308",
    "3008",
    "406",
    "407",
    "408",
    "4007",
    "5008",
    "508",
    "507",
    "605",
    "607",
    "807",
    "1007",
    "Partner",
    "Rifter",
    "Traveller",
    "Expert",
    "Boxer",
    "Bipper",
    "RCZ",
    "iOn",
  ],
  Polestar: ["1", "2", "3", "4"],
  Porsche: [
    "911",
    "718",
    "Boxster",
    "Cayman",
    "Cayenne",
    "Macan",
    "Panamera",
    "Taycan",
    "924",
    "928",
    "944",
    "996",
    "997",
  ],
  Renault: [
    "Clio",
    "Captur",
    "Megane",
    "Mégane",
    "Scenic",
    "Scénic",
    "Grand Scenic",
    "Kadjar",
    "Arkana",
    "Austral",
    "Espace",
    "Kangoo",
    "Trafic",
    "Master",
    "Twingo",
    "Zoe",
    "Twizy",
    "Laguna",
    "Talisman",
    "Fluence",
    "Modus",
    "Koleos",
    "Wind",
    "Symbioz",
    "Rafale",
    "5",
    "4",
    "19",
    "21",
  ],
  SEAT: [
    "Ibiza",
    "Leon",
    "León",
    "Arona",
    "Ateca",
    "Tarraco",
    "Alhambra",
    "Altea XL",
    "Altea",
    "Toledo",
    "Mii",
    "Exeo",
    "Cordoba",
    "Marbella",
    "Malaga",
  ],
  Škoda: [
    "Fabia",
    "Octavia",
    "Superb",
    "Kamiq",
    "Karoq",
    "Kodiaq",
    "Scala",
    "Enyaq",
    "Rapid",
    "Citigo",
    "Yeti",
    "Roomster",
    "Felicia",
    "Elroq",
  ],
  Smart: ["ForTwo", "ForFour", "Roadster", "#1", "#3"],
  SsangYong: [
    "Tivoli",
    "Korando",
    "Rexton",
    "Musso",
    "Kyron",
    "Actyon",
    "Rodius",
    "Torres",
  ],
  Subaru: [
    "Impreza",
    "Forester",
    "Outback",
    "XV",
    "Legacy",
    "Levorg",
    "BRZ",
    "Crosstrek",
    "Solterra",
    "Justy",
  ],
  Suzuki: [
    "Swift",
    "Vitara",
    "Grand Vitara",
    "S-Cross",
    "SX4",
    "Ignis",
    "Jimny",
    "Baleno",
    "Celerio",
    "Splash",
    "Alto",
    "Across",
    "Swace",
    "Liana",
    "Wagon R+",
    "Samurai",
  ],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y", "Roadster", "Cybertruck"],
  Toyota: [
    "Aygo X",
    "Aygo",
    "Yaris Cross",
    "Yaris",
    "Corolla",
    "C-HR",
    "RAV4",
    "Camry",
    "Auris",
    "Avensis",
    "Prius",
    "Supra",
    "GT86",
    "Hilux",
    "Land Cruiser",
    "Proace City",
    "Proace",
    "bZ4X",
    "Verso",
    "Corolla Verso",
    "Urban Cruiser",
    "iQ",
    "Starlet",
    "Celica",
    "MR2",
    "Carina",
    "Dyna",
    "Hiace",
  ],
  Volkswagen: [
    "Golf Plus",
    "Golf Sportsvan",
    "Golf Variant",
    "Golf",
    "Polo",
    "Passat",
    "Tiguan Allspace",
    "Tiguan",
    "T-Roc",
    "T-Cross",
    "Taigo",
    "Touran",
    "Touareg",
    "Sharan",
    "Scirocco",
    "Beetle",
    "Up!",
    "Up",
    "Jetta",
    "Vento",
    "Bora",
    "Arteon",
    "ID.3",
    "ID.4",
    "ID.5",
    "ID.7",
    "ID. Buzz",
    "Caddy",
    "Transporter",
    "Multivan",
    "Caravelle",
    "California",
    "Crafter",
    "Amarok",
    "Lupo",
    "Fox",
    "Eos",
    "Corrado",
    "Phaeton",
    "CC",
  ],
  Volvo: [
    "V40 Cross Country",
    "V40",
    "V50",
    "V60",
    "V70",
    "V90",
    "S40",
    "S60",
    "S80",
    "S90",
    "XC40",
    "XC60",
    "XC70",
    "XC90",
    "C30",
    "C40",
    "C70",
    "EX30",
    "EX90",
    "850",
    "240",
    "440",
  ],
};

// ---------------------------------------------------------------------------
// Limpeza de texto / tokens
// ---------------------------------------------------------------------------

/** Casing correto de siglas/motorizações comuns (chave em minúsculas). */
const TOKEN_CASE: Record<string, string> = {
  dci: "dCi",
  tdi: "TDI",
  tsi: "TSI",
  tfsi: "TFSI",
  fsi: "FSI",
  tgi: "TGI",
  hdi: "HDi",
  bluehdi: "BlueHDi",
  ehdi: "e-HDi",
  cdti: "CDTi",
  crdi: "CRDi",
  crdti: "CRDTi",
  dtec: "DTEC",
  "i-dtec": "i-DTEC",
  "i-vtec": "i-VTEC",
  vtec: "VTEC",
  vti: "VTi",
  thp: "THP",
  puretech: "PureTech",
  tce: "TCe",
  dig: "DIG",
  "dig-t": "DIG-T",
  jtd: "JTD",
  multijet: "MultiJet",
  cgi: "CGI",
  cdi: "CDI",
  vvti: "VVT-i",
  "vvt-i": "VVT-i",
  mzr: "MZR",
  skyactiv: "SkyActiv",
  ecoboost: "EcoBoost",
  ecoblue: "EcoBlue",
  tdci: "TDCi",
  mhev: "MHEV",
  phev: "PHEV",
  hev: "HEV",
  ev: "EV",
  gpl: "GPL",
  glp: "GPL",
  cv: "cv",
  kw: "kW",
  kwh: "kWh",
  ps: "cv",
  d: "d",
  d4d: "D-4D",
  "d-4d": "D-4D",
  td4: "TD4",
  td5: "TD5",
  td6: "TD6",
  dti: "DTi",
  jtdm: "JTDm",
  dtd: "DTD",
  dsg: "DSG",
  edc: "EDC",
  "s-tronic": "S-tronic",
  stronic: "S-tronic",
  tiptronic: "Tiptronic",
  multitronic: "Multitronic",
  cvt: "CVT",
  xtronic: "Xtronic",
  eat8: "EAT8",
  eat6: "EAT6",
  pdk: "PDK",
  gti: "GTI",
  gtd: "GTD",
  gte: "GTE",
  gt: "GT",
  gts: "GTS",
  gs: "GS", // ex. Opel Frontera GS
  gse: "GSe",
  gsi: "GSi",
  "gs-line": "GS Line",
  "n-line": "N Line",
  nline: "N Line",
  gtline: "GT Line",
  "gt-line": "GT Line",
  rs: "RS",
  st: "ST",
  "st-line": "ST-Line",
  stline: "ST-Line",
  amg: "AMG",
  "r-line": "R-Line",
  rline: "R-Line",
  xdrive: "xDrive",
  sdrive: "sDrive",
  quattro: "quattro",
  "4matic": "4MATIC",
  "4motion": "4MOTION",
  awd: "AWD",
  fwd: "FWD",
  rwd: "RWD",
  "4x4": "4x4",
  "4wd": "4WD",
  tgdi: "T-GDi",
  "t-gdi": "T-GDi",
  gdi: "GDi",
  fr: "FR",
  nismo: "NISMO",
  abt: "ABT",
  jcw: "JCW",
  led: "LED",
  gps: "GPS",
  sw: "SW",
  "sports tourer": "Sports Tourer",
  tourer: "Tourer",
  avant: "Avant",
  variant: "Variant",
  touring: "Touring",
  break: "Break",
  van: "Van",
  coupe: "Coupé",
  coupé: "Coupé",
  cabrio: "Cabrio",
  cabriolet: "Cabriolet",
  roadster: "Roadster",
  sportback: "Sportback",
  xl: "XL",
  l1: "L1",
  l2: "L2",
  h1: "H1",
  h2: "H2",
  ecoflex: "ecoFLEX",
  bluemotion: "BlueMotion",
  dynamique: "Dynamique",
  exclusive: "Exclusive",
  allure: "Allure",
  active: "Active",
  zen: "Zen",
  intens: "Intens",
  initiale: "Initiale",
  ghia: "Ghia",
  titanium: "Titanium",
  zetec: "Zetec",
  elegance: "Elegance",
  avantgarde: "Avantgarde",
  ambition: "Ambition",
  style: "Style",
  excellence: "Excellence",
  xperience: "Xperience",
  performance: "Performance",
  "long range": "Long Range",
  plaid: "Plaid",
  tekna: "Tekna",
  acenta: "Acenta",
  visia: "Visia",
  nacional: "Nacional",
  importado: "Importado",
  full: "Full",
  extras: "Extras",
  look: "Look",
  feel: "Feel",
  shine: "Shine",
  live: "Live",
  plus: "Plus",
  pro: "Pro",
  hybrid: "Hybrid",
  "e-power": "e-POWER",
  epower: "e-POWER",
  "e-tech": "E-Tech",
  etech: "E-Tech",
  "mild-hybrid": "Mild-Hybrid",
};

/** Tokens que nunca acrescentam valor ao título (ruído de anúncio). */
const JUNK_TOKENS = new Set([
  "vendo",
  "vende",
  "vende-se",
  "urgente",
  "oportunidade",
  "impecavel",
  "impecável",
  "como",
  "novo",
  "troco",
  "aceito",
  "retoma",
  "retomas",
  "negociavel",
  "negociável",
  "so",
  "só",
  "km",
  "kms",
  "unico",
  "único",
  "dono",
  "particular",
  "iva",
  "dedutivel",
  "dedutível",
  "financiamento",
  "garantia",
  "credito",
  "crédito",
  "ate",
  "até",
  "com",
  "de",
  "em",
  "ou",
  "muito",
  "bom",
  "estado",
  "estimado",
  "varios",
  "vários",
  "varias",
  "vrias",
  "pecas",
  "peças",
  "peas",
  "novas",
  "usado",
  "usada",
  "aproveite",
  "baixa",
  "preço",
  "preco",
  "lindo",
  "linda",
  "espetacular",
]);

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** chave de comparação: minúsculas, sem acentos, espaços únicos, sem hífens */
const norm = (s: string) =>
  stripDiacritics(s.toLowerCase())
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9.! ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "1 5 dci" → "1.5 dci" (cilindradas separadas por espaço em vez de ponto) */
function joinEngineDecimals(s: string): string {
  return s.replace(/\b([1-6])[ .]([0-9])\b(?![.\d])/g, "$1.$2");
}

/** "110kw" → "110 kW"-ready: separa número+unidade coladas */
function splitNumberUnits(s: string): string {
  return s.replace(/\b(\d+)(kw|cv|kwh|ps)\b/gi, "$1 $2");
}

const titleCaseWord = (w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w);

/** Aplica casing bonito a um texto de versão já normalizado. */
function prettyTokens(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const key = t.toLowerCase();
      if (TOKEN_CASE[key]) return TOKEN_CASE[key];
      if (/^\d+(\.\d+)?$/.test(t)) return t; // números ficam como estão
      if (/^[a-z]\d+$/i.test(t)) return t.toUpperCase(); // ex. "e6", "b8"
      return titleCaseWord(key);
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// API principal
// ---------------------------------------------------------------------------

export interface NormalizedVehicle {
  brand: string | null;
  model: string | null;
  version: string | null;
  /** Título limpo "Marca Modelo Versão" (fallback: título original embelezado) */
  title: string;
}

export function canonBrandName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t.length > 40 || /^\d+$/.test(t)) return null;
  const key = norm(t);
  if (BRAND_CANON[key]) return BRAND_CANON[key];
  // procura nas marcas conhecidas (para apanhar casing/acentos)
  for (const name of Object.keys(KNOWN_MODELS)) {
    if (norm(name) === key) return name;
  }
  return t.toLowerCase().split(/\s+/).map(titleCaseWord).join(" ");
}

/** Regras específicas por marca (códigos numéricos → família). */
function brandSpecificModel(
  brand: string,
  text: string
): { model: string; consumed: number } | null {
  if (brand === "BMW") {
    // "320d", "118i", "530e" → Série 3/1/5 (não consome o código: fica na versão)
    const m = text.match(/^([1-8])\d{2}\s?(d|i|e|xd)?\b/);
    if (m) return { model: `Série ${m[1]}`, consumed: 0 };
  }
  if (brand === "Mercedes-Benz") {
    // "c 220 d", "e220", "a 180" → Classe C/E/A (consome a letra da classe)
    const m = text.match(/^([abceglsv])\s?(\d{2,3})\b/);
    if (m)
      return { model: `Classe ${m[1].toUpperCase()}`, consumed: m[1].length };
  }
  return null;
}

/**
 * Extrai modelo + versão a partir do texto depois da marca.
 * `text` deve vir já passado por norm().
 */
function matchModel(
  brand: string,
  text: string
): { model: string | null; rest: string; known: boolean } {
  const models = KNOWN_MODELS[brand];
  if (models) {
    // multi-palavra/mais longos primeiro
    const sorted = [...models].sort((a, b) => norm(b).length - norm(a).length);
    for (const m of sorted) {
      const mk = norm(m);
      if (
        text === mk ||
        text.startsWith(mk + " ") ||
        text.startsWith(mk + ".")
      ) {
        return { model: m, rest: text.slice(mk.length).trim(), known: true };
      }
    }
    const special = brandSpecificModel(brand, text);
    if (special)
      return {
        model: special.model,
        rest: text.slice(special.consumed).trim(),
        known: true,
      };
  }
  // fallback: primeira palavra é o modelo, se for plausível
  const words = text.split(" ").filter(Boolean);
  const first = words[0] ?? "";
  // um dígito isolado ("1", da cilindrada partida) não é modelo
  const plausible =
    first.length >= 2 || (first.length === 1 && !/\d/.test(first));
  if (!first || !plausible) return { model: null, rest: text, known: false };
  return {
    model: prettyTokens(first),
    rest: words.slice(1).join(" "),
    known: false,
  };
}

/** Limpa e encurta a versão (motorização/acabamento). */
function cleanVersion(rest: string): string | null {
  const withDecimals = joinEngineDecimals(splitNumberUnits(rest));
  const raw = withDecimals
    .split(" ")
    .filter(Boolean)
    // remove ruído e números enormes (kms, preços, anos colados)
    .filter((t) => !JUNK_TOKENS.has(t))
    .filter((t) => !/^\d{4,}$/.test(t) || /^\d\.\d$/.test(t));
  // números soltos (kms/preços parciais): mantém só se forem o 1º token
  // (ex. Mercedes "220 d") ou se a unidade vier a seguir ("110 kW", "90 cv")
  const UNITS = new Set(["cv", "kw", "kwh", "ps", "d", "i", "e"]);
  const tokens = raw.filter((t, i) => {
    if (!/^\d{2,4}$/.test(t)) return true;
    if (i === 0) return true;
    const next = raw[i + 1];
    return !!next && UNITS.has(next);
  });
  if (!tokens.length) return null;
  const version = prettyTokens(tokens.slice(0, 5).join(" ")).trim();
  return version && version.length <= 40
    ? version
    : version.slice(0, 40).trim();
}

/** Prepara um texto candidato: remove ruído e repetições da marca no início. */
function prepareText(raw: string, brand: string | null): string {
  let text = norm(raw);
  // filtra tokens de ruído ("vendo", "urgente", ...) — mas nunca esvazia o texto
  const kept = text.split(" ").filter((t) => t && !JUNK_TOKENS.has(t));
  if (kept.length) text = kept.join(" ");

  if (!brand) return text;
  const prefixes = [
    norm(brand),
    ...Object.entries(BRAND_CANON)
      .filter(([, canon]) => canon === brand)
      .map(([alias]) => norm(alias)),
  ].sort((a, b) => b.length - a.length);

  // remove a marca/aliases repetidos no inicio (pode aparecer mais de uma vez)
  let changed = true;
  while (changed && text) {
    changed = false;
    for (const p of prefixes) {
      if (!p) continue;
      // não cortar se o texto começa por um modelo conhecido que inclui o
      // prefixo (ex. alias "range rover" vs modelo "Range Rover Evoque")
      const models = KNOWN_MODELS[brand] ?? [];
      const protectsModel = models.some((m) => {
        const mk = norm(m);
        return mk.startsWith(p) && (text === mk || text.startsWith(mk + " "));
      });
      if (protectsModel) continue;
      if (text === p) {
        text = "";
        changed = true;
      } else if (text.startsWith(p + " ")) {
        text = text.slice(p.length + 1);
        changed = true;
      }
    }
    // marca mal escrita no inicio (ex. "nissa ..." para Nissan)
    const first = text.split(" ")[0] ?? "";
    if (
      first.length >= 4 &&
      norm(brand).startsWith(first) &&
      first !== norm(brand)
    ) {
      text = text.slice(first.length).trim();
      changed = true;
    }
  }
  return text;
}

/**
 * Normaliza um anúncio scraped. Recebe o que existir: marca, modelo e/ou
 * título raw. Devolve sempre um título limpo.
 */
export function normalizeVehicle(input: {
  brand?: string | null;
  model?: string | null;
  title?: string | null;
}): NormalizedVehicle {
  const brand = canonBrandName(input.brand);

  // candidatos: campo model (quando existe) e título completo — escolhemos o
  // que der um modelo conhecido; em empate, o que tiver a versão mais rica.
  const candidates = [input.model, input.title]
    .map((t) => (t ? prepareText(t, brand) : ""))
    .filter(Boolean);

  let model: string | null = null;
  let version: string | null = null;

  if (brand && candidates.length) {
    const results = candidates.map((text) => {
      const res = matchModel(brand, text);
      return { ...res, version: cleanVersion(res.rest) };
    });
    const known = results.filter((r) => r.known);
    const pool = known.length ? known : results;
    // preferimos a variante com a versão mais completa
    const best = pool.reduce((a, b) =>
      (b.version?.length ?? 0) > (a.version?.length ?? 0) ? b : a
    );
    model = best.model;
    version = best.version;
  } else if (candidates.length) {
    version = cleanVersion(candidates[0]);
  }

  const title =
    [brand, model, version].filter(Boolean).join(" ") ||
    prettyTokens(norm(input.title ?? "")) ||
    "Automóvel";

  return { brand, model, version, title };
}
