// Public Trichy forecast only. No credentials, student data or device location.
export function weatherHandler(fetchImpl = fetch, now = () => Date.now()) {
  let cached = null, loadedAt = 0, pending = null, retryAt = 0;
  return async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try {
      if (!cached || now() - loadedAt >= 20 * 60000) {
        if (now() < retryAt) throw new Error('Backoff');
        pending ||= (async () => {
          const url = new URL('https://api.open-meteo.com/v1/forecast');
          url.search = new URLSearchParams({ latitude: '10.7905', longitude: '78.7047', current: 'temperature_2m,apparent_temperature,weather_code', daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone: 'Asia/Kolkata', forecast_days: '1' }).toString();
          const result = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
          if (!result.ok) throw new Error('Unavailable');
          const data = await result.json();
          const values = [data.current?.temperature_2m, data.current?.apparent_temperature, data.current?.weather_code, data.daily?.temperature_2m_max?.[0], data.daily?.temperature_2m_min?.[0], data.daily?.precipitation_probability_max?.[0]];
          if (!values.every(Number.isFinite)) throw new Error('Invalid data');
          cached = { city: 'Trichy', temperature: values[0], feelsLike: values[1], code: values[2], high: values[3], low: values[4], rain: values[5], updatedAt: now() };
          loadedAt = now();
        })().finally(() => { pending = null; });
        await pending;
      }
      response.json(cached);
    } catch { retryAt = now() + 60000; response.status(503).json({ code: 'WEATHER_UNAVAILABLE' }); }
  };
}
