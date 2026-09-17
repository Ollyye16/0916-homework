/**
 * AIoT-DA Personal Portal & Live Timekeeper
 * Core Application Logic & Asynchronous Data Streams
 * Author: Olly
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. 狀態管理 (Unified State Management)
  // =========================================================================
  const STORAGE_KEY = 'aiot_user_state';

  const defaultState = {
    name: 'Olly',
    tagline: 'AIoT & Data Analytics Master Student',
    format24h: true,
    soundEnabled: false,
    selectedCity: 'taichung',
    zenMode: false,
    useCsharpBackend: false
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : { ...defaultState };
    } catch (e) {
      console.warn('無法從 LocalStorage 讀取狀態，使用預設值', e);
      return { ...defaultState };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.warn('無法儲存狀態至 LocalStorage', e);
    }
  }

  const appState = loadState();

  // =========================================================================
  // 2. DOM 元素快取
  // =========================================================================
  const dom = {
    // 頂部控制列
    topNav: document.getElementById('topNav'),
    citySelect: document.getElementById('citySelect'),
    formatToggleBtn: document.getElementById('formatToggleBtn'),
    formatLabel: document.getElementById('formatLabel'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIcon: document.getElementById('soundIcon'),
    soundLabel: document.getElementById('soundLabel'),
    zenToggleBtn: document.getElementById('zenToggleBtn'),
    zenExitBtn: document.getElementById('zenExitBtn'),

    // 時鐘卡片
    greetingBadge: document.getElementById('greetingBadge'),
    dayOfYearBadge: document.getElementById('dayOfYearBadge'),
    isoWeekBadge: document.getElementById('isoWeekBadge'),
    secondRingProgress: document.getElementById('secondRingProgress'),
    clockHours: document.getElementById('clockHours'),
    clockMinutes: document.getElementById('clockMinutes'),
    clockSeconds: document.getElementById('clockSeconds'),
    clockMillis: document.getElementById('clockMillis'),
    clockPeriod: document.getElementById('clockPeriod'),
    fullDateDisplay: document.getElementById('fullDateDisplay'),
    unixTimestamp: document.getElementById('unixTimestamp'),
    timezoneDisplay: document.getElementById('timezoneDisplay'),

    // 天氣卡片
    refreshWeatherBtn: document.getElementById('refreshWeatherBtn'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherTemp: document.getElementById('weatherTemp'),
    weatherCondition: document.getElementById('weatherCondition'),
    weatherLocation: document.getElementById('weatherLocation'),
    weatherHumidity: document.getElementById('weatherHumidity'),
    weatherWind: document.getElementById('weatherWind'),
    weatherApparentTemp: document.getElementById('weatherApparentTemp'),
    weatherUpdateTime: document.getElementById('weatherUpdateTime'),
    weatherStatusMessage: document.getElementById('weatherStatusMessage'),

    // 身分卡片
    userName: document.getElementById('userName'),
    userTagline: document.getElementById('userTagline'),

    // 遙測卡片
    telemCpu: document.getElementById('telemCpu'),
    cpuMeter: document.getElementById('cpuMeter'),
    telemRam: document.getElementById('telemRam'),
    ramMeter: document.getElementById('ramMeter'),
    telemPackets: document.getElementById('telemPackets'),
    csharpApiStatus: document.getElementById('csharpApiStatus'),
    backendStatusBadge: document.getElementById('backendStatusBadge'),
    toggleDataSourceBtn: document.getElementById('toggleDataSourceBtn'),

    // 專案展示網格
    projectsGrid: document.getElementById('projectsGrid')
  };

  // =========================================================================
  // 3. Web Audio API 機械時鐘秒針音效 (Zero External Dependencies)
  // =========================================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTickSound(isTock = false) {
    if (!appState.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      // 秒針機械聲模擬 (Tick / Tock 頻率微調)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isTock ? 1200 : 1600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.03);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // =========================================================================
  // 4. 高精度動態時鐘迴圈 (Timekeeper Engine)
  // =========================================================================
  const RING_CIRCUMFERENCE = 2 * Math.PI * 115; // r = 115 => ~722.56px
  let lastSecond = -1;

  function calculateDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function calculateISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  function getGreeting(hour) {
    if (hour >= 5 && hour < 12) return 'GOOD MORNING';
    if (hour >= 12 && hour < 17) return 'GOOD AFTERNOON';
    if (hour >= 17 && hour < 22) return 'GOOD EVENING';
    return 'GOOD NIGHT';
  }

  function updateClock() {
    const now = new Date();
    const rawHours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const millis = now.getMilliseconds();

    // 格式化小時 (12H / 24H)
    let displayHours = rawHours;
    let periodText = '24H';

    if (!appState.format24h) {
      periodText = rawHours >= 12 ? 'PM' : 'AM';
      displayHours = rawHours % 12 || 12;
    }

    // 填充兩位數
    const hhStr = String(displayHours).padStart(2, '0');
    const mmStr = String(minutes).padStart(2, '0');
    const ssStr = String(seconds).padStart(2, '0');
    const msStr = '.' + String(millis).padStart(3, '0');

    // 更新 DOM 數字
    if (dom.clockHours.textContent !== hhStr) dom.clockHours.textContent = hhStr;
    if (dom.clockMinutes.textContent !== mmStr) dom.clockMinutes.textContent = mmStr;
    dom.clockSeconds.textContent = ssStr;
    dom.clockMillis.textContent = msStr;
    dom.clockPeriod.textContent = periodText;

    // 更新圓形秒數進度環 (平滑連續動畫)
    const exactSeconds = seconds + millis / 1000;
    const progress = exactSeconds / 60;
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    dom.secondRingProgress.style.strokeDashoffset = offset;

    // 每秒觸發滴答聲與週期任務
    if (seconds !== lastSecond) {
      playTickSound(seconds % 2 === 0);
      lastSecond = seconds;

      // 更新 Unix Timestamp
      dom.unixTimestamp.textContent = Math.floor(now.getTime() / 1000);

      // 更新時段問候語
      dom.greetingBadge.textContent = getGreeting(rawHours);
    }
  }

  function updateDateMetadata() {
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dayStr = days[now.getDay()];

    dom.fullDateDisplay.textContent = `${y}-${m}-${d} ${dayStr}`;
    dom.dayOfYearBadge.textContent = `DOY ${calculateDayOfYear(now)}`;
    dom.isoWeekBadge.textContent = `WK ${calculateISOWeek(now)}`;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      dom.timezoneDisplay.textContent = `${tz} (UTC+8)`;
    } catch (e) {
      dom.timezoneDisplay.textContent = 'Asia/Taipei (UTC+8)';
    }
  }

  // =========================================================================
  // 5. Open-Meteo 天氣 API 與城市支援
  // =========================================================================
  const CITIES = {
    taichung: { name: '台中市 · Taichung', lat: 24.1477, lon: 120.6736 },
    taipei: { name: '台北市 · Taipei', lat: 25.0330, lon: 121.5654 },
    hsinchu: { name: '新竹市 · Hsinchu', lat: 24.8138, lon: 120.9675 },
    tainan: { name: '台南市 · Tainan', lat: 22.9997, lon: 120.2270 },
    kaohsiung: { name: '高雄市 · Kaohsiung', lat: 22.6273, lon: 120.3014 }
  };

  // WMO 天氣代碼對照表
  function mapWmoCode(code) {
    if (code === 0) return { text: '晴朗 (Clear)', icon: '☀️' };
    if (code === 1) return { text: '大致晴朗 (Mainly Clear)', icon: '🌤️' };
    if (code === 2) return { text: '局部多雲 (Partly Cloudy)', icon: '⛅' };
    if (code === 3) return { text: '陰天 (Overcast)', icon: '☁️' };
    if (code === 45 || code === 48) return { text: '有霧 (Foggy)', icon: '🌫️' };
    if (code >= 51 && code <= 55) return { text: '毛毛細雨 (Drizzle)', icon: '🌦️' };
    if (code >= 61 && code <= 65) return { text: '降雨 (Rain)', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { text: '降雪 (Snow)', icon: '❄️' };
    if (code >= 80 && code <= 82) return { text: '陣雨 (Showers)', icon: '🌦️' };
    if (code >= 95) return { text: '雷雨 (Thunderstorm)', icon: '⛈️' };
    return { text: '多雲時晴 (Cloudy)', icon: '⛅' };
  }

  let weatherFetchTimer = null;

  async function fetchWeather(customCoords = null) {
    dom.refreshWeatherBtn.classList.add('rotating');
    dom.weatherStatusMessage.textContent = '正在同步即時氣象資料...';

    let targetLat, targetLon, cityName;

    if (customCoords) {
      targetLat = customCoords.lat;
      targetLon = customCoords.lon;
      cityName = customCoords.name || 'GPS 定位地點';
    } else {
      const cityKey = appState.selectedCity in CITIES ? appState.selectedCity : 'taichung';
      const cityInfo = CITIES[cityKey];
      targetLat = cityInfo.lat;
      targetLon = cityInfo.lon;
      cityName = cityInfo.name;
    }

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();

      const current = data.current;
      const weatherInfo = mapWmoCode(current.weather_code);

      // 更新畫面
      dom.weatherTemp.textContent = Math.round(current.temperature_2m);
      dom.weatherCondition.textContent = weatherInfo.text;
      dom.weatherIcon.textContent = weatherInfo.icon;
      dom.weatherLocation.textContent = `📍 ${cityName}`;
      dom.weatherHumidity.textContent = `${current.relative_humidity_2m} %`;
      dom.weatherWind.textContent = `${current.wind_speed_10m} km/h`;
      dom.weatherApparentTemp.textContent = `${Math.round(current.apparent_temperature)} °C`;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      dom.weatherUpdateTime.textContent = timeStr;
      dom.weatherStatusMessage.textContent = 'Open-Meteo 即時氣象連線正常 · Zero Key Required';

      // 儲存快取以供離線或降級使用
      localStorage.setItem('aiot_weather_cache', JSON.stringify({
        temp: Math.round(current.temperature_2m),
        condition: weatherInfo.text,
        icon: weatherInfo.icon,
        location: cityName,
        humidity: current.relative_humidity_2m,
        wind: current.wind_speed_10m,
        apparent: Math.round(current.apparent_temperature),
        cachedAt: timeStr
      }));
    } catch (err) {
      console.warn('天氣 API 連線失敗，嘗試使用快取或降級資料', err);
      fallbackWeather(cityName);
    } finally {
      setTimeout(() => {
        dom.refreshWeatherBtn.classList.remove('rotating');
      }, 600);
    }
  }

  function fallbackWeather(cityName) {
    const cached = localStorage.getItem('aiot_weather_cache');
    if (cached) {
      const data = JSON.parse(cached);
      dom.weatherTemp.textContent = data.temp;
      dom.weatherCondition.textContent = data.condition;
      dom.weatherIcon.textContent = data.icon;
      dom.weatherLocation.textContent = `📍 ${cityName || data.location} (快取)`;
      dom.weatherHumidity.textContent = `${data.humidity} %`;
      dom.weatherWind.textContent = `${data.wind} km/h`;
      dom.weatherApparentTemp.textContent = `${data.apparent} °C`;
      dom.weatherUpdateTime.textContent = data.cachedAt;
      dom.weatherStatusMessage.textContent = '⚠️ 網路離線中 · 顯示本地快取氣象';
    } else {
      // 預設示範數據
      dom.weatherTemp.textContent = '26';
      dom.weatherCondition.textContent = '多雲時晴 (離線展示)';
      dom.weatherIcon.textContent = '⛅';
      dom.weatherLocation.textContent = `📍 ${cityName || '台中市'}`;
      dom.weatherHumidity.textContent = '65 %';
      dom.weatherWind.textContent = '12 km/h';
      dom.weatherApparentTemp.textContent = '27 °C';
      dom.weatherUpdateTime.textContent = 'Offline';
      dom.weatherStatusMessage.textContent = '⚠️ 無法連線至氣象伺服器 · 採用離線安全模式';
    }
  }

  function handleCityChange() {
    const val = dom.citySelect.value;
    if (val === 'geo') {
      if ('geolocation' in navigator) {
        dom.weatherStatusMessage.textContent = '正在取得 GPS 座標...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWeather({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              name: '目前定位位置 (GPS)'
            });
          },
          (err) => {
            alert('無法獲取地理位置權限，切換回台中預設值。');
            dom.citySelect.value = 'taichung';
            appState.selectedCity = 'taichung';
            saveState();
            fetchWeather();
          },
          { timeout: 8000 }
        );
      } else {
        alert('您的瀏覽器不支援地理位置功能。');
        dom.citySelect.value = 'taichung';
      }
    } else {
      appState.selectedCity = val;
      saveState();
      fetchWeather();
    }
  }

  // =========================================================================
  // 6. 專案清單非同步載入 (Fetch projects.json)
  // =========================================================================
  async function loadProjects() {
    try {
      const res = await fetch('./projects.json');
      if (!res.ok) throw new Error(`載入失敗: ${res.status}`);
      const projects = await res.json();
      renderProjects(projects);
    } catch (err) {
      console.warn('無法載入 projects.json，使用內建資料', err);
      renderFallbackProjects();
    }
  }

  function renderProjects(projects) {
    if (!projects || projects.length === 0) {
      dom.projectsGrid.innerHTML = '<p class="loading-state">尚無專案資料</p>';
      return;
    }

    const html = projects.map(p => {
      const tagsHtml = (p.tags || []).map(t => `<span class="proj-tag-badge">${t}</span>`).join('');
      const metricsHtml = p.metrics ? Object.entries(p.metrics).map(([k, v]) => `
        <div class="metric-pill">
          <span class="metric-pill-label">${k}</span>
          <span class="metric-pill-value">${v}</span>
        </div>
      `).join('') : '';

      return `
        <article class="project-card" id="${p.id}">
          <div class="proj-header">
            <span class="proj-category">${p.category || 'AIoT Project'}</span>
            <h3 class="proj-title">${p.title}</h3>
            <p class="proj-desc">${p.description}</p>
          </div>

          ${metricsHtml ? `<div class="proj-metrics-bar">${metricsHtml}</div>` : ''}

          <div class="proj-tags">
            ${tagsHtml}
          </div>

          <div class="proj-footer">
            <a href="${p.link || '#'}" target="_blank" rel="noopener noreferrer" class="proj-link">
              深入檢視專案 <span>→</span>
            </a>
          </div>
        </article>
      `;
    }).join('');

    dom.projectsGrid.innerHTML = html;
  }

  function renderFallbackProjects() {
    const fallback = [
      {
        id: 'proj-1',
        title: 'Edge AI 智慧影像辨識與異常偵測',
        category: 'Edge AI / Embedded Vision',
        description: '部署輕量化 YOLOv8 物件辨識模型於 Raspberry Pi 5，透過神經網路邊緣推論進行即時產線瑕疵檢測。',
        tags: ['YOLOv8', 'Raspberry Pi', 'OpenCV', 'Python'],
        metrics: { fps: '32 FPS', accuracy: '98.4%' },
        link: 'https://github.com/Ollyye16'
      },
      {
        id: 'proj-2',
        title: '環境微氣候與多感測器即時監測網',
        category: 'IoT Sensing / Telemetry',
        description: '運用 ESP32 微控制器串接溫濕度與空氣品質感測器，透過低功耗 MQTT 上傳至 InfluxDB。',
        tags: ['ESP32', 'MQTT', 'InfluxDB', 'FreeRTOS'],
        metrics: { nodes: '8 Nodes', uptime: '99.9%' },
        link: 'https://github.com/Ollyye16'
      },
      {
        id: 'proj-3',
        title: 'AIoT 數據分析與預測維護儀表板',
        category: 'Data Analytics / C# Backend',
        description: '使用高效能 C# ASP.NET Core Minimal API 建立感測資料聚合管道，並透過動態 Web 儀表板視覺化呈現。',
        tags: ['C# .NET', 'Minimal API', 'SignalR', 'RESTful API'],
        metrics: { throughput: '15k req/s', p99: '4.2ms' },
        link: 'https://github.com/Ollyye16'
      }
    ];
    renderProjects(fallback);
  }

  // =========================================================================
  // 7. AIoT 遙測模擬動態數據與 C# 後端檢測
  // =========================================================================
  let packetCount = 1482;

  function updateTelemetryMock() {
    // 模擬波動
    const cpu = (20 + Math.sin(Date.now() / 4000) * 12 + Math.random() * 6).toFixed(1);
    const ram = Math.round(480 + Math.cos(Date.now() / 6000) * 35 + Math.random() * 10);
    packetCount += Math.floor(Math.random() * 3) + 1;

    dom.telemCpu.textContent = `${cpu}%`;
    dom.cpuMeter.style.width = `${cpu}%`;

    dom.telemRam.textContent = `${ram} MB`;
    dom.ramMeter.style.width = `${Math.round((ram / 1024) * 100)}%`;

    dom.telemPackets.textContent = `${packetCount.toLocaleString()} tx`;
  }

  async function checkCsharpBackend() {
    try {
      const res = await fetch('http://localhost:5000/api/telemetry', { mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        dom.csharpApiStatus.textContent = '🟢 Online (localhost:5000)';
        dom.backendStatusBadge.textContent = '.NET C# API CONNECTED';
        dom.backendStatusBadge.style.color = '#10b981';
        dom.backendStatusBadge.style.borderColor = '#10b981';

        if (data.cpuLoad !== undefined) {
          dom.telemCpu.textContent = `${data.cpuLoad}%`;
          dom.cpuMeter.style.width = `${data.cpuLoad}%`;
        }
        if (data.ramMb !== undefined) {
          dom.telemRam.textContent = `${data.ramMb} MB`;
        }
      } else {
        dom.csharpApiStatus.textContent = '⚪ Standalone (Mock)';
      }
    } catch (e) {
      // 後端未啟動，維持純前端 standalone 模式
      dom.csharpApiStatus.textContent = '⚪ Standalone (Mock)';
    }
  }

  // =========================================================================
  // 8. 身分即時編輯與儲存 (Inline Editable)
  // =========================================================================
  function initEditableIdentity() {
    dom.userName.textContent = appState.name || 'Olly';
    dom.userTagline.textContent = appState.tagline || 'AIoT & Data Analytics Master Student';

    const saveIdentity = () => {
      appState.name = dom.userName.textContent.trim() || 'Olly';
      appState.tagline = dom.userTagline.textContent.trim() || 'AIoT & Data Analytics Master Student';
      saveState();
    };

    dom.userName.addEventListener('blur', saveIdentity);
    dom.userTagline.addEventListener('blur', saveIdentity);

    // 按下 Enter 即失焦完成編輯
    dom.userName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dom.userName.blur();
      }
    });

    dom.userTagline.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dom.userTagline.blur();
      }
    });
  }

  // =========================================================================
  // 9. 使用者操作與事件監聽
  // =========================================================================
  function toggleFormat() {
    appState.format24h = !appState.format24h;
    dom.formatLabel.textContent = appState.format24h ? '24H' : '12H';
    saveState();
    updateClock();
  }

  function toggleSound() {
    appState.soundEnabled = !appState.soundEnabled;
    dom.soundIcon.textContent = appState.soundEnabled ? '🔊' : '🔇';
    dom.soundLabel.textContent = appState.soundEnabled ? 'Tick' : 'Mute';
    if (appState.soundEnabled) initAudio();
    saveState();
  }

  function setZenMode(enable) {
    appState.zenMode = enable;
    if (enable) {
      document.body.classList.add('zen-mode');
    } else {
      document.body.classList.remove('zen-mode');
    }
    saveState();
  }

  function initEventListeners() {
    // 城市切換
    dom.citySelect.value = appState.selectedCity || 'taichung';
    dom.citySelect.addEventListener('change', handleCityChange);

    // 手動重整天氣
    dom.refreshWeatherBtn.addEventListener('click', () => fetchWeather());

    // 時間制切換
    dom.formatLabel.textContent = appState.format24h ? '24H' : '12H';
    dom.formatToggleBtn.addEventListener('click', toggleFormat);

    // 音效切換
    dom.soundIcon.textContent = appState.soundEnabled ? '🔊' : '🔇';
    dom.soundLabel.textContent = appState.soundEnabled ? 'Tick' : 'Mute';
    dom.soundToggleBtn.addEventListener('click', toggleSound);

    // Zen Mode 切換
    dom.zenToggleBtn.addEventListener('click', () => setZenMode(!appState.zenMode));
    dom.zenExitBtn.addEventListener('click', () => setZenMode(false));

    // 鍵盤快捷鍵 (Z 切換 Zen, ESC 退出)
    window.addEventListener('keydown', (e) => {
      // 避免在文字編輯時誤觸
      if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        return;
      }
      if (e.key === 'z' || e.key === 'Z') {
        setZenMode(!appState.zenMode);
      } else if (e.key === 'Escape') {
        setZenMode(false);
      }
    });

    // 切換後端資料源檢測按鈕
    dom.toggleDataSourceBtn.addEventListener('click', () => {
      checkCsharpBackend();
      alert('已重新探測本機 C# 後端 API (http://localhost:5000)。\n若欲啟用 C# 服務，請於終端機執行：\ncd backend && dotnet run');
    });
  }

  // =========================================================================
  // 10. 應用程式啟動初始化
  // =========================================================================
  function init() {
    // 1. 初始化身分
    initEditableIdentity();

    // 2. 初始化控制按鈕與事件
    initEventListeners();

    // 3. 恢復 Zen 狀態
    if (appState.zenMode) {
      document.body.classList.add('zen-mode');
    }

    // 4. 初始化日期與時鐘
    updateDateMetadata();
    updateClock();

    // 啟動高頻時鐘渲染迴圈 (每 50ms 確保毫秒與進度環極致流暢)
    setInterval(updateClock, 50);

    // 每分鐘更新一次完整日期 Metadata
    setInterval(updateDateMetadata, 60000);

    // 5. 載入天氣資料 (預設為台中)
    fetchWeather();
    // 每 15 分鐘定時更新天氣
    setInterval(fetchWeather, 15 * 60 * 1000);

    // 6. 非同步載入專案資料
    loadProjects();

    // 7. 啟動 AIoT 遙測數據模擬波動 (每 2 秒)
    setInterval(updateTelemetryMock, 2000);

    // 8. 嘗試檢測是否有 C# 後端運行
    checkCsharpBackend();
  }

  // 當 DOM 解析完成後立即執行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
