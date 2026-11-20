// ─────────────────────────────────────────────────────────────
//  Все ссылки стартовой страницы — правь только этот файл.
//  name — подпись, url — адрес.
//  size — (необязательно) размер облака, 1 = обычный.
//  icon — (необязательно) своя картинка-логотип (лучше квадратная PNG).
//  Иконки сайтов скачиваются сами при публикации (tools/fetch-icons.mjs).
// ─────────────────────────────────────────────────────────────

// Отдельные большие облака — то, чем пользуешься чаще всего.
export const FAVORITES = [
  { name: "YouTube",    url: "https://www.youtube.com/",     size: 1.25 },
  { name: "VK",         url: "https://vk.com/",              size: 1.15 },
  { name: "Playerok",   url: "https://playerok.com/",        size: 1.1 },
  { name: "GitHub",     url: "https://github.com/KamazichYo", size: 1.05 },
  { name: "ElevenLabs", url: "https://elevenlabs.io/app",    size: 1.0 },
  { name: "Flow",       url: "https://flow.google.com/",     size: 1.0 },
  { name: "Claude",     url: "https://claude.ai/",           size: 1.0 },
  { name: "List.am",    url: "https://www.list.am/",         size: 0.9 },
  { name: "ChatGPT",    url: "https://chatgpt.com/",         size: 0.9 },
  { name: "Perplexity", url: "https://www.perplexity.ai/",   size: 0.95 },
  { name: "Модели ИИ", url: "models.html",             size: 0.95, icon: "assets/icons/models.png" },
  { name: "Pinterest",  url: "https://www.pinterest.com/",   size: 0.95 },
];

// Облака-группы: при наведении распаковываются в облачка-сайты.
export const GROUPS = [
  {
    title: "Нейросети",
    items: [
      { name: "Gemini",       url: "https://gemini.google.com/" },
      { name: "Google Labs",  url: "https://labs.google/" },
      { name: "Higgsfield",   url: "https://higgsfield.ai/" },
      { name: "PixVerse",     url: "https://app.pixverse.ai/" },
      { name: "Hugging Face", url: "https://huggingface.co/" },
      { name: "GramGPT",      url: "https://gramgpt.io/panel" },
    ],
  },
  {
    title: "Видео",
    items: [
      { name: "VK Видео",     url: "https://vkvideo.ru/" },
      { name: "Rutube",       url: "https://rutube.ru/" },
      { name: "vidIQ",        url: "https://app.vidiq.com/" },
      { name: "DownSub",      url: "https://downsub.com/" },
      { name: "Shutterstock", url: "https://www.shutterstock.com/" },
    ],
  },
  {
    title: "Разработка",
    items: [
      { name: "React Bits",     url: "https://reactbits.dev/" },
      { name: "React Bits Pro", url: "https://pro.reactbits.dev/" },
      { name: "Magic UI",       url: "https://magicui.design/" },
      { name: "Aceternity UI",  url: "https://ui.aceternity.com/" },
      { name: "Awwwards",       url: "https://www.awwwards.com/" },
      { name: "SkillsMP",       url: "https://skillsmp.com/" },
      { name: "OVHcloud",       url: "https://manager.eu.ovhcloud.com/" },
    ],
  },
  {
    title: "Покупки",
    items: [
      { name: "FunPay", url: "https://funpay.com/" },
      { name: "GGSEL",  url: "https://ggsel.net/" },
      { name: "Kwork",  url: "https://kwork.ru/" },
      { name: "Temu",   url: "https://www.temu.com/" },
      { name: "eBay",   url: "https://www.ebay.com/" },
    ],
  },
  {
    title: "Разное",
    items: [
      { name: "Booking",    url: "https://www.booking.com/" },
      { name: "Airbnb",     url: "https://ru.airbnb.com/" },
      { name: "Aviasales",  url: "https://www.aviasales.ru/" },
      { name: "vc.ru",      url: "https://vc.ru/" },
      { name: "REG.RU",     url: "https://www.reg.ru/" },
      { name: "Google One", url: "https://one.google.com/" },
    ],
  },
];

// Облачка поисковиков под часами.
export const SEARCH_ICONS = {
  google: "https://www.google.com/",
  yandex: "https://yandex.ru/",
};
