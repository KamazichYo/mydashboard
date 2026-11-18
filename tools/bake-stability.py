#!/usr/bin/env python3
"""Запекает «карту упрямства» для каждой картины: assets/paintings/<имя>.jpg -> <имя>.map.png.
Белое = чёткий объект (луна, звёзды, кипарис, дома), держит форму; чёрное = мягкий фон, течёт свободно.
Запуск: python3 tools/bake-stability.py   (нужны Pillow, numpy, scipy)"""
import glob, os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, sobel

def norm(a, lo=5, hi=97):
    l, h = np.percentile(a, [lo, hi]); return np.clip((a - l) / (h - l + 1e-9), 0, 1)

for path in sorted(glob.glob("assets/paintings/*.jpg")):
    im = Image.open(path).convert("RGB")
    w = 640; im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255
    L = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    mx, mn = a.max(2), a.min(2); sat = (mx - mn) / (mx + 1e-4)
    # 1) объекты: сильно светлее или темнее своей большой окрестности
    #    (луна и звёзды светлее неба, кипарис и дома темнее) — на нескольких масштабах
    ext = np.maximum(np.abs(gaussian_filter(L, 3) - gaussian_filter(L, 45)),
                     np.abs(gaussian_filter(L, 6) - gaussian_filter(L, 90)))
    # 2) яркие тёплые пятна: звёзды, луна, окна
    glow = np.clip(gaussian_filter(L, 2) - gaussian_filter(L, 14), 0, None) * (0.5 + sat)
    # тёмные массы: кипарис, дома, силуэты
    dark = np.clip(np.percentile(L, 22) - gaussian_filter(L, 3), 0, None)
    # 3) мелкие края и контуры, широко размытые, чтобы не рисовать шум мазков
    g = gaussian_filter(L, 1.5); edge = gaussian_filter(np.hypot(sobel(g, 0), sobel(g, 1)), 7)
    s = 0.45 * norm(gaussian_filter(ext, 4)) + 0.5 * norm(gaussian_filter(glow, 3)) + 0.5 * norm(gaussian_filter(dark, 3)) + 0.25 * norm(edge)
    s = gaussian_filter(s, 5)
    lo, hi = np.percentile(s, [22, 88])
    m = np.clip((s - lo) / (hi - lo + 1e-9), 0, 1) ** 1.15
    Image.fromarray((m * 255).astype(np.uint8)).save(path.replace(".jpg", ".map.png"), optimize=True)
    print(os.path.basename(path), "mean stability %.2f" % m.mean())
