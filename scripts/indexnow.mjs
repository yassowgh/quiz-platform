// Submit the site URLs to IndexNow (Bing/Yandex/Seznam) after a CI build.
// Runs ONLY in CI so local `npm run build` never pings. Never fails the build.
if (!process.env.GITHUB_ACTIONS && !process.env.CI) { process.exit(0); }

const KEY = "95b781dad4ba553fef6c377b5a167467";
const HOST = "quizups.com";
const VS = ["kahoot", "quizizz", "blooket", "gimkit", "mentimeter", "slido", "quizlet", "socrative", "wordwall"];
const pages = ["/", "/trivia", "/fun", "/family", "/features", "/pricing", "/about"];
const urlList = pages.map((p) => "https://" + HOST + p).concat(VS.map((s) => "https://" + HOST + "/vs/" + s));

try {
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: "https://" + HOST + "/" + KEY + ".txt", urlList }),
  });
  console.log("IndexNow submit:", r.status, "(" + urlList.length + " urls)");
} catch (e) {
  console.log("IndexNow submit skipped:", (e && e.message) || e);
}
process.exit(0);
