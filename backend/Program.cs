using System.Collections.Concurrent;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 設定 CORS，允許本機靜態網頁與 GitHub Pages 跨域存取
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() 
    { 
        Title = "AIoT-DA DIC-1 Backend API", 
        Version = "v1", 
        Description = "C# .NET Minimal API for Personal Portal & Live Timekeeper (Author: Olly)" 
    });
});

builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AIoT-DA API v1");
    c.RoutePrefix = "swagger";
});

// 天氣記憶體快取 (10 分鐘有效)
var weatherCache = new ConcurrentDictionary<string, (DateTime Expiry, string JsonData)>();

// 1. 伺服器高精度時間端點
app.MapGet("/api/time", () =>
{
    var now = DateTimeOffset.Now;
    return Results.Ok(new
    {
        localTime = now.ToString("yyyy-MM-dd HH:mm:ss.fff"),
        utcTime = now.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss.fff"),
        unixTimestamp = now.ToUnixTimeSeconds(),
        timeZone = TimeZoneInfo.Local.DisplayName,
        offsetHours = now.Offset.TotalHours,
        dayOfYear = now.DayOfYear
    });
})
.WithName("GetServerTime");

// 2. 氣象代理與快取端點 (Open-Meteo Proxy)
app.MapGet("/api/weather", async (string? city, IHttpClientFactory httpClientFactory) =>
{
    city = (city ?? "taichung").ToLowerInvariant();
    var coordinates = city switch
    {
        "taipei" => (Lat: 25.0330, Lon: 121.5654, Name: "台北市 · Taipei"),
        "hsinchu" => (Lat: 24.8138, Lon: 120.9675, Name: "新竹市 · Hsinchu"),
        "tainan" => (Lat: 22.9997, Lon: 120.2270, Name: "台南市 · Tainan"),
        "kaohsiung" => (Lat: 22.6273, Lon: 120.3014, Name: "高雄市 · Kaohsiung"),
        _ => (Lat: 24.1477, Lon: 120.6736, Name: "台中市 · Taichung")
    };

    if (weatherCache.TryGetValue(city, out var cached) && cached.Expiry > DateTime.UtcNow)
    {
        var doc = JsonDocument.Parse(cached.JsonData);
        return Results.Ok(new { source = "cache", city = coordinates.Name, data = doc.RootElement });
    }

    try
    {
        var client = httpClientFactory.CreateClient();
        var url = $"https://api.open-meteo.com/v1/forecast?latitude={coordinates.Lat}&longitude={coordinates.Lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto";
        var res = await client.GetAsync(url);
        res.EnsureSuccessStatusCode();

        var json = await res.Content.ReadAsStringAsync();
        weatherCache[city] = (DateTime.UtcNow.AddMinutes(10), json);

        var doc = JsonDocument.Parse(json);
        return Results.Ok(new { source = "live", city = coordinates.Name, data = doc.RootElement });
    }
    catch (Exception ex)
    {
        return Results.Problem($"氣象資料抓取失敗: {ex.Message}");
    }
})
.WithName("GetWeatherData");

// 3. AIoT 邊緣節點遙測端點 (Telemetry Stream)
app.MapGet("/api/telemetry", () =>
{
    var rng = new Random();
    var cpu = Math.Round(20 + rng.NextDouble() * 15, 1);
    var ram = 480 + rng.Next(10, 60);
    var uptimeSeconds = Environment.TickCount64 / 1000;

    return Results.Ok(new
    {
        nodeId = "AIOT-EDGE-OLLY-01",
        status = "HEALTHY",
        cpuLoad = cpu,
        ramMb = ram,
        mqttBroker = "online",
        packetsSent = 1500 + rng.Next(1, 100),
        uptime = $"{uptimeSeconds / 3600}h {(uptimeSeconds % 3600) / 60}m",
        timestamp = DateTimeOffset.Now
    });
})
.WithName("GetTelemetry");

// 根路由重定向至 Swagger
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run("http://localhost:5000");
