const fs = require('fs');

const center = {
  id: 'CENTER_01',
  name: 'Fictional Delivery Center'
};

// ----- ROUTES -----
const routes = Array.from({ length: 15 }, (_, i) => ({
  routeId: `R${String(i + 1).padStart(2, '0')}`,
  dominantDriverId: `D${String(i + 1).padStart(2, '0')}`
}));

// ----- DRIVERS -----
const drivers = Array.from({ length: 17 }, (_, i) => ({
  driverId: `D${String(i + 1).padStart(2, '0')}`,
  name: `Driver ${i + 1}`,
  seniority: 17 - i,
  bidRoute: i < 15 ? `R${String(i + 1).padStart(2, '0')}` : null
}));

// ----- DATE UTIL -----
const startDate = new Date('2025-01-06'); // Monday
const weeks = 3;
const days = [];

for (let w = 0; w < weeks; w++) {
  for (let d = 0; d < 6; d++) { // Mon–Sat only
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + w * 7 + d);
    days.push(date);
  }
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ----- BASELINE HELPERS -----
function baseForRoute(routeIndex) {
  return {
    stops: 110 + routeIndex * 2,
    miles: 38 + routeIndex,
    ndpph: 24 + routeIndex * 0.3
  };
}

function dayMultiplier(day) {
  switch (day) {
    case 'Tuesday':
    case 'Wednesday':
    case 'Thursday':
      return 1.1;
    case 'Saturday':
      return 0.65;
    default:
      return 1.0;
  }
}

// ----- DAILY HISTORY -----
const dailyHistory = [];

routes.forEach((route, rIdx) => {
  days.forEach((date, dayIdx) => {
    const dayName = dayNames[date.getDay()];
    const base = baseForRoute(rIdx);
    const mult = dayMultiplier(dayName);

    const isFloatDay = dayName === 'Friday' || dayName === 'Saturday';
    const floatDriver =
      rIdx % 2 === 0 ? 'D16' : 'D17';

    const driverId = isFloatDay ? floatDriver : route.dominantDriverId;

    const stops = Math.round(base.stops * mult);
    const miles = Math.round(base.miles * mult);
    const ndpph = Number((base.ndpph * mult).toFixed(1));
    const spm = Number((stops / miles).toFixed(2));

    dailyHistory.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: dayName,
      routeId: route.routeId,
      driverId,
      stops,
      miles,
      ndpph,
      spm,
      ovUn: Number((-0.3 + (mult - 1)).toFixed(2)),
      sporh: Number((spm * 6).toFixed(1))
    });
  });
});

// ----- BASELINES (DERIVED ONCE) -----
function average(nums) {
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

const routeBaselines = routes.map(route => {
  const rows = dailyHistory.filter(r => r.routeId === route.routeId);
  return {
    routeId: route.routeId,
    avgStops: average(rows.map(r => r.stops)),
    avgMiles: average(rows.map(r => r.miles)),
    avgSPM: average(rows.map(r => r.spm)),
    avgNDPPH: average(rows.map(r => r.ndpph)),
    avgOvUn: average(rows.map(r => r.ovUn)),
    sporh: average(rows.map(r => r.sporh)),
    planDayVsPaidDay: average(rows.map(r => r.ovUn))
  };
});

const driverBaselines = drivers.map(driver => {
  const rows = dailyHistory.filter(r => r.driverId === driver.driverId);
  if (!rows.length) return null;

  return {
    driverId: driver.driverId,
    avgStops: average(rows.map(r => r.stops)),
    avgMiles: average(rows.map(r => r.miles)),
    avgSPM: average(rows.map(r => r.spm)),
    avgNDPPH: average(rows.map(r => r.ndpph)),
    avgOvUn: average(rows.map(r => r.ovUn)),
    amPmSplit: '55/45'
  };
}).filter(Boolean);

// ----- FINAL OBJECT -----
const output = {
  center,
  routes,
  drivers,
  routeBaselines,
  driverBaselines,
  dailyHistory
};

fs.writeFileSync(
  'knowledgechart-demo.json',
  JSON.stringify(output, null, 2)
);

console.log('✅ knowledgechart-demo.json generated successfully');
