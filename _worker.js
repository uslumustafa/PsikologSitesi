// Cloudflare Worker — statik siteyi sunar + Render backend'ini uyanık tutar.
// Statik varlıklar (run_worker_first=false varsayılanı ile) doğrudan assets sistemi
// tarafından sunulur (_headers dahil); bu fetch yalnızca eşleşmeyen yollar için çalışır.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
  // Her tetiklendiğinde Render backend'ine "merhaba" der → uykuya dalmasını engeller
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch("https://psikolog-onuruslu-api.onrender.com/api/health").catch(() => {})
    );
  }
};
