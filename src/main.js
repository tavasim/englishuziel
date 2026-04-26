import { locations, locationList } from "./data.js";

const app = document.getElementById("app");

const MODE = { match: "match", spell: "spell", say: "say" };

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
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

/** Hand-clap style feedback (short noise bursts), for every correct answer. */
function playClap() {
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
  for (const d of loc.decor) {
    background.appendChild(el("span", "scene-back__deco", d));
  }
  canvas.appendChild(background);

  const objectEls = [];
  for (const item of loc.items) {
    const node = el("div", "scene-object");
    node.setAttribute("data-word", item.word);
    const inner = el("div", "scene-object__icon", item.icon);
    if (item.size) inner.style.fontSize = `calc(2.4rem * ${item.size})`;
    node.appendChild(inner);
    const nameBox = el("div", "object-name-box");
    const tag = el("span", "object-name-tag", "");
    nameBox.appendChild(tag);
    node.appendChild(nameBox);
    node.style.left = `${item.x}%`;
    node.style.top = `${item.y}%`;
    canvas.appendChild(node);
    objectEls.push({ item, el: node, tag });
  }

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
    for (const d of loc.decor) {
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
  doneRow.appendChild(el("span", "match-done__text", "All matched! "));
  doneRow.appendChild(again);
  world.appendChild(bank);
  world.appendChild(msg);
  world.appendChild(doneRow);
  app.appendChild(wrap);

  function onAllMatched() {
    msg.textContent = "";
    doneRow.classList.remove("is-hidden");
    speak("Great! You matched them all.");
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
              playClap();
              if (state.matched.size >= loc.items.length) onAllMatched();
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
      playClap();
      if (state.matched.size >= loc.items.length) onAllMatched();
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
      msg.textContent = "You finished all words! Amazing!";
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
    speak("The word is " + t);
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
      msg.textContent = `Yes! ${t}`;
      msg.className = "spell-message spell-message--ok";
      playClap();
      for (const { el, item } of objectEls) {
        if (item.word === t) el.classList.add("scene-object--solved");
      }
      speak("Yes! " + t);
      window.setTimeout(() => goNext(), 900);
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
    hintText: "Move your pointer or finger near something to answer.",
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
  const actions = el("div", "riddle-actions");
  const check = el("button", "btn btn--primary", "Check");
  check.type = "submit";
  const listen = el("button", "btn btn--soft", "Hear it");
  listen.type = "button";
  const mic = el("button", "btn btn--soft", "🎤 Say it");
  mic.type = "button";
  const micNote = el("p", "riddle-aux", "");
  if (!getSpeechRecognition()) {
    mic.disabled = true;
    mic.classList.add("is-disabled");
    micNote.textContent =
      "Saying the word needs a supported browser. You can still type.";
  }
  actions.appendChild(mic);
  actions.appendChild(listen);
  actions.appendChild(check);
  form.appendChild(input);
  form.appendChild(actions);
  riddle.appendChild(riddleQ);
  riddle.appendChild(wordRow);
  riddle.appendChild(form);
  riddle.appendChild(micNote);
  riddle.appendChild(msg);

  let active = null;
  let hideTimer = 0;
  let activeRec = null;
  const PROX_FUDGE = 0.5;

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

  function setActiveEntry(entry) {
    if (activeRec) {
      try {
        activeRec.stop();
      } catch (_) {}
      activeRec = null;
    }
    if (!entry) {
      active = null;
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
    speak(riddleQ.textContent);
  }

  function getNearEntry(clientX, clientY) {
    let best = null;
    let bestD = Infinity;
    for (const entry of objectEls) {
      const r = entry.el.getBoundingClientRect();
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
    return best;
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

  world.appendChild(riddle);
  canvas.addEventListener("pointermove", handleMove, { passive: true });
  canvas.addEventListener("pointerdown", handleMove, { passive: true });
  canvas.addEventListener("touchmove", handleMove, { passive: true });
  app.appendChild(wrap);

  listen.addEventListener("click", () => {
    if (active) speak(active.item.word);
  });
  if (!mic.disabled) {
    mic.addEventListener("click", () => {
      if (!active) return;
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
        msg.textContent = "Could not hear. Try again or use the box.";
        msg.className = "spell-message spell-message--info";
      };
      R.onend = () => {
        activeRec = null;
        mic.textContent = "🎤 Say it";
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
        mic.textContent = "⏹ Stop";
        msg.textContent = "Listening…";
        msg.className = "spell-message spell-message--info";
      } catch (_) {
        activeRec = null;
      }
    });
  }
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
    const target = active.item.word;
    const guess = input.value.toUpperCase().trim();
    if (guess.length !== target.length) {
      msg.textContent = `The word has ${target.length} letters.`;
      msg.className = "spell-message spell-message--info";
      return;
    }
    if (guess === target) {
      msg.textContent = `Yes! It is ${target}.`;
      msg.className = "spell-message spell-message--ok";
      playClap();
      for (const { el: o, item } of objectEls) {
        if (item.word === target) o.classList.add("scene-object--solved");
      }
      speak(`Yes! ${target}.`);
    } else {
      msg.textContent = "Not quite. Try “Hear it” or “Say it”, or type again.";
      msg.className = "spell-message spell-message--err";
    }
  });
}

renderHome();
