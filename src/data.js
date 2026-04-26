/**
 * word: target spelling. icon: emoji. who: reserved for item type (e.g. person vs object)
 * size: icon scale (1 = default)
 * Item order = left-to-right in two rows (top row first, then bottom). Positions are computed in main.js.
 * Optional on a location: rowYTop, rowYBottom (percent) to tune the two rows.
 */
export const locations = {
  zoo: {
    id: "zoo",
    title: "Zoo",
    subtitle: "Examine the animals in the setting.",
    theme: "zoo",
    decor: ["🌳", "🦩", "🌿", "☀️"],
    items: [
      {
        word: "LION",
        who: true,
        size: 1.1,
        iconSrc: "/images/lion.png",
        icon: "🦁",
      },
      {
        word: "ELEPHANT",
        who: true,
        size: 1.2,
        iconSrc: "/images/elephant.png",
        icon: "🐘",
      },
      {
        word: "GIRAFFE",
        who: true,
        size: 1.35,
        iconSrc: "/images/giraffe.png",
        icon: "🦒",
      },
      {
        word: "PANDA",
        who: true,
        size: 1.05,
        iconSrc: "/images/panda.png",
        icon: "🐼",
      },
      {
        word: "MONKEY",
        who: true,
        size: 1.05,
        iconSrc: "/images/monkey.png",
        icon: "🐵",
      },
      {
        word: "PENGUIN",
        who: true,
        size: 1.0,
        iconSrc: "/images/penguin.png",
        icon: "🐧",
      },
      {
        word: "ZEBRA",
        who: true,
        size: 1.15,
        iconSrc: "/images/zebra.png",
        icon: "🦓",
      },
      {
        word: "FLAMINGO",
        who: true,
        size: 1.0,
        iconSrc: "/images/flamingo.png",
        icon: "🦩",
      },
    ],
  },
  classroom: {
    id: "classroom",
    title: "Classroom",
    subtitle: "Identify the objects in the room.",
    theme: "classroom",
    decor: ["📚", "✏️", "🧮", "🍎"],
    items: [
      {
        word: "BOARD",
        who: false,
        size: 1.4,
        iconSrc: "/images/classroom-board.png",
        icon: "🖼️",
      },
      { word: "CLOCK", icon: "🕐", who: false, size: 0.95 },
      { word: "CHAIR", icon: "🪑", who: false, size: 1.1 },
      {
        word: "TABLE",
        who: false,
        size: 1.25,
        iconSrc: "/images/classroom-table.png",
        icon: "🍽️",
      },
      { word: "PENCIL", icon: "✏️", who: false, size: 0.9 },
      {
        word: "RULER",
        who: false,
        size: 1.0,
        iconSrc: "/images/classroom-ruler.png",
        icon: "📏",
      },
      { word: "BOOK", icon: "📖", who: false, size: 1.0 },
      {
        word: "TEACHER",
        who: true,
        size: 1.1,
        iconSrc: "/images/classroom-teacher.png",
        icon: "🧑‍🏫",
      },
    ],
  },
  playground: {
    id: "playground",
    title: "Playground",
    subtitle: "Review the items in the play area.",
    theme: "playground",
    decor: ["🌤️", "🪁", "🧢", "🌈"],
    items: [
      { word: "TREE", icon: "🌳", who: false, size: 1.3 },
      {
        word: "SWING",
        who: false,
        size: 1.15,
        iconSrc: "/images/playground-swing.png",
        icon: "🎡",
      },
      { word: "SLIDE", icon: "🛝", who: false, size: 1.2 },
      {
        word: "SEESAW",
        who: false,
        size: 1.0,
        iconSrc: "/images/playground-seesaw.png",
        icon: "⚖️",
      },
      {
        word: "SANDBOX",
        who: false,
        size: 1.1,
        iconSrc: "/images/playground-sandbox.png",
        icon: "🏖️",
      },
      {
        word: "BUCKET",
        who: false,
        size: 1.0,
        iconSrc: "/images/playground-bucket.png",
        icon: "🪣",
      },
      { word: "BALL", icon: "⚽", who: false, size: 0.95 },
      {
        word: "TRAMPOLINE",
        who: false,
        size: 1.0,
        iconSrc: "/images/playground-trampoline.png",
        icon: "🤸",
      },
    ],
  },
};

export const locationList = Object.values(locations);
