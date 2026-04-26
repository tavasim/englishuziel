import { locations, locationList } from "./data.js";

const app = document.getElementById("app");

const MODE = { match: "match", spell: "spell", say: "say" };

let _narratorVoice;
let _narratorVoicePicked = false;

/**
 * Picks the least “robotic” en-US/English voice available.
 * Neural / premium / Wavenet-style voices score highest; SAPI/robot-style names are avoided.
 * Quality still depends on OS and browser (Edge/Chrome on recent Windows has the best free options).
 */
function getNarratorVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (_narratorVoicePicked) return _narratorVoice ?? null;
  const list = window.speechSynthesis.getVoices();
  if (!list.length) return null;
  const sName = (v) => ((v.name || "") + " " + (v.voiceURI || "")).toLowerCase();
  const isLikelyMale = (v) =>
    /\b(male|daniel|david|fred|aaron|mark|arthur|james|brian|gary|albert|derek|guy|tom|google uk english male|microsoft david)\b|male\b/.test(
      sName(v)
    );
  const isLikelyFemale = (v) =>
    /(samantha|karen|victoria|fiona|serena|hazel|jenny|joanna|susan|martha|female|zoe|lisa|nancy|heather|hannah|sara|aria|kate|amy|linda|moira|shelley|tessa|fable|kristina|nicole|siri|ivy|zira)/i.test(
      sName(v)
    );
  const score = (v) => {
    const s = sName(v);
    let n = 0;
    if (/neural|wavenet|natural(?!-)|premium|hd\b|journey|enhanced/i.test(s)) n += 85;
    if (/\bonline\b/i.test(s) && /microsoft|edge|aria|jenny/i.test(s)) n += 30;
    if (isLikelyFemale(v)) n += 12;
    if (isLikelyMale(v) && !/neural|wavenet|natural|premium|online/i.test(s)) n -= 40;
    const L = (v.lang || "").toLowerCase();
    if (L === "en-us" || L === "en_us" || L === "en") n += 22;
    else if (L.startsWith("en-")) n += 10;
    if (/samantha|fiona|moira|karen|aria|jenny|hazel|victoria/i.test(s)) n += 18;
    if (/zarvox|festival|pipe organ|bad news|cellos|dennis\b/i.test(s)) n -= 90;
    if (/^microsoft zira(?!.*neural)/i.test(s.trim())) n -= 25;
    if (/google(?!.*\bwave)/.test(s) && /(english|en-us|us)/i.test(s)) n += 6;
    return n;
  };
  const en = list.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  if (!en.length) {
    _narratorVoice = list[0] || null;
    _narratorVoicePicked = true;
    return _narratorVoice;
  }
  en.sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    if (isLikelyFemale(b) !== isLikelyFemale(a)) return isLikelyFemale(b) ? 1 : -1;
    return 0;
  });
  _narratorVoice = en[0] || null;
  _narratorVoicePicked = true;
  return _narratorVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const refreshNarratorVoice = () => {
    _narratorVoice = undefined;
    _narratorVoicePicked = false;
  };
  window.speechSynthesis.addEventListener("voiceschanged", refreshNarratorVoice);
  window.speechSynthesis.getVoices();
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  /* Slightly below 1.0 = clearer; 1.0 pitch = flatter, less “chipmunk / toy” TTS. */
  u.rate = 0.93;
  u.pitch = 0.99;
  u.volume = 1;
  const voice = getNarratorVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

function getSpeechRecognition() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

let clapAudioContext = null;
function getClapContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!clapAudioContext) clapAudioContext = new Ctor();
  return clapAudioContext;
}

/** Set `public/sounds/handclap.mp3` to your hand-clap track (e.g. first 5+ sec from a clip). */
const HANDCLAP_SRC = "/sounds/handclap.mp3";

/**
 * Procedural hand-clap fallback if the sound file is missing or cannot play.
 */
function playClapSynth() {
  const ctx = getClapContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const pulses = 5;
  const spacing = 0.11;
  const t0 = ctx.currentTime + 0.001;
  for (let i = 0; i < pulses; i++) {
    const t = t0 + i * spacing + (Math.random() * 0.02 - 0.01);
    const dur = 0.025 + Math.random() * 0.02;
    const n = Math.max(32, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let j = 0; j < n; j++) {
      const env = Math.pow(1 - j / n, 1.4);
      d[j] = (Math.random() * 2 - 1) * env * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700 + Math.random() * 500;
    filter.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    try {
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * Plays the start of `handclap.mp3` for up to `durationSec` (3 = normal, 5 = all done).
 * Use one MP3 of at least 5s (same file for both; we stop early at 3s when needed).
 * Falls back to the synth if the file is missing or `play()` fails.
 */
function playClap(durationSec = 3) {
  if (typeof durationSec !== "number" || durationSec < 0.1) durationSec = 3;
  const a = new Audio(HANDCLAP_SRC);
  let done = false;
  let tStop = 0;
  const finish = (useSynth) => {
    if (done) return;
    done = true;
    if (tStop) window.clearTimeout(tStop);
    try {
      a.pause();
    } catch (_) {}
    if (useSynth) playClapSynth();
  };
  a.addEventListener("ended", () => finish(false));
  a.addEventListener("error", () => finish(true), { once: true });
  a.volume = 0.88;
  a.currentTime = 0;
  tStop = window.setTimeout(
    () => {
      if (!done) {
        try {
          a.pause();
        } catch (_) {}
        done = true;
      }
    },
    durationSec * 1000 + 15
  );
  a.play().catch(() => {
    if (tStop) window.clearTimeout(tStop);
    if (!done) {
      done = true;
      playClapSynth();
    }
  });
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function clear() {
  app.replaceChildren();
}

const norm = (s) => s.toUpperCase().replace(/[^A-Z]/g, "").trim();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Even horizontal spacing for `count` slots in one row (slotIndex 0..count-1). */
function rowXPercent(slotIndex, count) {
  if (count <= 0) return 50;
  return (100 / (count + 1)) * (slotIndex + 1);
}

/**
 * Two rows: first ceil(n/2) items on the top row, the rest on the bottom.
 * Returns { x, y } in percent for the scene canvas.
 */
function positionInTwoRows(index, total, yTop, yBottom) {
  const topCount = Math.ceil(total / 2);
  if (index < topCount) {
    return { x: rowXPercent(index, topCount), y: yTop };
  }
  const bottomCount = total - topCount;
  const j = index - topCount;
  return { x: rowXPercent(j, bottomCount), y: yBottom };
}

function topBar(loc, backLabel, onBack) {
  const t = el("div", "top-bar");
  const back = el("button", "btn btn--ghost", backLabel);
  back.type = "button";
  back.addEventListener("click", onBack);
  t.appendChild(back);
  t.appendChild(el("h2", "scene-title", loc.title));
  return t;
}

function buildLocationScene(loc, { screenClass, hintText, worldClass }) {
  const wrap = el("div", `screen ${screenClass} screen--${loc.theme}`);

  wrap.appendChild(
    topBar(
      loc,
      screenClass.includes("mode-pick")
        ? "← Home"
        : "← Mode selection",
      () =>
        screenClass.includes("mode-pick")
          ? renderHome()
          : renderGameModePicker(loc.id)
    )
  );
  if (hintText) {
    wrap.appendChild(el("p", "scene-hint", hintText));
  }

  const world = el("div", "scene-world");
  if (worldClass) world.className += ` ${worldClass}`;

  const canvas = el("div", "scene-canvas");
  const background = el("div", "scene-back");
  for (const d of loc.decor || []) {
    background.appendChild(el("span", "scene-back__deco", d));
  }
  canvas.appendChild(background);

  const objectEls = [];
  const items = loc.items;
  const total = items.length;
  const yTop = loc.rowYTop != null ? loc.rowYTop : 30;
  const yBottom = loc.rowYBottom != null ? loc.rowYBottom : 72;
  const topCount = Math.ceil(total / 2);
  items.forEach((item, index) => {
    const row = index < topCount ? 0 : 1;
    const node = el("div", "scene-object");
    node.setAttribute("data-word", item.word);
    const inner = el("div", "scene-object__icon");
    if (item.iconSrc) {
      const img = document.createElement("img");
      img.className = "scene-object__img";
      img.src = item.iconSrc;
      img.alt = item.word;
      img.setAttribute("draggable", "false");
      if (item.size) {
        img.style.height = `calc(5.4rem * ${item.size})`;
        img.style.width = "auto";
      }
      img.addEventListener("error", () => {
        img.remove();
        if (item.icon) inner.textContent = item.icon;
        if (item.size) inner.style.fontSize = `calc(5.4rem * ${item.size})`;
      });
      inner.appendChild(img);
    } else {
      if (item.icon != null) inner.textContent = item.icon;
      if (item.size) inner.style.fontSize = `calc(5.4rem * ${item.size})`;
    }
    node.appendChild(inner);
    const nameBox = el("div", "object-name-box");
    const tag = el("span", "object-name-tag", "");
    nameBox.appendChild(tag);
    node.appendChild(nameBox);
    const { x, y } = positionInTwoRows(index, total, yTop, yBottom);
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    canvas.appendChild(node);
    objectEls.push({ item, el: node, tag, row });
  });

  world.appendChild(canvas);
  wrap.appendChild(world);
  return { wrap, world, canvas, objectEls };
}

function renderHome() {
  clear();
  const wrap = el("div", "screen screen--home");
  const header = el("div", "home-header");
  header.appendChild(el("h1", "title", "English Places"));
  header.appendChild(
    el("p", "tagline", "Select a location, then a mode: Match, Spell, or Say.")
  );
  wrap.appendChild(header);

  const grid = el("div", "location-grid");
  for (const loc of locationList) {
    const card = el("button", `location-card location-card--${loc.theme}`);
    card.type = "button";
    const mini = el("div", "location-card__miniscene");
    for (const d of loc.decor || []) {
      mini.appendChild(el("span", "float-emoji", d));
    }
    card.appendChild(mini);
    card.appendChild(el("span", "location-card__title", loc.title));
    card.appendChild(el("span", "location-card__sub", "Select to continue"));
    card.addEventListener("click", () => renderGameModePicker(loc.id));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  app.appendChild(wrap);
}

function renderGameModePicker(locationId) {
  const loc = locations[locationId];
  if (!loc) return renderHome();
  clear();

  const wrap = el("div", `screen mode-pick screen--${loc.theme}`);
  wrap.appendChild(
    topBar(loc, "← Home", () => {
      renderHome();
    })
  );
  const lead = el("div", "mode-pick__lead");
  lead.appendChild(el("h1", "mode-pick__title", "Select a mode"));
  lead.appendChild(
    el("p", "mode-pick__sub", "Choose the activity for the " + loc.title + " section.")
  );
  wrap.appendChild(lead);

  const grid = el("div", "mode-grid");
  const modes = [
    {
      id: MODE.match,
      title: "Match",
      desc: "Move each label to the corresponding object.",
    },
    {
      id: MODE.spell,
      title: "Spell",
      desc: "Type the word. Use “Hear it” to hear the word.",
    },
    {
      id: MODE.say,
      title: "Say",
      desc: "Each object in order. Say, hear, or type the name, then press Check.",
    },
  ];
  for (const m of modes) {
    const card = el("button", "mode-card");
    card.type = "button";
    card.appendChild(el("span", "mode-card__title", m.title));
    card.appendChild(el("span", "mode-card__desc", m.desc));
    card.addEventListener("click", () => renderGame(loc.id, m.id));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  app.appendChild(wrap);
}

function renderGame(locationId, mode) {
  const loc = locations[locationId];
  if (!loc) return renderHome();
  if (mode === MODE.match) return renderMatchGame(loc);
  if (mode === MODE.spell) return renderSpellGame(loc);
  if (mode === MODE.say) return renderSayGame(loc);
  renderGameModePicker(locationId);
}

function renderMatchGame(loc) {
  clear();
  const { wrap, world, canvas, objectEls } = buildLocationScene(loc, {
    screenClass: "mode-match",
    hintText: "Place each label in the dashed area under the image. Complete all items.",
    worldClass: "",
  });

  const bank = el("div", "match-bank");
  const bankLabel = el("p", "match-bank__label", "Place a label under the correct image:");
  bank.appendChild(bankLabel);

  const shuffled = shuffle(loc.items);
  const state = { matched: new Set() };
  const msg = el("p", "match-msg", "");
  const doneRow = el("div", "match-done is-hidden");
  const again = el("button", "btn btn--soft", "Return to mode selection");
  again.type = "button";
  again.addEventListener("click", () => renderGameModePicker(loc.id));
  doneRow.appendChild(el("span", "match-done__text", "All items are matched. "));
  doneRow.appendChild(again);
  world.appendChild(bank);
  world.appendChild(msg);
  world.appendChild(doneRow);
  app.appendChild(wrap);

  function onAllMatched() {
    msg.textContent = "";
    doneRow.classList.remove("is-hidden");
    speak("All items are correct. The exercise is complete.");
  }

  for (const item of shuffled) {
    const chip = el("button", "match-chip", item.word);
    chip.type = "button";
    chip.setAttribute("data-word", item.word);
    chip.setAttribute("draggable", "true");
    bank.appendChild(chip);

    const startRef = { ox: 0, oy: 0, moved: false };

    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", item.word);
      e.dataTransfer.effectAllowed = "move";
      chip.classList.add("is-dragging");
    });
    chip.addEventListener("dragend", () => {
      chip.classList.remove("is-dragging");
    });

    function bindPointerDrag() {
      let pid = 0;
      function finishDrag(ev) {
        try {
          if (ev.pointerId != null) chip.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        chip.classList.remove("is-dragging");
        chip.classList.remove("is-float");
        chip.style.left = "";
        chip.style.top = "";
      }
      chip.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || state.matched.has(item.word)) return;
        e.preventDefault();
        pid = e.pointerId;
        const r = chip.getBoundingClientRect();
        startRef.ox = e.clientX - r.left;
        startRef.oy = e.clientY - r.top;
        startRef.moved = false;
        chip.classList.add("is-dragging", "is-float");
        try {
          chip.setPointerCapture(pid);
        } catch (_) {}
        const move = (ev) => {
          if (ev.pointerId !== pid) return;
          if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6) {
            startRef.moved = true;
          }
          chip.style.left = `${ev.clientX - startRef.ox}px`;
          chip.style.top = `${ev.clientY - startRef.oy}px`;
        };
        const up = (ev) => {
          if (ev.pointerId !== pid) return;
          chip.classList.remove("is-dragging");
          if (startRef.moved) {
            const t = ev.clientX;
            const u = ev.clientY;
            let hit = null;
            for (const { item: it, el } of objectEls) {
              if (state.matched.has(it.word)) continue;
              const b = el.getBoundingClientRect();
              if (t >= b.left && t <= b.right && u >= b.top && u <= b.bottom) {
                hit = it;
                break;
              }
            }
            if (hit && hit.word === item.word) {
              state.matched.add(item.word);
              for (const { item: it, el, tag } of objectEls) {
                if (it.word === item.word) {
                  el.classList.add("scene-object--solved", "scene-object--matched");
                  tag.textContent = item.word;
                }
              }
              chip.classList.add("is-hidden");
              const allDone = state.matched.size >= loc.items.length;
              playClap(allDone ? 5 : 3);
              if (allDone) onAllMatched();
            } else {
              for (const { el, item: it } of objectEls) {
                if (hit && it.word === hit.word) {
                  el.classList.add("scene-object--wrong");
                  setTimeout(() => el.classList.remove("scene-object--wrong"), 450);
                }
              }
              if (startRef.moved) {
                msg.textContent = hit
                  ? "Incorrect object. Select another image."
                  : "Release the label over an image.";
                setTimeout(() => (msg.textContent = ""), 2200);
              }
            }
          }
          finishDrag(ev);
          chip.removeEventListener("pointermove", move);
        };
        chip.addEventListener("pointermove", move, { passive: true });
        chip.addEventListener("pointerup", up, { once: true });
        chip.addEventListener("pointercancel", up, { once: true });
      });
    }
    bindPointerDrag();
  }

  for (const { el: node } of objectEls) {
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    node.addEventListener("drop", (e) => {
      e.preventDefault();
      const w = (e.dataTransfer.getData("text/plain") || "").toUpperCase();
      const expect = node.getAttribute("data-word");
      if (!w || !expect) return;
      if (w !== expect) {
        node.classList.add("scene-object--wrong");
        setTimeout(() => node.classList.remove("scene-object--wrong"), 450);
        return;
      }
      if (state.matched.has(w)) return;
      state.matched.add(w);
      for (const { el, tag, item: it } of objectEls) {
        if (it.word === w) {
          el.classList.add("scene-object--solved", "scene-object--matched");
          tag.textContent = w;
        }
      }
      for (const c of bank.querySelectorAll(".match-chip")) {
        if (c.getAttribute("data-word") === w) c.classList.add("is-hidden");
      }
      const allDone = state.matched.size >= loc.items.length;
      playClap(allDone ? 5 : 3);
      if (allDone) onAllMatched();
    });
  }
}

function renderSpellGame(loc) {
  clear();
  const { wrap, world, canvas, objectEls } = buildLocationScene(loc, {
    screenClass: "mode-spell",
    hintText:
      "The highlighted object is the current item. Enter the word or use Hear it. After three failed checks, the answer is displayed.",
    worldClass: "mode-spell-world",
  });

  let index = 0;
  let wrongCount = 0;
  let answerRevealed = false;

  const riddle = el("div", "riddle-panel spell-panel");
  riddle.setAttribute("aria-live", "polite");
  const progress = el("p", "spell-progress", "");
  const riddleQ = el("h3", "riddle-panel__q", "Spell the word");
  const wordRow = el("div", "word-length");
  const form = el("form", "riddle-form");
  const input = el("input", "spell-input");
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-label", "Type the word");
  input.placeholder = "Enter the word";

  const msg = el("p", "spell-message", "");
  const actions = el("div", "riddle-actions");
  const check = el("button", "btn btn--primary", "Check");
  check.type = "submit";
  const listen = el("button", "btn btn--soft", "Hear it");
  listen.type = "button";
  actions.appendChild(listen);
  actions.appendChild(check);
  form.appendChild(input);
  form.appendChild(actions);
  riddle.appendChild(progress);
  riddle.appendChild(riddleQ);
  riddle.appendChild(wordRow);
  riddle.appendChild(form);
  const spellExtra = el("div", "spell-extra");
  const continueRevealed = el("button", "btn btn--primary is-hidden", "Continue");
  continueRevealed.type = "button";
  spellExtra.appendChild(continueRevealed);
  riddle.appendChild(spellExtra);
  riddle.appendChild(msg);
  world.appendChild(riddle);
  app.appendChild(wrap);

  function setWordSlots(word) {
    wordRow.replaceChildren();
    for (const _ of word) {
      wordRow.appendChild(el("span", "word-slot", ""));
    }
  }

  function updateSlots(typed) {
    const slots = wordRow.querySelectorAll(".word-slot");
    for (let i = 0; i < slots.length; i++) {
      slots[i].textContent = typed[i] || "";
    }
  }

  function setHighlight(item) {
    for (const { el: o, item: it } of objectEls) {
      o.classList.toggle("scene-object--spell-focus", Boolean(item) && it.word === item.word);
    }
  }

  function goNext() {
    continueRevealed.classList.add("is-hidden");
    if (index >= loc.items.length - 1) {
      msg.textContent = "All words are complete. End of exercise.";
      msg.className = "spell-message spell-message--ok";
      check.disabled = true;
      input.disabled = true;
      setHighlight(null);
      return;
    }
    index += 1;
    applyRound();
  }

  function showAnswerAfterTries() {
    const t = loc.items[index].word;
    answerRevealed = true;
    input.value = t;
    input.disabled = true;
    check.disabled = true;
    updateSlots(t);
    for (const { el, item } of objectEls) {
      if (item.word === t) el.classList.add("scene-object--solved");
    }
    msg.textContent = `The word is ${t}. Select Continue.`;
    msg.className = "spell-message spell-message--info";
    continueRevealed.classList.remove("is-hidden");
    speak(`The word is ${t}.`);
  }

  function applyRound() {
    const it = loc.items[index];
    answerRevealed = false;
    wrongCount = 0;
    continueRevealed.classList.add("is-hidden");
    input.disabled = false;
    check.disabled = false;
    progress.textContent = `Word ${index + 1} of ${loc.items.length}`;
    setWordSlots(it.word);
    input.value = "";
    input.setAttribute("maxlength", String(it.word.length));
    updateSlots("");
    msg.textContent = "";
    msg.className = "spell-message";
    setHighlight(it);
    input.focus();
  }

  continueRevealed.addEventListener("click", () => {
    if (!answerRevealed) return;
    goNext();
  });

  listen.addEventListener("click", () => {
    if (index < loc.items.length) speak(loc.items[index].word);
  });

  input.addEventListener("input", () => {
    if (index >= loc.items.length || answerRevealed) return;
    const t = loc.items[index].word;
    const max = t.length;
    const v = input.value.toUpperCase().replace(/[^A-Z]/g, "");
    input.value = v.slice(0, max);
    updateSlots(input.value);
    msg.textContent = "";
    msg.className = "spell-message";
  });

  function triesLeftText(n) {
    if (n <= 0) return "";
    return ` ${n} ${n === 1 ? "attempt" : "attempts"} remaining.`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (index >= loc.items.length) return;
    if (answerRevealed) return;
    const t = loc.items[index].word;
    const guess = input.value.toUpperCase().trim();
    if (guess.length !== t.length) {
      wrongCount += 1;
      if (wrongCount >= 3) {
        showAnswerAfterTries();
        return;
      }
      msg.textContent = `The word has ${t.length} letters.${triesLeftText(3 - wrongCount)}`;
      msg.className = "spell-message spell-message--info";
      return;
    }
    if (guess === t) {
      msg.textContent = `Correct: ${t}.`;
      msg.className = "spell-message spell-message--ok";
      const isLast = index >= loc.items.length - 1;
      playClap(isLast ? 5 : 3);
      for (const { el, item } of objectEls) {
        if (item.word === t) el.classList.add("scene-object--solved");
      }
      if (isLast) {
        speak(
          `Correct. The word is ${t}. All items are complete. The exercise is finished.`
        );
      } else {
        speak(`Correct. The word is ${t}.`);
      }
      window.setTimeout(() => goNext(), isLast ? 5200 : 900);
    } else {
      wrongCount += 1;
      if (wrongCount >= 3) {
        showAnswerAfterTries();
        return;
      }
      const left = 3 - wrongCount;
      msg.textContent =
        `Incorrect. You may use Hear it. ${left} ${left === 1 ? "attempt" : "attempts"} remain before the answer is shown.`;
      msg.className = "spell-message spell-message--err";
    }
  });

  applyRound();
}

function renderSayGame(loc) {
  clear();
  const { wrap, world, objectEls } = buildLocationScene(loc, {
    screenClass: "mode-say",
    hintText:
      "The highlighted object is the current item. Use Say it, Hear it, or type the word, then press Check. After three failed checks, the answer is displayed.",
    worldClass: "mode-spell-world",
  });

  let index = 0;
  let wrongCount = 0;
  let answerRevealed = false;
  let activeRec = null;

  const riddle = el("div", "riddle-panel spell-panel");
  riddle.setAttribute("aria-live", "polite");
  const progress = el("p", "spell-progress", "");
  const riddleQ = el("h3", "riddle-panel__q", "Say the word");
  const wordRow = el("div", "word-length");
  const form = el("form", "riddle-form");
  const input = el("input", "spell-input");
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-label", "Type the word");
  input.placeholder = "Enter the word";

  const msg = el("p", "spell-message", "");
  const micNote = el("p", "riddle-aux", "");
  if (!getSpeechRecognition()) {
    micNote.textContent =
      "Speech input requires a supported browser. The text field remains available.";
  }

  const actions = el("div", "riddle-actions");
  const sayBtn = el("button", "btn btn--soft", "🎤 Say it");
  sayBtn.type = "button";
  if (!getSpeechRecognition()) {
    sayBtn.disabled = true;
    sayBtn.classList.add("is-disabled");
  }
  const listen = el("button", "btn btn--soft", "Hear it");
  listen.type = "button";
  const check = el("button", "btn btn--primary", "Check");
  check.type = "submit";
  actions.appendChild(sayBtn);
  actions.appendChild(listen);
  actions.appendChild(check);
  form.appendChild(input);
  form.appendChild(actions);
  riddle.appendChild(progress);
  riddle.appendChild(riddleQ);
  riddle.appendChild(wordRow);
  riddle.appendChild(form);
  const spellExtra = el("div", "spell-extra");
  const continueRevealed = el("button", "btn btn--primary is-hidden", "Continue");
  continueRevealed.type = "button";
  spellExtra.appendChild(continueRevealed);
  riddle.appendChild(spellExtra);
  riddle.appendChild(micNote);
  riddle.appendChild(msg);
  world.appendChild(riddle);
  app.appendChild(wrap);

  function stopMic() {
    if (activeRec) {
      try {
        activeRec.stop();
      } catch (_) {}
      activeRec = null;
    }
  }

  function resetSayButton() {
    sayBtn.textContent = "🎤 Say it";
  }

  function setWordSlots(word) {
    wordRow.replaceChildren();
    for (const _ of word) {
      wordRow.appendChild(el("span", "word-slot", ""));
    }
  }
  function updateSlots(typed) {
    const slots = wordRow.querySelectorAll(".word-slot");
    for (let i = 0; i < slots.length; i++) {
      slots[i].textContent = typed[i] || "";
    }
  }

  function setHighlight(item) {
    for (const { el: o, item: it } of objectEls) {
      o.classList.toggle("scene-object--spell-focus", Boolean(item) && it.word === item.word);
    }
  }

  function triesLeftText(n) {
    if (n <= 0) return "";
    return ` ${n} ${n === 1 ? "attempt" : "attempts"} remaining.`;
  }

  function goNext() {
    continueRevealed.classList.add("is-hidden");
    if (index >= loc.items.length - 1) {
      msg.textContent = "All words are complete. End of exercise.";
      msg.className = "spell-message spell-message--ok";
      check.disabled = true;
      sayBtn.disabled = true;
      listen.disabled = true;
      input.disabled = true;
      setHighlight(null);
      return;
    }
    index += 1;
    applyRound();
  }

  function showAnswerAfterTries() {
    const t = loc.items[index].word;
    answerRevealed = true;
    stopMic();
    resetSayButton();
    input.value = t;
    input.disabled = true;
    check.disabled = true;
    sayBtn.disabled = true;
    updateSlots(t);
    for (const { el, item } of objectEls) {
      if (item.word === t) el.classList.add("scene-object--solved");
    }
    msg.textContent = `The word is ${t}. Select Continue.`;
    msg.className = "spell-message spell-message--info";
    continueRevealed.classList.remove("is-hidden");
    speak(`The word is ${t}.`);
  }

  function applyRound() {
    const it = loc.items[index];
    stopMic();
    resetSayButton();
    answerRevealed = false;
    wrongCount = 0;
    continueRevealed.classList.add("is-hidden");
    if (!getSpeechRecognition()) {
      sayBtn.disabled = true;
    } else {
      sayBtn.disabled = false;
    }
    input.disabled = false;
    check.disabled = false;
    listen.disabled = false;
    progress.textContent = `Word ${index + 1} of ${loc.items.length}`;
    setWordSlots(it.word);
    input.value = "";
    input.setAttribute("maxlength", String(it.word.length));
    updateSlots("");
    msg.textContent = "";
    msg.className = "spell-message";
    setHighlight(it);
    input.focus();
  }

  function startMic() {
    if (index >= loc.items.length || answerRevealed) return;
    if (activeRec) {
      try {
        activeRec.stop();
      } catch (_) {}
      return;
    }
    const R = getSpeechRecognition();
    if (!R) return;
    const target = loc.items[index].word;
    R.lang = "en-US";
    R.interimResults = false;
    R.maxAlternatives = 3;
    R.onerror = () => {
      activeRec = null;
      resetSayButton();
      msg.textContent = "Input was not recognized. Repeat the attempt or use the text field.";
      msg.className = "spell-message spell-message--info";
    };
    R.onend = () => {
      activeRec = null;
      resetSayButton();
    };
    R.onresult = (ev) => {
      if (index >= loc.items.length) return;
      const res = ev.results[0];
      for (let i = 0; i < res.length; i++) {
        const g = norm(res[i].transcript);
        if (g) {
          input.value = g.slice(0, target.length);
          updateSlots(input.value);
          break;
        }
      }
    };
    try {
      R.start();
      activeRec = R;
      sayBtn.textContent = "⏹ Stop";
      msg.textContent = "Listening for input…";
      msg.className = "spell-message spell-message--info";
    } catch (_) {
      activeRec = null;
      resetSayButton();
    }
  }

  continueRevealed.addEventListener("click", () => {
    if (!answerRevealed) return;
    goNext();
  });

  sayBtn.addEventListener("click", (e) => {
    e.preventDefault();
    startMic();
  });

  listen.addEventListener("click", () => {
    if (index < loc.items.length && !answerRevealed) speak(loc.items[index].word);
  });

  input.addEventListener("input", () => {
    if (index >= loc.items.length || answerRevealed) return;
    const t = loc.items[index].word;
    const max = t.length;
    const v = input.value.toUpperCase().replace(/[^A-Z]/g, "");
    input.value = v.slice(0, max);
    updateSlots(input.value);
    msg.textContent = "";
    msg.className = "spell-message";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (index >= loc.items.length) return;
    if (answerRevealed) return;
    const t = loc.items[index].word;
    const guess = input.value.toUpperCase().trim();
    if (guess.length !== t.length) {
      wrongCount += 1;
      if (wrongCount >= 3) {
        showAnswerAfterTries();
        return;
      }
      msg.textContent = `The word has ${t.length} letters.${triesLeftText(3 - wrongCount)}`;
      msg.className = "spell-message spell-message--info";
      return;
    }
    if (guess === t) {
      stopMic();
      msg.textContent = `Correct: ${t}.`;
      msg.className = "spell-message spell-message--ok";
      const isLast = index >= loc.items.length - 1;
      for (const { el, item } of objectEls) {
        if (item.word === t) el.classList.add("scene-object--solved");
      }
      playClap(isLast ? 5 : 3);
      if (isLast) {
        speak(
          `Correct. The word is ${t}. All items are complete. The exercise is finished.`
        );
      } else {
        speak(`Correct. The word is ${t}.`);
      }
      window.setTimeout(() => goNext(), isLast ? 5200 : 900);
    } else {
      wrongCount += 1;
      if (wrongCount >= 3) {
        showAnswerAfterTries();
        return;
      }
      const left = 3 - wrongCount;
      msg.textContent =
        `Incorrect. You may use Hear it or Say it, or re-enter the response. ${left} ${left === 1 ? "attempt" : "attempts"} remain before the answer is shown.`;
      msg.className = "spell-message spell-message--err";
    }
  });

  applyRound();
}

renderHome();
