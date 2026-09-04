/**
 * Standalone sanity check for @swisseph/node. Run this BEFORE wiring the library
 * into the app, so a wrong chart can only be one thing at a time.
 *
 *   node scripts/verify-chart.mjs 1990-06-15 04:30 27.7172 85.3240 Asia/Kathmandu
 *
 * Prints sidereal Lahiri positions, nakshatra with pada, and the Vimshottari
 * starting point. Compare against Jagannatha Hora or your own known chart.
 *
 * Deliberately plain JavaScript with no imports from the app - if this agrees
 * with JHora, the ephemeris is correct and any later disagreement is our code.
 */

const swe = await import('@swisseph/node');

/* Swiss Ephemeris C constants. Numeric rather than named exports, because these
   have been stable for two decades while wrapper naming varies. */
const SEFLG_SWIEPH   = 2;
const SEFLG_SPEED    = 256;
const SEFLG_SIDEREAL = 64 * 1024;
const SE_SIDM_LAHIRI = 1;

const BODIES = {
  Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4,
  Jupiter: 5, Saturn: 6, Rahu: 11, // 11 = true node, 10 = mean node
};

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha',
  'Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada',
  'Uttara Bhadrapada','Revati'];

const DASHA_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_YEARS = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };

/* ------------------------------- arguments -------------------------------- */

const [date, time, latArg, lonArg, tz] = process.argv.slice(2);
if (!date || !time || !latArg || !lonArg || !tz) {
  console.error('Usage: node scripts/verify-chart.mjs <YYYY-MM-DD> <HH:mm> <lat> <lon> <IANA-timezone>');
  process.exit(1);
}
const latitude = Number(latArg);
const longitude = Number(lonArg);

/* Convert birth-local wall clock to UTC using the real DST rules for that zone. */
function toUTC(dateStr, timeStr, timeZone) {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(naive).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  return new Date(naive.getTime() - (asUTC - naive.getTime()));
}

const utc = toUTC(date, time, tz);

/* --------------------------- library adaptation --------------------------- */

const pick = (...names) => names.map(n => swe[n]).find(f => typeof f === 'function');

/* Numeric and Date-taking variants are separate functions here. Arity cannot tell
   them apart because julianDay declares default parameters, so key off the name. */
const juldayNumeric = pick('julianDay', 'swe_julday');
const juldayFromDate = pick('dateToJulianDay');
const calc      = pick('calculatePosition', 'swe_calc_ut');
const houses    = pick('calculateHouses', 'swe_houses');
const setSidMode = pick('setSiderealMode', 'setSidMode', 'swe_set_sid_mode');
const getAyan   = pick('getAyanamsa', 'getAyanamsaUt', 'swe_get_ayanamsa_ut');

if (!(juldayNumeric || juldayFromDate) || !calc || !houses) {
  console.error('Could not find the expected functions. Exports are:');
  console.error(Object.keys(swe).join(', '));
  process.exit(1);
}

const hourDecimal = utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
const jd = juldayNumeric
  ? juldayNumeric(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), hourDecimal)
  : juldayFromDate(utc);

if (!Number.isFinite(jd)) {
  console.error('Julian day came back as', jd, '- the signature is not what was expected. Exports are:');
  console.error(Object.keys(swe).join(', '));
  process.exit(1);
}

if (setSidMode) setSidMode(SE_SIDM_LAHIRI, 0, 0);

const norm = x => ((x % 360) + 360) % 360;
const readLongitude = r => (typeof r === 'number' ? r : r.longitude ?? r[0]);
const readSpeed = r => (typeof r === 'object' ? r.longitudeSpeed ?? r.speed ?? r[3] : undefined);

/* Ask for sidereal directly, then check the answer is actually sidereal:
   the Sun should sit roughly 24 degrees behind its tropical position today. */
let ayanamsha = getAyan ? getAyan(jd) : null;
let siderealWorks = false;

const tropicalSun = norm(readLongitude(calc(jd, BODIES.Sun, SEFLG_SWIEPH | SEFLG_SPEED)));
if (setSidMode) {
  const sidSun = norm(readLongitude(calc(jd, BODIES.Sun, SEFLG_SWIEPH | SEFLG_SPEED | SEFLG_SIDEREAL)));
  const delta = norm(tropicalSun - sidSun);
  siderealWorks = delta > 20 && delta < 30;
  if (siderealWorks && ayanamsha == null) ayanamsha = delta;
}

if (!siderealWorks && ayanamsha == null) {
  console.error('Neither a sidereal flag nor an ayanamsha function worked. Exports are:');
  console.error(Object.keys(swe).join(', '));
  process.exit(1);
}

function sidereal(body) {
  if (siderealWorks) {
    const r = calc(jd, body, SEFLG_SWIEPH | SEFLG_SPEED | SEFLG_SIDEREAL);
    return { lon: norm(readLongitude(r)), speed: readSpeed(r) };
  }
  const r = calc(jd, body, SEFLG_SWIEPH | SEFLG_SPEED);
  return { lon: norm(readLongitude(r) - ayanamsha), speed: readSpeed(r) };
}

/* -------------------------------- output ---------------------------------- */

const fmt = lon => {
  const s = Math.floor(lon / 30);
  const d = lon - s * 30;
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  const sec = Math.round((((d - deg) * 60) - min) * 60);
  return `${SIGNS[s].padEnd(11)} ${String(deg).padStart(2)}\u00b0${String(min).padStart(2,'0')}'${String(sec).padStart(2,'0')}"`;
};

const nak = lon => {
  const arc = 360 / 27;
  const i = Math.floor(lon / arc);
  const pada = Math.floor((lon - i * arc) / (arc / 4)) + 1;
  return `${NAKSHATRAS[i]} pada ${pada}`;
};

console.log('\nBirth (local) :', date, time, tz);
console.log('Birth (UTC)   :', utc.toISOString());
console.log('Julian day    :', jd.toFixed(6));
console.log('Ayanamsha     :', ayanamsha.toFixed(6), '\u00b0 (Lahiri)');
console.log('Sidereal mode :', siderealWorks ? 'native flag' : 'tropical minus ayanamsha');

/* House cusps come back tropical whatever the sidereal mode, because swe_houses
   takes no flags - so the ayanamsha is always subtracted here, never conditionally. */
const houseSystem = swe.HouseSystem?.WholeSign ?? 'W';
let asc;
for (const hsys of [houseSystem, 'W', 'P']) {
  try { asc = houses(jd, latitude, longitude, hsys); break; } catch { /* try the next one */ }
}
if (asc == null) { console.error('calculateHouses rejected every house system tried.'); process.exit(1); }

const ascTropical = typeof asc === 'object' ? (asc.ascendant ?? asc.ascmc?.[0] ?? asc.cusps?.[1]) : asc;
const ascLon = norm(ascTropical - ayanamsha);
console.log('\nLagna         :', fmt(ascLon), '  ', nak(ascLon));

console.log('\nGraha           Sign        Deg          Nakshatra                 R');
console.log('-'.repeat(76));

let moonLon = null;
for (const [name, id] of Object.entries(BODIES)) {
  const { lon, speed } = sidereal(id);
  if (name === 'Moon') moonLon = lon;
  const retro = name === 'Rahu' ? 'R' : (speed != null && speed < 0 ? 'R' : ' ');
  console.log(`${name.padEnd(15)} ${fmt(lon)}   ${nak(lon).padEnd(24)} ${retro}`);
}

const ketu = norm(moonLon != null ? sidereal(BODIES.Rahu).lon + 180 : 0);
console.log(`${'Ketu'.padEnd(15)} ${fmt(ketu)}   ${nak(ketu).padEnd(24)} R`);

/* --------------------------- Vimshottari start ---------------------------- */

const arc = 360 / 27;
const nakIndex = Math.floor(moonLon / arc);
const elapsed = (moonLon % arc) / arc;
const startLord = DASHA_ORDER[nakIndex % 9];
const balance = DASHA_YEARS[startLord] * (1 - elapsed);

const DAYS_PER_YEAR = 365.2425;
const addYears = (d, y) => new Date(d.getTime() + y * DAYS_PER_YEAR * 86400000);

console.log('\nVimshottari');
console.log('  Moon nakshatra :', NAKSHATRAS[nakIndex]);
console.log('  Starting lord  :', startLord);
console.log('  Balance at birth:', balance.toFixed(4), 'years');

let cursor = new Date(utc);
let idx = DASHA_ORDER.indexOf(startLord);
console.log('\n  Mahadasha sequence');
for (let i = 0; i < 10; i++) {
  const lord = DASHA_ORDER[(idx + i) % 9];
  const span = i === 0 ? balance : DASHA_YEARS[lord];
  const end = addYears(cursor, span);
  const running = new Date() >= cursor && new Date() < end ? '  <-- current' : '';
  console.log(`    ${lord.padEnd(8)} ${cursor.toISOString().slice(0,10)} -> ${end.toISOString().slice(0,10)}${running}`);
  cursor = end;
}

if (typeof swe.close === 'function') swe.close();
console.log('');
