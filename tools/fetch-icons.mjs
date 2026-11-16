// Скачивает логотипы всех сайтов из js/links.js в assets/icons/<host>.png.
// Нужны локально: WebGL не может читать картинки с чужих доменов.
// Запуск: node tools/fetch-icons.mjs  (в GitHub Actions — при каждой публикации)
import { mkdir, writeFile } from "node:fs/promises";
import { FAVORITES, GROUPS, SEARCH_ICONS } from "../js/links.js";

const urls = [
  ...FAVORITES.map((i) => i.url),
  ...GROUPS.flatMap((g) => g.items.map((i) => i.url)),
  ...Object.values(SEARCH_ICONS),
];
const hosts = [...new Set(urls.map((u) => new URL(u).hostname))];

await mkdir(new URL("../assets/icons/", import.meta.url), { recursive: true });

const results = await Promise.all(
  hosts.map(async (host) => {
    try {
      const parent = host.split(".").slice(-2).join(".");
      const sources = [
        `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
        `https://icons.duckduckgo.com/ip3/${host}.ico`,
        `https://www.google.com/s2/favicons?domain=${parent}&sz=128`,
      ];
      let buf = null;
      for (const src of sources) {
        const res = await fetch(src).catch(() => null);
        if (res?.ok) { buf = Buffer.from(await res.arrayBuffer()); break; }
      }
      if (!buf) throw new Error("нет иконки");
      await writeFile(new URL(`../assets/icons/${host}.png`, import.meta.url), buf);
      return `ok    ${host} (${buf.length} B)`;
    } catch (e) {
      return `miss  ${host} (${e.message}) — будет буква`;
    }
  }),
);
console.log(results.join("\n"));
