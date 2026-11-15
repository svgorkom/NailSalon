using Microsoft.AspNetCore.StaticFiles;

// Serves the built web app from wwwroot/ (index.html for unknown paths, like a single-page app host).
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// ASP.NET Core does not know .glb (the hand model); without this it answers 404 and the fallback returns index.html instead.
var contentTypes = new FileExtensionContentTypeProvider();
contentTypes.Mappings[".glb"] = "model/gltf-binary";

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = contentTypes });
app.MapFallbackToFile("index.html");

app.Run();
