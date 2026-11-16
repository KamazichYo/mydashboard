// Поиск: иконки Google и Яндекса раскрывают поле ввода.
// К запросу можно приложить картинку (кнопка, вставка ⌘V или перетаскивание).

const ENGINES = {
  google: {
    label: "Google",
    text: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  yandex: {
    label: "Яндекс",
    text: (q) => `https://yandex.ru/search/?text=${encodeURIComponent(q)}`,
  },
};

export function startSearch(root, toast) {
  const form = root.querySelector(".search-box");
  const input = root.querySelector(".search-input");
  const fileInput = root.querySelector(".search-file");
  const chip = root.querySelector(".search-chip");
  const chipImg = chip.querySelector("img");
  const buttons = [...root.querySelectorAll(".engine")];
  let engine = null;
  let lastEngine = "google";
  let file = null;

  const setFile = (f) => {
    if (chipImg.src) URL.revokeObjectURL(chipImg.src);
    file = f && f.type.startsWith("image/") ? f : null;
    chip.hidden = !file;
    if (file) chipImg.src = URL.createObjectURL(file);
    else chipImg.removeAttribute("src");
    root.classList.toggle("has-file", !!file);
  };

  const open = (name) => {
    engine = lastEngine = name;
    root.classList.add("open");
    root.dataset.engine = name;
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.engine === name));
    input.placeholder = `Искать в ${ENGINES[name].label}…`;
    input.focus({ preventScroll: true });
  };
  const close = () => {
    engine = null;
    root.classList.remove("open");
    buttons.forEach((b) => b.classList.remove("active"));
    input.blur();
  };

  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      if (engine === b.dataset.engine && !input.value && !file) close();
      else open(b.dataset.engine);
    }),
  );

  root.querySelector(".search-attach").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { setFile(fileInput.files[0]); input.focus(); });
  chip.querySelector("button").addEventListener("click", () => { setFile(null); input.focus(); });

  input.addEventListener("paste", (e) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    if (item) { e.preventDefault(); setFile(item.getAsFile()); }
  });

  // Перетаскивание картинки на страницу.
  addEventListener("dragover", (e) => { e.preventDefault(); root.classList.add("drop"); });
  addEventListener("dragleave", (e) => { if (!e.relatedTarget) root.classList.remove("drop"); });
  addEventListener("drop", (e) => {
    e.preventDefault();
    root.classList.remove("drop");
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) { if (!engine) open(lastEngine); setFile(f); }
  });

  // Начал печатать где угодно — открывается поиск.
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && engine) { close(); return; }
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || e.key === " ") return;
    if (!engine) open(lastEngine);
    else input.focus();
  });

  document.addEventListener("pointerdown", (e) => {
    if (engine && !root.contains(e.target) && !input.value && !file) close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!engine) return;
    const q = input.value.trim();
    if (file) {
      if (engine === "google") googleLens(file);
      else yandexImage(file, toast);
      setFile(null);
      input.value = "";
      return;
    }
    if (q) { window.open(ENGINES[engine].text(q), "_blank", "noopener"); input.value = ""; }
  });
}

// Google Lens принимает картинку обычной формой.
function googleLens(file) {
  const form = document.createElement("form");
  form.method = "POST";
  form.enctype = "multipart/form-data";
  form.action = "https://lens.google.com/v3/upload";
  form.target = "_blank";
  const inp = document.createElement("input");
  inp.type = "file";
  inp.name = "encoded_image";
  const dt = new DataTransfer();
  dt.items.add(file);
  inp.files = dt.files;
  form.append(inp);
  form.style.display = "none";
  document.body.append(form);
  form.submit();
  form.remove();
}

// Яндекс не даёт загрузить картинку со стороннего сайта (CORS),
// поэтому кладём её в буфер и открываем Яндекс Картинки — там ⌘V.
async function yandexImage(file, toast) {
  const tab = window.open("about:blank", "_blank");
  const go = () => { if (tab) tab.location.href = "https://yandex.ru/images/"; };
  try {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    c.getContext("2d").drawImage(bmp, 0, 0);
    const png = await new Promise((r) => c.toBlob(r, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    toast("Картинка в буфере — на Яндексе нажми ⌘V");
    go();
  } catch {
    toast("Не вышло скопировать — открываю Яндекс Картинки");
    go();
  }
}
