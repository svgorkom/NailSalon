// Serves the built web app from wwwroot/ (index.html for unknown paths, like a single-page app host).
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
