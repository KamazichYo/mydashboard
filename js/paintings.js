// Картины для задника. Файлы лежат в assets/paintings/: <id>.jpg и карта упрямства <id>.map.png
// (её запекает tools/bake-stability.py). Добавить картину: положить jpg, запустить скрипт, дописать строку.
export const PAINTINGS = [
  { id: "starry-night",  title: "Звёздная ночь" },
  { id: "rhone",         title: "Звёздная ночь над Роной" },
  { id: "crows",         title: "Пшеничное поле с воронами" },
  { id: "cypress-star",  title: "Дорога с кипарисом и звездой" },
  { id: "cypresses",     title: "Пшеничное поле с кипарисами" },
  { id: "almond",        title: "Цветущие ветки миндаля" },
].map((p) => ({ ...p, src: `assets/paintings/${p.id}.jpg`, map: `assets/paintings/${p.id}.map.png` }));
