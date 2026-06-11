// Cloudflare Worker — statik siteyi sunar + Render backend'ini uyanık tutar.
// run_worker_first=true: her istek önce buraya gelir; apex alan adı www'ya
// yönlendirilir, kalan istekler assets sistemine (_headers dahil) devredilir.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "gebzepsikologonuruslu.com") {
      url.hostname = "www.gebzepsikologonuruslu.com";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
  // Her tetiklendiğinde Render backend'ine "merhaba" der → uykuya dalmasını engeller
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch("https://psikolog-onuruslu-api.onrender.com/api/health").catch(() => {})
    );
  }
};
