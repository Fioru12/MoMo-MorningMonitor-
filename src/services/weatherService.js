const { getCache, setCache } = require('./cacheService');

const WEATHER_API = 'https://wttr.in';

async function getWeatherData(city = '') {
  const normalizedCity = city.trim();
  const cacheKey = `weather_${normalizedCity.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = normalizedCity
    ? `${WEATHER_API}/${encodeURIComponent(normalizedCity)}?format=j1&lang=it`
    : `${WEATHER_API}?format=j1&lang=it`;

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await response.json();

  if (data.error) {
    return { error: 'Città non trovata' };
  }

  const desc = (entry) => entry?.lang_it?.[0]?.value || entry?.weatherDesc?.[0]?.value || '';

  const current = data.current_condition?.[0];
  const location = data.nearest_area?.[0]?.areaName?.[0]?.value || 'Sconosciuta';

  const forecast = (data.weather || []).slice(0, 3).map((day) => ({
    date: day.date,
    tempMax: day.maxtempC,
    tempMin: day.mintempC,
    desc: desc(day.hourly?.[0]),
    icon: day.hourly?.[0]?.weatherIconUrl?.[0]?.value || '',
  }));

  const astronomy = data.weather?.[0]?.astronomy?.[0] || {};
  const hourly = (data.weather?.[0]?.hourly || []).slice(0, 8).map((h) => ({
    time: h.time.padStart(4, '0'),
    temp: h.tempC,
    chanceRain: h.chanceofrain || '0',
    desc: desc(h),
  }));

  const result = {
    city: location,
    temp: current?.temp_C || 'N/A',
    feelsLike: current?.FeelsLikeC || 'N/A',
    humidity: current?.humidity || 'N/A',
    windSpeed: current?.windspeedKmph || 'N/A',
    desc: desc(current) || 'N/A',
    icon: current?.weatherIconUrl?.[0]?.value || '',
    sunrise: astronomy.sunrise || '06:42',
    sunset: astronomy.sunset || '20:15',
    hourly,
    forecast,
  };

  setCache(cacheKey, result, 5 * 60 * 1000); // 5 min cache
  return result;
}

module.exports = {
  getWeatherData,
};
