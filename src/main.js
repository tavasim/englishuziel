import { locations, locationList } from "./data.js";

const app = document.getElementById("app");

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

function renderHome() {
  clear();
  const wrap = el("div", "screen screen--home");
  const header = el("div", "home-header");
  header.appendChild(el("h1", "title", "English Places"));
  header.appendChild(
    el(
      "p",
      "tagline",
      "Go to a place, move near an object, and name it — say it or type it!"
    )
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
    card.appendChild(el("span", "location-card__sub", loc.subtitle));
    card.addEventListener("click", () => renderScene(loc.id));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  app.appendChild(wrap);
}

function renderScene(locationId) {
  const loc = locations[locationId];
  if (!loc) return renderHome();

  clear();
  const wrap = el("div", `screen screen--scene screen--${loc.theme}`);

  const top = el("div", "top-bar");
  const back = el("button", "btn btn--ghost", "← Home");
  back.type = "button";
  back.addEventListener("click", renderHome);
  top.appendChild(back);
  top.appendChild(el("h2", "scene-title", loc.title));
  wrap.appendChild(top);

  const hint = el("p", "scene-hint", "Move your pointer or finger near something.");
  wrap.appendChild(hint);

  const world = el("div", "scene-world");
  const canvas = el("div", "scene-canvas");
  world.setAttribute("role", "application");
  world.setAttribute("aria-label", `${loc.title} scene. Move near objects to name them.`);
  canvas.setAttribute("aria-hidden", "false");

  const background = el("div", "scene-back");
  for (const d of loc.decor) {
    const s = el("span", "scene-back__deco", d);
    background.appendChild(s);
  }
  canvas.appendChild(background);

  const objectEls = [];
  for (const item of loc.items) {
    const node = el("div", "scene-object");
    node.setAttribute("data-word", item.word);
    const inner = el("div", "scene-object__icon", item.icon);
    if (item.size) inner.style.fontSize = `calc(2.4rem * ${item.size})`;
    node.appendChild(inner);
    node.style.left = `${item.x}%`;
    node.style.top = `${item.y}%`;
    canvas.appendChild(node);
    objectEls.push({ item, el: node });
  }

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
    micNote.textContent = "Saying the word needs a supported browser (e.g. Chrome, Edge, Safari on desktop). You can still type.";
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

  let riddleOver = false;
  riddle.addEventListener("pointerenter", () => {
    riddleOver = true;
  });
  riddle.addEventListener("pointerleave", (e) => {
    riddleOver = false;
    onPointerAt(e.clientX, e.clientY);
  });

  function handleMove(e) {
    const t = e.touches ? e.touches[0] : e;
    onPointerAt(t.clientX, t.clientY);
  }
  canvas.addEventListener("pointermove", handleMove, { passive: true });
  canvas.addEventListener("pointerdown", handleMove, { passive: true });
  canvas.addEventListener("touchmove", handleMove, { passive: true });

  world.appendChild(canvas);
  world.appendChild(riddle);
  wrap.appendChild(world);
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
