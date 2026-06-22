const state = {
  selectedPlace: null,
  lastWeather: null,
  comparePlace: null,
  compareWeather: null
};

const els = {
  form: document.getElementById("searchForm"),
  input: document.getElementById("cityInput"),
  locationButton: document.getElementById("locationButton"),
  searchResults: document.getElementById("searchResults"),
  recentSearches: document.getElementById("recentSearches"),
  messageBox: document.getElementById("messageBox"),
  smartSummary: document.getElementById("smartSummary"),
  currentWeather: document.getElementById("currentWeather"),
  riskAnalysis: document.getElementById("riskAnalysis"),
  timingAdvice: document.getElementById("timingAdvice"),
  riskChart: document.getElementById("riskChart"),
  decisionCards: document.getElementById("decisionCards"),
  hourlyForecast: document.getElementById("hourlyForecast"),
  dailyForecast: document.getElementById("dailyForecast"),
  tabButtons: document.querySelectorAll(".tab-button"),
  planType: document.getElementById("planType"),
  planTime: document.getElementById("planTime"),
  checkPlanButton: document.getElementById("checkPlanButton"),
  planResult: document.getElementById("planResult"),
  compareInput: document.getElementById("compareInput"),
  compareButton: document.getElementById("compareButton"),
  compareResult: document.getElementById("compareResult")
};

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

els.form.addEventListener("submit", function (event) {
  event.preventDefault();
  searchCity();
});

els.locationButton.addEventListener("click", getWeatherByCurrentLocation);
els.checkPlanButton.addEventListener("click", checkPlan);
els.compareButton.addEventListener("click", compareCity);
els.compareInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    compareCity();
  }
});

els.tabButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    switchWorkspaceTab(button.dataset.tab);
  });
});

window.addEventListener("online", clearError);
window.addEventListener("offline", function () {
  showError("İnternet bağlantısı yok gibi görünüyor. Bağlantı gelince tekrar deneyin.");
});

setDefaultPlanTime();
loadRecentSearches();
loadLastSelectedCity();

async function searchCity() {
  const query = els.input.value.trim();
  clearError();
  els.searchResults.classList.add("hidden");
  els.searchResults.innerHTML = "";

  if (!navigator.onLine) {
    showError("Şu anda çevrimdışısınız. Hava verisi için internet bağlantısı gerekir.");
    return;
  }

  if (!query) {
    showError("Önce bir şehir adı yazın. Örneğin: İstanbul.");
    return;
  }

  setLoading(true, "Şehirler aranıyor...");

  try {
    const results = await searchPlaces(query, 5);

    if (results.length === 0) {
      showError("Bu isimle şehir bulunamadı. Yazımı kontrol edip tekrar deneyin.");
      return;
    }

    if (results.length === 1) {
      selectPlace(results[0]);
      return;
    }

    renderSearchResults(results);
    showMessage("Birden fazla sonuç buldum. Lütfen doğru şehri seçin.");
  } catch (error) {
    showError("Şehir aranırken bir sorun oluştu. Biraz sonra tekrar deneyin.");
  } finally {
    setLoading(false);
  }
}

async function searchPlaces(query, count) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=${count}&language=tr&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Geocoding API yanıt vermedi.");
  }

  const data = await response.json();
  return data.results || [];
}

function renderSearchResults(results) {
  els.searchResults.innerHTML = results.map(function (place, index) {
    return `
      <button class="result-button" type="button" data-index="${index}">
        <strong>${escapeHtml(place.name)}</strong>
        <span class="muted">${escapeHtml(getPlaceLabel(place))}</span>
      </button>
    `;
  }).join("");

  els.searchResults.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () {
      selectPlace(results[Number(button.dataset.index)]);
    });
  });

  els.searchResults.classList.remove("hidden");
}

function selectPlace(place) {
  const normalized = normalizePlace(place);

  state.selectedPlace = normalized;
  els.input.value = normalized.name;
  els.searchResults.classList.add("hidden");
  getWeather(normalized);
}

async function getWeather(place) {
  clearError();

  if (!navigator.onLine) {
    showError("Şu anda çevrimdışısınız. Hava verisi için internet bağlantısı gerekir.");
    return;
  }

  setLoading(true, "Hava verisi alınıyor...");

  try {
    const data = await fetchWeather(place.latitude, place.longitude);
    state.lastWeather = data;

    renderCurrentWeather(place, data);
    renderRiskAnalysis(data);
    renderSmartSummary(place, data);
    renderTimingAdvice(data);
    renderRiskChart(data);
    renderDecisionCards(data);
    renderHourlyForecast(data);
    renderDailyForecast(data);
    refreshPlanResult();
    refreshComparisonIfReady();
    saveRecentSearch(place);
    loadRecentSearches();
    localStorage.setItem("weatherguard:lastSelected", JSON.stringify(place));
    showMessage(`${place.name} için hava karar paneli hazır.`);
  } catch (error) {
    showError("Hava verisi alınamadı. Open-Meteo tarafında geçici bir sorun olabilir.");
  } finally {
    setLoading(false);
  }
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m",
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max,uv_index_max",
    timezone: "auto",
    forecast_days: "7"
  });

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Forecast API yanıt vermedi.");
  }

  return response.json();
}

function getWeatherByCoords(latitude, longitude, label) {
  const place = {
    name: label || "Mevcut Konum",
    country: "",
    admin1: "",
    latitude,
    longitude
  };

  state.selectedPlace = place;
  getWeather(place);
}

function getWeatherByCurrentLocation() {
  clearError();

  if (!navigator.geolocation) {
    showError("Tarayıcınız konum özelliğini desteklemiyor.");
    return;
  }

  setLoading(true, "Konum izni bekleniyor...");

  navigator.geolocation.getCurrentPosition(
    function (position) {
      getWeatherByCoords(
        position.coords.latitude,
        position.coords.longitude,
        "Mevcut Konum"
      );
    },
    function () {
      setLoading(false);
      showError("Konum izni alınamadı. Sorun değil, şehir adıyla arama yapabilirsiniz.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function renderCurrentWeather(place, data) {
  const current = data.current;
  const weather = getWeatherDescription(current.weather_code);

  els.currentWeather.innerHTML = `
    <div class="current-main">
      <div>
        <div class="place-name">${escapeHtml(place.name)} ${place.country ? "• " + escapeHtml(place.country) : ""}</div>
        <div class="temperature">${round(current.temperature_2m)}°</div>
        <div class="weather-desc">${weather.description}</div>
      </div>
      <div class="weather-icon">${weather.emoji}</div>
    </div>

    <div class="metric-grid">
      ${metric("Hissedilen", `${round(current.apparent_temperature)}°C`)}
      ${metric("Nem", `${round(current.relative_humidity_2m)}%`)}
      ${metric("Rüzgar", `${round(current.wind_speed_10m)} km/sa`)}
      ${metric("Hamle", `${round(current.wind_gusts_10m)} km/sa`)}
      ${metric("Yağış", `${round(current.precipitation)} mm`)}
      ${metric("Yağmur", `${round(current.rain)} mm`)}
    </div>
  `;
}

function renderRiskAnalysis(data) {
  const risk = calculateRiskScore(data);

  els.riskAnalysis.innerHTML = `
    <div class="card-heading">
      <span>🛡️</span>
      <h2>Günlük Risk Skoru</h2>
    </div>
    <div class="risk-score-row">
      <div>
        <div class="risk-score">${risk.score}</div>
        <div class="muted">100 üzerinden</div>
      </div>
      <div class="risk-level ${risk.className}">${risk.level}</div>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width: ${risk.score}%"></div>
    </div>
    <ul class="reason-list">
      ${risk.reasons.map(function (reason) {
        return `<li>${reason}</li>`;
      }).join("")}
    </ul>
    <div class="advice">${risk.advice}</div>
  `;
}

function renderSmartSummary(place, data) {
  const current = data.current;
  const risk = calculateRiskScore(data);
  const timing = analyzeBestTiming(data);
  const weather = getWeatherDescription(current.weather_code);
  const dominant = buildDominantSignal(data);

  els.smartSummary.innerHTML = `
    <div class="summary-icon">${weather.emoji}</div>
    <div>
      <div class="summary-kicker">${escapeHtml(place.name)} için akıllı gün özeti</div>
      <h2>${formatHour(current.time)} itibarıyla ${weather.description.toLowerCase()}, ${risk.level.toLowerCase()}.</h2>
      <p>${dominant} ${timing.bestWindowText}</p>
    </div>
  `;
  els.smartSummary.classList.remove("hidden");
}

function renderTimingAdvice(data) {
  const timing = analyzeBestTiming(data);
  const current = timing.items[0];
  const statusClass = current.risk <= 30 ? "status-good" : current.risk <= 60 ? "status-warn" : "status-bad";

  els.timingAdvice.innerHTML = `
    <div class="card-heading">
      <span>🕒</span>
      <h2>Şimdi mi, Sonra mı?</h2>
    </div>
    <div class="timing-verdict ${statusClass}">${timing.verdict}</div>
    <h3>${timing.headline}</h3>
    <p class="muted">${timing.reason}</p>
    <div class="timing-meta">
      ${miniMetric("Şimdi", `${current.risk}/100`)}
      ${miniMetric("En iyi aralık", timing.bestLabel)}
      ${miniMetric("Ortalama risk", `${timing.bestAverage}/100`)}
    </div>
  `;
}

function renderRiskChart(data) {
  const items = getNextHourlyItems(data, 12);

  els.riskChart.innerHTML = items.map(function (item) {
    const level = item.risk > 60 ? "high" : item.risk > 30 ? "mid" : "";

    return `
      <div class="risk-bar" title="${formatHour(item.time)} • Risk ${item.risk}/100">
        <div class="bar-track">
          <div class="bar-fill ${level}" style="height: ${Math.max(item.risk, 8)}%"></div>
        </div>
        <div class="bar-hour">${formatHour(item.time).slice(0, 2)}</div>
      </div>
    `;
  }).join("");
}

function calculateRiskScore(data) {
  const current = data.current;
  const daily = data.daily;
  const today = 0;
  const reasons = [];
  let score = 0;

  const temp = current.temperature_2m;
  const apparent = current.apparent_temperature;
  const humidity = current.relative_humidity_2m;
  const wind = current.wind_speed_10m;
  const gust = Math.max(current.wind_gusts_10m || 0, daily.wind_gusts_10m_max[today] || 0);
  const rainChance = daily.precipitation_probability_max[today] || 0;
  const uv = daily.uv_index_max[today] || 0;

  if (temp > 32) {
    score += 12;
    reasons.push("Sıcaklık 32°C üzerinde.");
  }

  if (apparent > 35) {
    score += 20;
    reasons.push("Hissedilen sıcaklık yüksek.");
  }

  if (temp < 5) {
    score += 14;
    reasons.push("Soğuk hava konforu düşürebilir.");
  }

  if (wind > 35) {
    score += 14;
    reasons.push("Rüzgar belirgin şekilde kuvvetli.");
  }

  if (gust > 50) {
    score += 20;
    reasons.push("Rüzgar hamleleri yüksek.");
  }

  if (rainChance > 50) {
    score += 16;
    reasons.push("Yağış ihtimali yüksek.");
  }

  if (uv > 6) {
    score += 14;
    reasons.push("UV seviyesi yüksek.");
  }

  if (humidity > 80) {
    score += 8;
    reasons.push("Nem konforu azaltabilir.");
  }

  if (reasons.length >= 3) {
    score += 10;
    reasons.push("Birden fazla etken aynı anda risk yaratıyor.");
  }

  score = clamp(Math.round(score), 0, 100);

  if (reasons.length === 0) {
    reasons.push("Belirgin bir hava riski görünmüyor.");
  }

  const level = score <= 30 ? "Düşük Risk" : score <= 60 ? "Orta Risk" : "Yüksek Risk";
  const className = score <= 30 ? "risk-low" : score <= 60 ? "risk-mid" : "risk-high";
  const advice = buildRiskAdvice({ score, apparent, rainChance, wind, gust, uv });

  return { score, level, className, reasons, advice };
}

function calculateHourRisk(item, planType) {
  let score = 0;
  const apparent = item.apparent;
  const temp = item.temperature;
  const rainChance = item.rainChance;
  const wind = item.wind;
  const gust = item.gust;
  const uv = item.uv;

  if (temp > 32) score += 10;
  if (apparent > 35) score += 18;
  if (temp < 5) score += 12;
  if (rainChance > 30) score += 10;
  if (rainChance > 55) score += 16;
  if (wind > 28) score += 9;
  if (wind > 38) score += 12;
  if (gust > 45) score += 12;
  if (gust > 58) score += 16;
  if (uv > 5) score += 8;
  if (uv > 7) score += 10;

  if (planType === "sport") {
    if (apparent > 30) score += 10;
    if (uv > 6) score += 10;
    if (rainChance > 40) score += 8;
  }

  if (planType === "bike") {
    if (gust > 35) score += 12;
    if (rainChance > 35) score += 12;
  }

  if (planType === "laundry") {
    if (rainChance > 25) score += 22;
    if (wind > 38) score += 10;
    if (uv > 4 && rainChance < 20) score -= 8;
  }

  if (planType === "commute") {
    if (rainChance > 45) score += 10;
    if (gust > 48) score += 10;
  }

  return clamp(Math.round(score), 0, 100);
}

function analyzeBestTiming(data) {
  const items = getNextHourlyItems(data, 12);
  const current = items[0];
  let bestStart = 0;
  let bestAverage = 101;

  for (let i = 0; i <= Math.max(items.length - 3, 0); i += 1) {
    const windowItems = items.slice(i, i + 3);
    const average = Math.round(windowItems.reduce(function (sum, item) {
      return sum + item.risk;
    }, 0) / windowItems.length);

    if (average < bestAverage) {
      bestAverage = average;
      bestStart = i;
    }
  }

  const bestItems = items.slice(bestStart, bestStart + 3);
  const bestLabel = bestItems.length > 1
    ? `${formatHour(bestItems[0].time)}-${formatHour(bestItems[bestItems.length - 1].time)}`
    : formatHour(items[0].time);

  let verdict = "Şimdi uygun";
  let headline = "Şu an çıkmak mantıklı görünüyor.";
  let reason = "Önümüzdeki saatlere göre mevcut risk düşük seviyede.";

  if (current.risk > 60) {
    verdict = "Biraz bekle";
    headline = `${bestLabel} aralığı daha iyi görünüyor.`;
    reason = "Şu an yağış, rüzgar, UV veya sıcaklık birleşimi yüksek risk üretiyor.";
  } else if (bestStart > 0 && bestAverage + 12 < current.risk) {
    verdict = "Sonrası daha iyi";
    headline = `${bestLabel} aralığında koşullar daha rahat.`;
    reason = "Yakın saatlerde risk düşüyor; acelen yoksa o aralık daha konforlu.";
  } else if (current.risk > 30) {
    verdict = "Dikkatli çık";
    headline = "Çıkılır ama hazırlıklı olmak iyi olur.";
    reason = "Risk orta seviyede; özellikle yağış, rüzgar veya UV detayına bakmak mantıklı.";
  }

  return {
    items,
    verdict,
    headline,
    reason,
    bestLabel,
    bestAverage,
    bestWindowText: `En rahat pencere ${bestLabel} gibi görünüyor.`
  };
}

function buildDominantSignal(data) {
  const current = data.current;
  const rainChance = data.daily.precipitation_probability_max[0] || 0;
  const uv = data.daily.uv_index_max[0] || 0;
  const gust = Math.max(current.wind_gusts_10m || 0, data.daily.wind_gusts_10m_max[0] || 0);

  if (rainChance > 60) {
    return "Günün ana konusu yağış ihtimali; şemsiye kararı öne çıkıyor.";
  }

  if (current.apparent_temperature > 34) {
    return "Hissedilen sıcaklık yüksek; uzun dış planları daha serin saatlere almak iyi olur.";
  }

  if (gust > 50) {
    return "Rüzgar hamleleri güçlü; iki tekerlekli ulaşım ve açık alan planları dikkat istiyor.";
  }

  if (uv > 6) {
    return "UV seviyesi yüksek; öğle saatlerinde güneş koruması önemli.";
  }

  if (current.relative_humidity_2m > 80) {
    return "Nem yüksek; hava sıcak olmasa bile biraz bunaltıcı hissedilebilir.";
  }

  return "Belirgin sert bir hava sinyali yok; günlük planlar genel olarak rahat ilerleyebilir.";
}

function buildRiskAdvice(values) {
  if (values.score <= 30) {
    return "Bugün hava genel olarak rahat görünüyor.";
  }

  if (values.rainChance > 50) {
    return "Yağış ihtimali var, dışarı çıkarken hazırlıklı olun.";
  }

  if (values.apparent > 35) {
    return "Hissedilen sıcaklık yüksek. Uzun süre güneşte kalmamaya çalışın.";
  }

  if (values.gust > 50 || values.wind > 35) {
    return "Rüzgar kuvvetli. Bisiklet veya motosiklet için dikkatli olun.";
  }

  if (values.uv > 6) {
    return "UV seviyesi yüksek. Güneş kremi ve şapka iyi olur.";
  }

  return "Hava biraz değişken. Plan yaparken saatlik tahmini kontrol edin.";
}

function renderDecisionCards(data) {
  const today = 0;
  const current = data.current;
  const rainChance = data.daily.precipitation_probability_max[today] || 0;
  const uv = data.daily.uv_index_max[today] || 0;
  const wind = current.wind_speed_10m || 0;
  const gust = Math.max(current.wind_gusts_10m || 0, data.daily.wind_gusts_10m_max[today] || 0);
  const apparent = current.apparent_temperature || current.temperature_2m;

  const cards = [
    umbrellaDecision(rainChance),
    sportDecision(apparent, wind, rainChance, uv),
    bikeDecision(gust, rainChance),
    laundryDecision(rainChance, wind),
    uvDecision(uv)
  ];

  els.decisionCards.innerHTML = cards.map(renderDecisionCard).join("");
}

function umbrellaDecision(rainChance) {
  if (rainChance >= 70) {
    return decision("☂️", "Şemsiye", "Kesinlikle al", "Yağış ihtimali güçlü.", "bad");
  }
  if (rainChance >= 35) {
    return decision("☂️", "Şemsiye", "Yanına al", "Hava dönebilir.", "warn");
  }
  return decision("☂️", "Şemsiye", "Gerekmez", "Yağış düşük görünüyor.", "good");
}

function sportDecision(apparent, wind, rainChance, uv) {
  if (apparent > 36 || rainChance > 70 || wind > 42 || uv > 8) {
    return decision("🏃", "Dışarıda Spor", "Önerilmez", "Koşullar yorucu olabilir.", "bad");
  }
  if (apparent > 30 || rainChance > 40 || wind > 28 || uv > 6) {
    return decision("🏃", "Dışarıda Spor", "Dikkatli", "Saat ve tempo seçimi önemli.", "warn");
  }
  return decision("🏃", "Dışarıda Spor", "Uygun", "Koşullar makul görünüyor.", "good");
}

function bikeDecision(gust, rainChance) {
  if (gust > 55 || rainChance > 70) {
    return decision("🏍️", "Bisiklet / Motosiklet", "Riskli", "Hamle veya yağış riski yüksek.", "bad");
  }
  if (gust > 35 || rainChance > 35) {
    return decision("🏍️", "Bisiklet / Motosiklet", "Dikkatli", "Yol koşullarını takip edin.", "warn");
  }
  return decision("🏍️", "Bisiklet / Motosiklet", "Uygun", "Belirgin risk görünmüyor.", "good");
}

function laundryDecision(rainChance, wind) {
  if (rainChance > 60) {
    return decision("👕", "Çamaşır Asma", "Uygun değil", "Yağış ihtimali yüksek.", "bad");
  }
  if (rainChance > 30 || wind > 38) {
    return decision("👕", "Çamaşır Asma", "Riskli", "Yağış veya rüzgar takip edilmeli.", "warn");
  }
  return decision("👕", "Çamaşır Asma", "Uygun", "Kurutma için fena görünmüyor.", "good");
}

function uvDecision(uv) {
  if (uv >= 7) {
    return decision("🧴", "Güneş Riski", "Yüksek", "Korunmadan uzun kalmayın.", "bad");
  }
  if (uv >= 4) {
    return decision("🧴", "Güneş Riski", "Orta", "Öğle saatlerinde dikkat.", "warn");
  }
  return decision("🧴", "Güneş Riski", "Düşük", "UV seviyesi sakin.", "good");
}

function decision(icon, title, value, note, status) {
  return { icon, title, value, note, status };
}

function renderDecisionCard(card) {
  return `
    <article class="decision-card">
      <div class="decision-top">
        <h3>${card.title}</h3>
        <div class="decision-icon">${card.icon}</div>
      </div>
      <div class="decision-value status-${card.status}">${card.value}</div>
      <div class="decision-note">${card.note}</div>
    </article>
  `;
}

function renderHourlyForecast(data) {
  const items = getNextHourlyItems(data, 12);

  els.hourlyForecast.innerHTML = items.map(function (item) {
    const weather = getWeatherDescription(item.weatherCode);

    return `
      <article class="hour-card">
        <div class="hour-time">${formatHour(item.time)}</div>
        <div class="hour-emoji">${weather.emoji}</div>
        <div class="hour-temp">${round(item.temperature)}°C</div>
        <div class="hour-meta">
          <span>☔ ${round(item.rainChance)}%</span>
          <span>💨 ${round(item.wind)} km/sa</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderDailyForecast(data) {
  els.dailyForecast.innerHTML = data.daily.time.map(function (date, index) {
    const weather = getWeatherDescription(data.daily.weather_code[index]);
    const isToday = index === 0;

    return `
      <article class="day-card ${isToday ? "today" : ""}">
        ${isToday ? '<div class="today-badge">Bugün</div>' : ""}
        <div class="day-name">${formatDayName(date)}</div>
        <div class="day-emoji">${weather.emoji}</div>
        <div class="day-temp">${round(data.daily.temperature_2m_max[index])}° / ${round(data.daily.temperature_2m_min[index])}°</div>
        <div class="day-details">
          <span>☔ ${round(data.daily.precipitation_probability_max[index])}%</span>
          <span>💨 ${round(data.daily.wind_gusts_10m_max[index])} km/sa</span>
          <span>UV ${round(data.daily.uv_index_max[index])}</span>
        </div>
      </article>
    `;
  }).join("");
}

function switchWorkspaceTab(tabName) {
  els.tabButtons.forEach(function (button) {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.getElementById("planTab").classList.toggle("active", tabName === "plan");
  document.getElementById("compareTab").classList.toggle("active", tabName === "compare");
}

function checkPlan() {
  if (!state.lastWeather) {
    els.planResult.textContent = "Önce bir şehir seçmelisin; sonra plan saatini yorumlayabilirim.";
    return;
  }

  const planType = els.planType.value;
  const time = els.planTime.value;

  if (!time) {
    els.planResult.textContent = "Plan için bir saat seç.";
    return;
  }

  const item = findPlanHour(state.lastWeather, time);
  if (!item) {
    els.planResult.textContent = "Bu saat için uygun tahmin verisi bulunamadı.";
    return;
  }

  const risk = calculateHourRisk(item, planType);
  const plan = getPlanCopy(planType);
  const status = risk <= 30 ? "Uygun" : risk <= 60 ? "Dikkatli" : "Önerilmez";
  const statusClass = risk <= 30 ? "status-good" : risk <= 60 ? "status-warn" : "status-bad";
  const weather = getWeatherDescription(item.weatherCode);
  const reasons = getPlanReasons(item, planType);

  els.planResult.innerHTML = `
    <div class="tool-label">${plan.label} • ${formatHour(item.time)}</div>
    <strong class="${statusClass}">${status} (${risk}/100)</strong>
    <p>${weather.description}, ${round(item.temperature)}°C; yağış ${round(item.rainChance)}%, rüzgar ${round(item.wind)} km/sa.</p>
    <p>${reasons}</p>
  `;
}

function refreshPlanResult() {
  if (state.lastWeather && els.planTime.value) {
    checkPlan();
  }
}

function findPlanHour(data, timeValue) {
  const [hourText, minuteText] = timeValue.split(":");
  const targetMinutes = Number(hourText) * 60 + Number(minuteText);
  const now = new Date(data.current.time);
  const items = getNextHourlyItems(data, 48);

  return items.find(function (item) {
    const date = new Date(item.time);
    const itemMinutes = date.getHours() * 60 + date.getMinutes();
    return date >= now && itemMinutes >= targetMinutes && itemMinutes < targetMinutes + 60;
  }) || items.find(function (item) {
    const date = new Date(item.time);
    return date.getHours() === Number(hourText);
  });
}

function getPlanCopy(planType) {
  const copy = {
    walk: { label: "Yürüyüş" },
    sport: { label: "Dışarıda spor" },
    bike: { label: "Bisiklet / motosiklet" },
    laundry: { label: "Çamaşır asma" },
    commute: { label: "Ulaşım" }
  };

  return copy[planType] || copy.walk;
}

function getPlanReasons(item, planType) {
  const notes = [];

  if (item.rainChance > 45) notes.push("yağış ihtimali planı bozabilir");
  if (item.wind > 32 || item.gust > 45) notes.push("rüzgar etkisi hissedilir");
  if (item.uv > 6) notes.push("UV için koruma iyi olur");
  if (item.apparent > 32) notes.push("hissedilen sıcaklık yorabilir");
  if (item.temperature < 6) notes.push("soğuk hava konforu düşürür");
  if (planType === "laundry" && item.rainChance < 25 && item.wind < 35) notes.push("kurutma için koşullar fena değil");

  return notes.length > 0 ? `Not: ${notes.join(", ")}.` : "Not: Bu plan için belirgin bir sorun görünmüyor.";
}

async function compareCity() {
  const query = els.compareInput.value.trim();

  if (!state.selectedPlace || !state.lastWeather) {
    els.compareResult.textContent = "Karşılaştırma için önce ana şehir seç.";
    return;
  }

  if (!query) {
    els.compareResult.textContent = "Karşılaştırılacak şehir adını yaz.";
    return;
  }

  if (!navigator.onLine) {
    els.compareResult.textContent = "Karşılaştırma için internet bağlantısı gerekiyor.";
    return;
  }

  els.compareResult.textContent = "İkinci şehir alınıyor...";

  try {
    const results = await searchPlaces(query, 1);
    if (results.length === 0) {
      els.compareResult.textContent = "Bu şehir bulunamadı.";
      return;
    }

    state.comparePlace = normalizePlace(results[0]);
    state.compareWeather = await fetchWeather(state.comparePlace.latitude, state.comparePlace.longitude);
    renderComparison();
  } catch (error) {
    els.compareResult.textContent = "Karşılaştırma yapılırken bir sorun oluştu.";
  }
}

function refreshComparisonIfReady() {
  if (state.comparePlace && state.compareWeather) {
    renderComparison();
  }
}

function renderComparison() {
  if (!state.selectedPlace || !state.lastWeather || !state.comparePlace || !state.compareWeather) {
    return;
  }

  const left = buildCompareData(state.selectedPlace, state.lastWeather);
  const right = buildCompareData(state.comparePlace, state.compareWeather);
  const better = left.risk.score === right.risk.score
    ? "Riskler eşit görünüyor."
    : left.risk.score < right.risk.score
      ? `${left.place.name} bugün daha rahat görünüyor.`
      : `${right.place.name} bugün daha rahat görünüyor.`;

  els.compareResult.innerHTML = `
    <div class="tool-label">Şehir karşılaştırması</div>
    <p><strong>${better}</strong></p>
    <div class="comparison-grid">
      ${renderCompareCard(left)}
      ${renderCompareCard(right)}
    </div>
  `;
}

function buildCompareData(place, data) {
  const current = data.current;
  return {
    place,
    risk: calculateRiskScore(data),
    temp: current.temperature_2m,
    apparent: current.apparent_temperature,
    rainChance: data.daily.precipitation_probability_max[0] || 0,
    gust: Math.max(current.wind_gusts_10m || 0, data.daily.wind_gusts_10m_max[0] || 0),
    uv: data.daily.uv_index_max[0] || 0,
    weather: getWeatherDescription(current.weather_code)
  };
}

function renderCompareCard(item) {
  return `
    <div class="compare-card">
      <h3>${item.weather.emoji} ${escapeHtml(item.place.name)}</h3>
      <div class="compare-lines">
        <span>Sıcaklık: ${round(item.temp)}°C, hissedilen ${round(item.apparent)}°C</span>
        <span>Yağış: ${round(item.rainChance)}% • Hamle: ${round(item.gust)} km/sa</span>
        <span>UV: ${round(item.uv)} • Risk: ${item.risk.score}/100</span>
      </div>
    </div>
  `;
}

function getNextHourlyItems(data, limit) {
  const now = new Date(data.current.time).getTime();

  return data.hourly.time
    .map(function (time, index) {
      const item = {
        time,
        timestamp: new Date(time).getTime(),
        temperature: data.hourly.temperature_2m[index],
        apparent: data.hourly.apparent_temperature[index],
        rainChance: data.hourly.precipitation_probability[index] || 0,
        precipitation: data.hourly.precipitation[index] || 0,
        weatherCode: data.hourly.weather_code[index],
        wind: data.hourly.wind_speed_10m[index] || 0,
        gust: data.hourly.wind_gusts_10m[index] || 0,
        uv: data.hourly.uv_index[index] || 0
      };
      item.risk = calculateHourRisk(item);
      return item;
    })
    .filter(function (item) {
      return item.timestamp >= now;
    })
    .slice(0, limit);
}

function getWeatherDescription(code) {
  const weatherMap = {
    0: ["Açık", "☀️"],
    1: ["Parçalı Bulutlu", "🌤️"],
    2: ["Parçalı Bulutlu", "⛅"],
    3: ["Bulutlu", "☁️"],
    45: ["Sisli", "🌫️"],
    48: ["Sisli", "🌫️"],
    51: ["Çiseleme", "🌦️"],
    53: ["Çiseleme", "🌦️"],
    55: ["Çiseleme", "🌦️"],
    56: ["Donan Çiseleme", "🌧️"],
    57: ["Donan Çiseleme", "🌧️"],
    61: ["Yağmurlu", "🌧️"],
    63: ["Yağmurlu", "🌧️"],
    65: ["Kuvvetli Yağmur", "🌧️"],
    66: ["Donan Yağmur", "🌧️"],
    67: ["Donan Yağmur", "🌧️"],
    71: ["Karlı", "❄️"],
    73: ["Karlı", "❄️"],
    75: ["Yoğun Kar", "❄️"],
    77: ["Kar Taneleri", "🌨️"],
    80: ["Sağanak", "🌧️"],
    81: ["Sağanak", "🌧️"],
    82: ["Kuvvetli Sağanak", "🌧️"],
    85: ["Kar Sağanağı", "🌨️"],
    86: ["Yoğun Kar Sağanağı", "🌨️"],
    95: ["Fırtına", "⛈️"],
    96: ["Dolu ve Fırtına", "⛈️"],
    99: ["Dolu ve Fırtına", "⛈️"]
  };

  const found = weatherMap[code] || ["Bilinmeyen", "🌈"];
  return { description: found[0], emoji: found[1] };
}

function saveRecentSearch(place) {
  const current = JSON.parse(localStorage.getItem("weatherguard:recent") || "[]");
  const withoutDuplicate = current.filter(function (item) {
    return !(item.name === place.name && item.country === place.country);
  });

  const next = [place].concat(withoutDuplicate).slice(0, 5);
  localStorage.setItem("weatherguard:recent", JSON.stringify(next));
}

function loadRecentSearches() {
  const recent = JSON.parse(localStorage.getItem("weatherguard:recent") || "[]");

  if (recent.length === 0) {
    els.recentSearches.innerHTML = "";
    return;
  }

  els.recentSearches.innerHTML = recent.map(function (place, index) {
    return `<button class="pill" type="button" data-index="${index}">${escapeHtml(place.name)}</button>`;
  }).join("");

  els.recentSearches.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () {
      const place = recent[Number(button.dataset.index)];
      state.selectedPlace = place;
      els.input.value = place.name;
      getWeather(place);
    });
  });
}

function loadLastSelectedCity() {
  const raw = localStorage.getItem("weatherguard:lastSelected");
  if (!raw) {
    return;
  }

  try {
    const place = JSON.parse(raw);
    if (place && place.latitude && place.longitude) {
      state.selectedPlace = place;
      els.input.value = place.name;
      getWeather(place);
    }
  } catch (error) {
    localStorage.removeItem("weatherguard:lastSelected");
  }
}

function setLoading(isLoading, message) {
  document.body.classList.toggle("loading", isLoading);
  if (isLoading && message) {
    showMessage(message);
  }
}

function showError(message) {
  els.messageBox.textContent = message;
  els.messageBox.classList.remove("hidden");
  els.messageBox.classList.add("error");
}

function showMessage(message) {
  els.messageBox.textContent = message;
  els.messageBox.classList.remove("hidden", "error");
}

function clearError() {
  els.messageBox.textContent = "";
  els.messageBox.classList.add("hidden");
  els.messageBox.classList.remove("error");
}

function setDefaultPlanTime() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  els.planTime.value = `${String(nextHour.getHours()).padStart(2, "0")}:00`;
}

function normalizePlace(place) {
  return {
    name: place.name || "Seçili konum",
    country: place.country || "",
    admin1: place.admin1 || "",
    latitude: place.latitude,
    longitude: place.longitude
  };
}

function formatDayName(dateText) {
  const date = new Date(`${dateText}T12:00:00`);
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" }).format(date);
}

function formatHour(dateText) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateText));
}

function getPlaceLabel(place) {
  return [place.admin1, place.country].filter(Boolean).join(", ");
}

function metric(label, value) {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function miniMetric(label, value) {
  return `
    <div class="mini-metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function round(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Math.round(Number(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
