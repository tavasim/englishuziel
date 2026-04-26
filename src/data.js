/**
 * Each location has items with a display word (for spelling) and a friendly label.
 * icon: emoji used as simple "animation" scene elements (no image assets required).
 */
export const locations = {
  zoo: {
    id: "zoo",
    title: "Zoo",
    subtitle: "Meet the animals!",
    theme: "zoo",
    decor: ["🌳", "🦩", "🌿", "☀️"],
    items: [
      { word: "LION", icon: "🦁" },
      { word: "ELEPHANT", icon: "🐘" },
      { word: "GIRAFFE", icon: "🦒" },
      { word: "MONKEY", icon: "🐵" },
      { word: "PENGUIN", icon: "🐧" },
      { word: "ZEBRA", icon: "🦓" },
    ],
  },
  classroom: {
    id: "classroom",
    title: "Classroom",
    subtitle: "Things in our class",
    theme: "classroom",
    decor: ["📚", "✏️", "🧮", "🍎"],
    items: [
      { word: "CHAIR", icon: "🪑" },
      { word: "TABLE", icon: "🍽️" },
      { word: "BOARD", icon: "🖼️" },
      { word: "PENCIL", icon: "✏️" },
      { word: "BOOK", icon: "📖" },
      { word: "CLOCK", icon: "🕐" },
    ],
  },
  playground: {
    id: "playground",
    title: "Playground",
    subtitle: "Fun outside!",
    theme: "playground",
    decor: ["🌤️", "🪁", "🧢", "🌈"],
    items: [
      { word: "SWING", icon: "🎡" },
      { word: "SLIDE", icon: "🛝" },
      { word: "SANDBOX", icon: "🏖️" },
      { word: "SEESAW", icon: "⚖️" },
      { word: "BALL", icon: "⚽" },
      { word: "TREE", icon: "🌳" },
    ],
  },
};

export const locationList = Object.values(locations);
