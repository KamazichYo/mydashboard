#!/usr/bin/env python3
"""Собирает js/models-data.js из: таблицы коэффициентов (context/providers/baza-ai-notes.md), замера (bench_results.json),
описаний (descriptions.json) и ручных правил. Запуск: python3 tools/build-models-data.py"""
import re,json,os,datetime
ROOT="/Users/kamaz/Desktop/AI Ass"
B=ROOT+"/context/providers/bench/"
bench=json.load(open(B+"bench_results.json")) if os.path.exists(B+"bench_results.json") else {}
desc=json.load(open(B+"descriptions.json")) if os.path.exists(B+"descriptions.json") else {}
extra=json.load(open(B+"insights.json")) if os.path.exists(B+"insights.json") else {}
VENDOR=[("gpt","OpenAI"),("claude","Claude (Anthropic)"),("k3","Kimi"),("k2","Kimi"),("kimi","Kimi"),("deepseek","DeepSeek"),("glm","GLM"),("qwen","Qwen"),("gemini","Google"),("grok","xAI"),("mistral","Mistral"),("minimax","MiniMax"),("mimo","MiMo"),("hy","Hy")]
def vendor(i):
    for p,v in VENDOR:
        if i.startswith(p): return v
    return "Другие"
NAMES={}
for l in open(B+"names.txt") if os.path.exists(B+"names.txt") else []:
    a,b=l.rstrip("\n").split("\t");NAMES[a]=b
TAGS={
 "deepseek-v4-flash":["механика","чистка текста","массовое"],"deepseek-v4-pro":["разборы","код","конспекты"],"glm-5.3-flash":["классификация","разборы"],
 "gpt-6-luna":["повседневное Гермионы","мелкие шаги","рассуждение"],"gpt-5.6-luna":["запасной дешёвый"],"gemini-3.5-flash":["быстрые ответы"],
 "gpt-6.1-terra":["агент","браузер","длинные цепочки","синтез"],"gpt-6.1-sol":["код","сложные решения"],"glm-5.3":["агент","код"],
 "claude-sonnet-5-5":["черновики сценариев","креатив","баланс цена/сила"],"claude-opus-5-5":["финальный сценарий","самое сложное"],"gpt-6.2-astra":["финал","самое сложное"],
 "qwen3.8-max":["исследование","синтез"],"k2.7-code":["код"],"mimo-v2.5-pro":["разборы","код"],"grok-4.7":["поиск и свежие темы"],
}
AVOID={"gemini-3.1-pro":"дорого при силе 3/5","claude-opus-4-6":"дорого, слабее новых","claude-opus-4-7":"дорого, слабее новых","gpt-5.5":"×3 при силе 3/5","claude-sonnet-5":"дороже Sonnet 5.5 при меньшей силе","claude-haiku-4-5-20251001":"×1.6 при силе 1/5, дороже deepseek"}
def default_tags(c,p,r):
    if c<=0.75: return ["дешёвое"]
    if p>=7: return ["тяжёлые задачи"]
    return ["общее"]
models=[]
for l in open(ROOT+"/context/providers/baza-ai-notes.md"):
    m=re.match(r"\| ([\w.\-]+) \| ×([\d.]+) \| Сила ([\d.]+)/5 \| ?(Reasoning)? ?\|",l)
    if not m: continue
    i,c,p,r=m.group(1),float(m.group(2)),float(m.group(3)),bool(m.group(4))
    b=bench.get(i,{});a=b.get("a",{});bb=b.get("b",{})
    bn={"okA":bool(a.get("ok")),"okB":bool(b.get("ok_b")),"tokA":a.get("total"),"tokB":bb.get("total"),"secA":a.get("sec"),"secB":bb.get("sec"),"reasonTok":bb.get("reason"),"promptA":a.get("prompt"),"dashA":b.get("dash_a"),"err":(a.get("err") or "")[:80]} if b else None
    d=desc.get(i,{})
    models.append({"id":i,"name":NAMES.get(i) or b.get("name") or i,"vendor":vendor(i),"coef":c,"power":p,"reason":r,"desc":d.get("desc",""),"avoid":AVOID.get(i) or d.get("avoid",""),"best":TAGS.get(i) or default_tags(c,p,r),"bench":bn})
claude=[
 {"id":"cc-fable-5-2","name":"Fable 5.2","vendor":"Claude Code (Вера)","power":None,"reason":True,"desc":"Самая новая и сильная модель в Claude Code по описанию среды. Расход идёт из лимитов подписки, а не по токенам, замерить его отсюда нельзя (смотри /usage в Claude Code).","avoid":"рутина и поиск: это трата лимитов впустую","best":["самое сложное","спорные решения"],"bench":None},
 {"id":"cc-opus-5-5","name":"Opus 5.5","vendor":"Claude Code (Вера)","power":None,"reason":True,"desc":"Тяжёлая модель Веры. По правилам рабочего пространства берётся для сценариев, раскадровки, архитектуры и спорных решений. Расход из лимитов подписки.","avoid":"разбор файлов, поиск, QA","best":["сценарии","раскадровка","архитектура"],"bench":None},
 {"id":"cc-sonnet-5-5","name":"Sonnet 5.5","vendor":"Claude Code (Вера)","power":None,"reason":True,"desc":"Рабочая лошадка Веры: рутина, разбор файлов, поиск, QA, фактчек, звук. Именно на ней сейчас идёт этот чат. Расход из лимитов подписки.","avoid":"финальные сценарии, где нужен максимум","best":["рутина","поиск","QA","код"],"bench":None},
 {"id":"cc-haiku-5-5","name":"Haiku 5.5","vendor":"Claude Code (Вера)","power":None,"reason":False,"desc":"Самая лёгкая модель Веры: совсем простые задачи и массовая механика для субагентов. Расход из лимитов подписки, дешевле Sonnet и Opus.","avoid":"всё, где нужно думать или писать текст","best":["простое","субагенты-помощники"],"bench":None},
]
TASKS=extra.get("tasks") or [
 {"title":"Механика и разметка","why":"Чистка субтитров, нарезка, тегирование, форматирование: не нужно думать, нужно быстро и дёшево.","picks":["deepseek-v4-flash","glm-5.3-flash","deepseek-v4-pro"]},
 {"title":"Повседневная работа Гермионы","why":"Мелкие шаги по одному на запуск: поиск, скачать, положить в папку. Важны цена и надёжность ответа.","picks":["gpt-6-luna","deepseek-v4-pro","glm-5.3-flash"]},
 {"title":"Конспекты и разборы","why":"Классификация роликов, выжимки, извлечение фактов.","picks":["deepseek-v4-pro","glm-5.3-flash","gpt-6-luna"]},
 {"title":"Агент, браузер, длинные цепочки","why":"Нужна сила и устойчивость в многошаговых задачах. Плати за качество, но следи за размером контекста.","picks":["gpt-6.1-terra","gpt-6.1-sol","glm-5.3"]},
 {"title":"Код","why":"Правки и скрипты. Сначала дешёвая, на сложное усиливай.","picks":["deepseek-v4-pro","gpt-6.1-sol","k2.7-code"]},
 {"title":"Исследование и синтез","why":"Свести большой массив в выводы.","picks":["gpt-6.1-terra","gpt-6.1-sol","qwen3.8-max"]},
 {"title":"Сценарии и творчество","why":"Черновики на средней, финал на дорогой модели.","picks":["claude-sonnet-5-5","claude-opus-5-5","gpt-6.2-astra"]},
 {"title":"Вера: рутина, поиск, QA","why":"Claude Code, лимиты подписки.","picks":["cc-sonnet-5-5","cc-haiku-5-5"]},
 {"title":"Вера: сложное и спорное","why":"Сценарии, архитектура, раскадровка.","picks":["cc-opus-5-5","cc-fable-5-2"]},
 {"title":"Не брать","why":"Дороже и слабее аналогов.","picks":["gemini-3.1-pro","claude-opus-4-6","gpt-5.5","claude-sonnet-5"]},
]
SPEND=extra.get("spend") or {"balance":21378134,"issued":41000000,"used":15518470,"pending":4103396,"date":"19.11.2026","byModel":[],"insights":[]}
meta={"stamp":datetime.date.today().strftime("%d.%m.%Y"),"rubPerM":10}
js="// Генерируется tools/build-models-data.py, не править руками.\n"+"".join(f"export const {k} = {json.dumps(v,ensure_ascii=False)};\n" for k,v in [("META",meta),("MODELS",models),("CLAUDE_CODE",claude),("TASKS",TASKS),("SPEND",SPEND)])
open(ROOT+"/start-page/js/models-data.js","w").write(js);print(len(models),"моделей")
