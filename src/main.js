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

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function clear() {
  app.replaceChildren();
}

function renderHome() {
  clear();
  const wrap = el("div", "screen screen--home");
  const header = el("div", "home-header");
  header.appendChild(el("h1", "title", "English Places"));
  header.appendChild(
    el("p", "tagline", "Pick a place, explore, and spell the words!")
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

  const layer = el("div", "scene-layer");
  for (let i = 0; i < 8; i++) {
    const bub = el("div", "scene-bubble");
    bub.style.left = `${8 + (i * 11) % 80}%`;
    bub.style.animationDelay = `${i * 0.4}s`;
    bub.textContent = loc.decor[i % loc.decor.length];
    layer.appendChild(bub);
  }
  wrap.appendChild(layer);

  const strip = el("div", "item-strip");
  loc.items.forEach((item, index) => {
    const b = el("button", "item-tile", item.icon);
    b.type = "button";
    b.title = "Learn this word";
    b.addEventListener("click", () => renderSpell(loc, item, index));
    strip.appendChild(b);
  });
  wrap.appendChild(strip);
  app.appendChild(wrap);
}

function renderSpell(loc, item, itemIndex) {
  clear();
  const wrap = el("div", `screen screen--spell screen--${loc.theme}`);

  const top = el("div", "top-bar");
  const back = el("button", "btn btn--ghost", "← Back");
  back.type = "button";
  back.addEventListener("click", () => renderScene(loc.id));
  top.appendChild(back);
  top.appendChild(el("h2", "scene-title", loc.title));
  wrap.appendChild(top);

  const center = el("div", "spell-center");
  const show = el("div", "spell-show");
  const big = el("div", "spell-icon pop-in", item.icon);
  show.appendChild(big);
  const label = el("p", "spell-hint", "Can you spell this word?");
  show.appendChild(label);

  const wordRow = el("div", "word-length");
  for (const _ of item.word) {
    wordRow.appendChild(el("span", "word-slot", ""));
  }
  show.appendChild(wordRow);

  const form = el("form", "spell-form");
  const input = el("input", "spell-input");
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("maxlength", String(item.word.length));
  input.setAttribute("aria-label", "Type the word");
  input.placeholder = "Type here…";

  const actions = el("div", "spell-actions");
  const check = el("button", "btn btn--primary", "Check");
  check.type = "submit";
  const listen = el("button", "btn btn--soft", "Listen");
  listen.type = "button";
  listen.addEventListener("click", () => speak(item.word));

  actions.appendChild(listen);
  actions.appendChild(check);
  form.appendChild(input);
  form.appendChild(actions);

  const msg = el("p", "spell-message", "");

  const nextItem = loc.items[itemIndex + 1];

  function updateSlots(typed) {
    const slots = wordRow.querySelectorAll(".word-slot");
    for (let i = 0; i < slots.length; i++) {
      slots[i].textContent = typed[i] || "";
    }
  }

  input.addEventListener("input", () => {
    const v = input.value.toUpperCase().replace(/[^A-Z]/g, "");
    input.value = v.slice(0, item.word.length);
    updateSlots(input.value);
    msg.textContent = "";
    msg.className = "spell-message";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const guess = input.value.toUpperCase().trim();
    if (guess.length !== item.word.length) {
      msg.textContent = `Use ${item.word.length} letters.`;
      msg.className = "spell-message spell-message--info";
      return;
    }
    if (guess === item.word) {
      msg.textContent = "Great job! You spelled it correctly!";
      msg.className = "spell-message spell-message--ok";
      big.classList.add("celebrate");
      speak("Great! " + item.word);
      if (nextItem) {
        const nbtn = el("button", "btn btn--primary spell-next", "Next word");
        nbtn.type = "button";
        nbtn.addEventListener("click", () => {
          big.classList.remove("celebrate");
          renderSpell(loc, nextItem, itemIndex + 1);
        });
        if (!form.querySelector(".spell-next")) {
          form.appendChild(nbtn);
        }
      } else {
        const dbtn = el("button", "btn btn--primary spell-next", "Another place");
        dbtn.type = "button";
        dbtn.addEventListener("click", () => {
          big.classList.remove("celebrate");
          renderHome();
        });
        if (!form.querySelector(".spell-next")) {
          form.appendChild(dbtn);
        }
      }
    } else {
      msg.textContent = "Not quite—try again or press Listen.";
      msg.className = "spell-message spell-message--err";
    }
  });

  center.appendChild(show);
  center.appendChild(form);
  center.appendChild(msg);
  wrap.appendChild(center);
  app.appendChild(wrap);
  input.focus();
  setTimeout(() => speak(item.word), 300);
}

renderHome();
