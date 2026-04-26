import { locations, locationList } from "./data.js";

const app = document.getElementById("app");

const MODE = { match: "match", spell: "spell", say: "say" };

let _narratorVoice;
let _narratorVoicePicked = false;

/** Prefer a warm US English voice that is usually female. Rechecked when `voices` updates. */
function getNarratorVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (_narratorVoicePicked) return _narratorVoice ?? null;
  const list = window.speechSynthesis.getVoices();
  if (!list.length) return null;
  const sName = (v) => ((v.name || "") + " " + (v.voiceURI || "")).toLowerCase();
  const isLikelyMale = (v) =>
    /( male| daniel| david| fred| aaron| mark| thom| arthur| james| brian| gary| albert| junior| zarvox|google uk english male)/i.test(
      sName(v)
    );
  const isLikelyFemale = (v) =>
    /(samantha|karen|victoria|zira|fiona|serena|hazel|jenny|joanna|susan|martha|female|zoe|lisa|nancy|heather|hannah|sara|aria|kate|amy|linda|moira|shelley|tessa|fable)/i.test(
      sName(v)
    );
  const en = list.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  for (const v of en) {
    if (isLikelyMale(v)) continue;
    if (isLikelyFemale(v)) {
      _narratorVoice = v;
      _narratorVoicePicked = true;
      return v;
    }
  }
  for (const v of en) {
    if (!isLikelyMale(v)) {
      _narratorVoice = v;
      _narratorVoicePicked = true;
      return v;
    }
  }
  _narratorVoice = en[0] || list[0] || null;
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
  u.rate = 0.88;
  u.pitch = 1.06;
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

function questionForItem(item) {
  return item.who ? "Who am I?" : "What am I?";
}

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
        : "← Choose game",
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
    el("p", "tagline", "Choose a place, then pick a game: Match, Spell, or Say!")
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
    card.appendChild(el("span", "location-card__sub", "Tap to choose a game"));
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
  lead.appendChild(el("h1", "mode-pick__title", `Pick a game`));
  lead.appendChild(el("p", "mode-pick__sub", "How do you want to learn in the " + loc.title + "?"));
  wrap.appendChild(lead);

  const grid = el("div", "mode-grid");
  const modes = [
    {
      id: MODE.match,
      title: "Match",
      desc: "Drag each word onto the right object.",
    },
    {
      id: MODE.spell,
      title: "Spell",
      desc: "Type the word. Use “Hear it” to listen.",
    },
    {
      id: MODE.say,
      title: "Say",
      desc: "Move near an object, then say or type the name.",
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
    hintText: "Drag each name into the dashed box under the picture. Match them all!",
    worldClass: "",
  });

  const bank = el("div", "match-bank");
  const bankLabel = el("p", "match-bank__label", "Drag a word into the box under a picture:");
  bank.appendChild(bankLabel);

  const shuffled = shuffle(loc.items);
  const state = { matched: new Set() };
  const msg = el("p", "match-msg", "");
  const doneRow = el("div", "match-done is-hidden");
  const again = el("button", "btn btn--soft", "Back to games");
  again.type = "button";
  again.addEventListener("click", () => renderGameModePicker(loc.id));
  doneRow.appendChild(el("span", "match-done__text", "You matched them all! "));
  doneRow.appendChild(again);
  world.appendChild(bank);
  world.appendChild(msg);
  world.appendChild(doneRow);
  app.appendChild(wrap);

  function onAllMatched() {
    msg.textContent = "";
    doneRow.classList.remove("is-hidden");
    speak("Wonderful! You matched every one! That was fantastic. I'm so proud of you.");
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
                  ? "Not that one—try another object."
                  : "Drop the word on a picture.";
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
      "The highlighted object is your word. Type it, or tap Hear it. After 3 wrong checks, the answer is shown.",
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
  input.placeholder = "Type the word…";

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
  const continueRevealed = el("button", "btn btn--primary is-hidden", "Continue to next word");
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
      msg.textContent =
        "You spelled all the words! You worked so hard — I'm really proud of you.";
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
    msg.textContent = `The word is: ${t}. Press Continue for the next word.`;
    msg.className = "spell-message spell-message--info";
    continueRevealed.classList.remove("is-hidden");
    speak(`The word is ${t}. That's okay — you'll get the next one. I believe in you.`);
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
    return ` ${n} ${n === 1 ? "try" : "tries"} left.`;
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
      msg.textContent = `That’s it — ${t}. Perfect spelling!`;
      msg.className = "spell-message spell-message--ok";
      const isLast = index >= loc.items.length - 1;
      playClap(isLast ? 5 : 3);
      for (const { el, item } of objectEls) {
        if (item.word === t) el.classList.add("scene-object--solved");
      }
      if (isLast) {
        speak(
          `You did it! The word is ${t}. You spelled every single one! What amazing work. I'm so proud of you!`
        );
      } else {
        speak(
          `That’s it — ${t}. You spelled it beautifully! Keep going — you’re doing great!`
        );
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
        `Try again, or use Hear it. ${left} ${left === 1 ? "try" : "tries"} before the answer is shown.`;
      msg.className = "spell-message spell-message--err";
    }
  });

  applyRound();
}

function renderSayGame(loc) {
  clear();
  const { wrap, world, canvas, objectEls } = buildLocationScene(loc, {
    screenClass: "mode-say",
    hintText:
      "Use Say it, Hear it, and Check under each picture, or point near a picture to open the word box.",
    worldClass: "",
  });

  const riddle = el("div", "riddle-panel is-hidden");
  riddle.setAttribute("aria-live", "polite");
  const riddleQ = el("h3", "riddle-panel__q", "");
  const wordRow = el("div", "word-length");
  const form = el("form", "riddle-form");
  const input = el("input", "spell-input");
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-label", "Type the name");
  input.placeholder = "Type the word…";
  const msg = el("p", "spell-message", "");
  const micNote = el("p", "riddle-aux", "");
  if (!getSpeechRecognition()) {
    micNote.textContent =
      "Saying the word needs a supported browser. You can still type.";
  }
  form.appendChild(input);
  riddle.appendChild(riddleQ);
  riddle.appendChild(wordRow);
  riddle.appendChild(form);
  riddle.appendChild(micNote);
  riddle.appendChild(msg);

  let active = null;
  let hideTimer = 0;
  let activeRec = null;
  /** Tight hit area: icon only; row lock avoids grabbing the row below when moving toward the answer panel. */
  const PROX_FUDGE = 0.35;

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

  function resetAllSayMics() {
    for (const e of objectEls) {
      if (e.sayMic) e.sayMic.textContent = "🎤 Say it";
    }
  }

  function setActiveEntry(entry) {
    if (activeRec) {
      try {
        activeRec.stop();
      } catch (_) {}
      activeRec = null;
    }
    if (!entry) {
      active = null;
      resetAllSayMics();
      riddle.classList.add("is-hidden");
      riddle.setAttribute("aria-hidden", "true");
      for (const { el: o } of objectEls) o.classList.remove("scene-object--near");
      return;
    }
    active = entry;
    for (const { el: o, item } of objectEls) {
      o.classList.toggle("scene-object--near", item.word === entry.item.word);
    }
    riddle.classList.remove("is-hidden");
    riddle.setAttribute("aria-hidden", "false");
    riddleQ.textContent = questionForItem(entry.item);
    setWordSlots(entry.item.word);
    input.value = "";
    input.setAttribute("maxlength", String(entry.item.word.length));
    updateSlots("");
    msg.textContent = "";
    msg.className = "spell-message";
    resetAllSayMics();
    speak(riddleQ.textContent);
  }

  function getNearEntry(clientX, clientY) {
    const yT = loc.rowYTop != null ? loc.rowYTop : 30;
    const yB = loc.rowYBottom != null ? loc.rowYBottom : 72;
    const cr = canvas.getBoundingClientRect();
    if (cr.height < 1) return null;
    const yTopPx = cr.top + (cr.height * yT) / 100;
    const yBottomPx = cr.top + (cr.height * yB) / 100;
    const dTop = Math.abs(clientY - yTopPx);
    const dBottom = Math.abs(clientY - yBottomPx);
    const preferRow = dTop <= dBottom ? 0 : 1;

    let best = null;
    let bestD = Infinity;
    for (const entry of objectEls) {
      if (entry.row !== preferRow) continue;
      const parts = [
        entry.el.querySelector(".scene-object__icon"),
        entry.el.querySelector(".scene-object__actions"),
      ].filter(Boolean);
      for (const hitEl of parts) {
        const r = hitEl.getBoundingClientRect();
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        const halfW = ((r.width || 48) * (1 + PROX_FUDGE)) / 2 + 8;
        const halfH = ((r.height || 48) * (1 + PROX_FUDGE)) / 2 + 8;
        const dx = clientX - cx;
        const dy = clientY - cy;
        if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = entry;
          }
        }
      }
    }
    return best;
  }

  function startMic() {
    if (!active) return;
    const micBtn = active.sayMic;
    if (!micBtn || micBtn.disabled) return;
    if (activeRec) {
      try {
        activeRec.stop();
      } catch (_) {}
      return;
    }
    const R = getSpeechRecognition();
    if (!R) return;
    R.lang = "en-US";
    R.interimResults = false;
    R.maxAlternatives = 3;
    R.onerror = () => {
      activeRec = null;
      resetAllSayMics();
      msg.textContent = "Could not hear. Try again or use the box.";
      msg.className = "spell-message spell-message--info";
    };
    R.onend = () => {
      activeRec = null;
      resetAllSayMics();
    };
    R.onresult = (ev) => {
      if (!active) return;
      const res = ev.results[0];
      for (let i = 0; i < res.length; i++) {
        const g = norm(res[i].transcript);
        if (g) {
          input.value = g.slice(0, active.item.word.length);
          updateSlots(input.value);
          break;
        }
      }
    };
    try {
      R.start();
      activeRec = R;
      resetAllSayMics();
      micBtn.textContent = "⏹ Stop";
      msg.textContent = "Listening…";
      msg.className = "spell-message spell-message--info";
    } catch (_) {
      activeRec = null;
      resetAllSayMics();
    }
  }

  let riddleOver = false;
  riddle.addEventListener("pointerenter", () => {
    riddleOver = true;
  });
  riddle.addEventListener("pointerleave", (e) => {
    riddleOver = false;
    onPointerAt(e.clientX, e.clientY);
  });

  function onPointerAt(clientX, clientY) {
    if (riddleOver) return;
    const near = getNearEntry(clientX, clientY);
    if (near) {
      if (window.clearTimeout) {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = 0;
      }
      if (!active || active.item.word !== near.item.word) {
        setActiveEntry(near);
      }
    } else {
      if (!riddleOver) {
        if (window.clearTimeout) {
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = window.setTimeout(() => {
            if (!riddleOver) setActiveEntry(null);
          }, 500);
        }
      }
    }
  }

  function handleMove(e) {
    const t = e.touches ? e.touches[0] : e;
    onPointerAt(t.clientX, t.clientY);
  }

  function runCheckForEntry(entry) {
    if (!active || active.item.word !== entry.item.word) {
      setActiveEntry(entry);
    }
    const target = entry.item.word;
    const guess = input.value.toUpperCase().trim();
    if (guess.length !== target.length) {
      msg.textContent = `The word has ${target.length} letters.`;
      msg.className = "spell-message spell-message--info";
      return;
    }
    if (guess === target) {
      const allSolved = (() => {
        for (const { el: o, item } of objectEls) {
          if (item.word === target) o.classList.add("scene-object--solved");
        }
        return objectEls.every(({ el: oel }) =>
          oel.classList.contains("scene-object--solved")
        );
      })();
      msg.textContent = allSolved
        ? `You got it — ${target}. You did every single one!`
        : `That’s it — it’s ${target}. Well done!`;
      msg.className = "spell-message spell-message--ok";
      playClap(allSolved ? 5 : 3);
      speak(
        allSolved
          ? `You got it! It is ${target}. You finished them all! I'm so happy for you — wonderful job!`
          : `That’s it! It is ${target}. You said it so well! I'm cheering for you.`
      );
    } else {
      msg.textContent =
        "Not quite. Try “Hear it” or “Say it” under the same picture, or type again.";
      msg.className = "spell-message spell-message--err";
    }
  }

  for (const entry of objectEls) {
    const row = el("div", "scene-object__actions");
    const micBtn = el("button", "btn btn--soft scene-object__action scene-object__say-mic", "🎤 Say it");
    micBtn.type = "button";
    if (!getSpeechRecognition()) {
      micBtn.disabled = true;
      micBtn.classList.add("is-disabled");
    }
    const hearBtn = el("button", "btn btn--soft scene-object__action scene-object__hear", "Hear it");
    hearBtn.type = "button";
    const checkBtn = el("button", "btn btn--primary scene-object__action scene-object__check", "Check");
    checkBtn.type = "button";
    entry.sayMic = micBtn;
    row.appendChild(micBtn);
    row.appendChild(hearBtn);
    row.appendChild(checkBtn);
    entry.el.appendChild(row);
    micBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!active || active.item.word !== entry.item.word) {
        setActiveEntry(entry);
      }
      startMic();
    });
    hearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!active || active.item.word !== entry.item.word) {
        setActiveEntry(entry);
      }
      speak(entry.item.word);
    });
    checkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      runCheckForEntry(entry);
    });
  }

  world.appendChild(riddle);
  canvas.addEventListener("pointermove", handleMove, { passive: true });
  canvas.addEventListener("pointerdown", handleMove, { passive: true });
  canvas.addEventListener("touchmove", handleMove, { passive: true });
  app.appendChild(wrap);

  input.addEventListener("input", () => {
    if (!active) return;
    const max = active.item.word.length;
    const v = input.value.toUpperCase().replace(/[^A-Z]/g, "");
    input.value = v.slice(0, max);
    updateSlots(input.value);
    msg.textContent = "";
    msg.className = "spell-message";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!active) return;
    runCheckForEntry(active);
  });
}

renderHome();
