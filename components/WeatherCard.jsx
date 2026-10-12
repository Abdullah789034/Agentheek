'use client';

export default function WeatherCard({ result }) {
  if (!result) return null;

  const icons = {
    'Clear sky': '☀️',
    'Mainly clear': '🌤️',
    Sunny: '☀️',
    Clear: '🌙',
    'Partly cloudy': '⛅',
    'Partly Cloudy': '⛅',
    Overcast: '☁️',
    Cloudy: '☁️',
    Fog: '🌫️',
    'Depositing rime fog': '🌫️',
    'Light drizzle': '🌦️',
    'Moderate drizzle': '🌧️',
    'Dense drizzle': '🌧️',
    'Light Rain': '🌧️',
    'Slight rain': '🌧️',
    'Moderate rain': '🌧️',
    'Heavy rain': '🌧️',
    Rain: '🌧️',
    'Slight snow': '❄️',
    'Moderate snow': '❄️',
    'Heavy snow': '❄️',
    Snowy: '❄️',
    'Slight rain showers': '🌦️',
    'Moderate rain showers': '🌧️',
    'Violent rain showers': '⛈️',
    Thunderstorms: '⛈️',
    Thunderstorm: '⛈️',
    Windy: '💨',
    Humid: '💧',
  };

  const icon = icons[result.condition] || '🌡️';

  return (
    <div className="tool-result-card">
      <div className="tool-result-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🌍</span> Real-time Meteorological Feed
        </div>
        {result.source && (
          <span className="weather-source-badge">
            {result.source.includes('Live') ? '📡 Live Data' : '⚡ Simulated'}
          </span>
        )}
      </div>

      <div className="weather-city-row">
        <div className="weather-city">
          <span style={{ fontSize: 24 }}>{icon}</span> {result.city}
        </div>
        {result.coordinates && (
          <div className="weather-coords">{result.coordinates}</div>
        )}
      </div>

      <div className="weather-grid">
        <div className="weather-item">
          <span className="weather-item-label">Temperature</span>
          <span className="weather-item-value">{result.temperature || 'N/A'}</span>
          {result.apparent_temperature && (
            <span className="weather-sub-val">Feels like {result.apparent_temperature}</span>
          )}
        </div>
        <div className="weather-item">
          <span className="weather-item-label">Condition</span>
          <span className="weather-item-value">{result.condition || 'N/A'}</span>
          <span className="weather-sub-val">Current state</span>
        </div>
        <div className="weather-item">
          <span className="weather-item-label">Humidity</span>
          <span className="weather-item-value">{result.humidity || 'N/A'}</span>
          <span className="weather-sub-val">Relative moisture</span>
        </div>
        <div className="weather-item">
          <span className="weather-item-label">Wind Velocity</span>
          <span className="weather-item-value">{result.wind || 'N/A'}</span>
          <span className="weather-sub-val">Surface speed</span>
        </div>
      </div>
    </div>
  );
}
