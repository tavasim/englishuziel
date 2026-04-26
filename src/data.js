/**
 * word: target spelling. icon: emoji. who: true -> "Who am I?", false -> "What am I?"
 * x, y: position in the scene (percent, top-left anchor center with translate -50% -50%)
 * size: emoji size scale (1 = default)
 */
export const locations = {
  zoo: {
    id: "zoo",
    title: "Zoo",
    subtitle: "Move close to the animals!",
    theme: "zoo",
    decor: ["🌳", "🦩", "🌿", "☀️"],
    items: [
      { word: "LION", icon: "🦁", who: true, x: 12, y: 72, size: 1.1 },
      { word: "ELEPHANT", icon: "🐘", who: true, x: 30, y: 68, size: 1.2 },
      { word: "GIRAFFE", icon: "🦒", who: true, x: 48, y: 50, size: 1.35 },
      { word: "MONKEY", icon: "🐵", who: true, x: 62, y: 32, size: 1.05 },
      { word: "PENGUIN", icon: "🐧", who: true, x: 78, y: 76, size: 1.0 },
      { word: "ZEBRA", icon: "🦓", who: true, x: 90, y: 65, size: 1.15 },
    ],
  },
  classroom: {
    id: "classroom",
    title: "Classroom",
    subtitle: "Move near things in the room!",
    theme: "classroom",
    decor: ["📚", "✏️", "🧮", "🍎"],
    items: [
      { word: "BOARD", icon: "🖼️", who: false, x: 50, y: 20, size: 1.4 },
      { word: "CLOCK", icon: "🕐", who: false, x: 82, y: 16, size: 0.95 },
      { word: "CHAIR", icon: "🪑", who: false, x: 28, y: 70, size: 1.1 },
      { word: "TABLE", icon: "🍽️", who: false, x: 52, y: 75, size: 1.25 },
      { word: "PENCIL", icon: "✏️", who: false, x: 18, y: 64, size: 0.9 },
      { word: "BOOK", icon: "📖", who: false, x: 72, y: 72, size: 1.0 },
    ],
  },
  playground: {
    id: "playground",
    title: "Playground",
    subtitle: "Explore the play area!",
    theme: "playground",
    decor: ["🌤️", "🪁", "🧢", "🌈"],
    items: [
      { word: "TREE", icon: "🌳", who: false, x: 10, y: 40, size: 1.3 },
      { word: "SWING", icon: "🎡", who: false, x: 28, y: 50, size: 1.15 },
      { word: "SLIDE", icon: "🛝", who: false, x: 48, y: 55, size: 1.2 },
      { word: "SEESAW", icon: "⚖️", who: false, x: 70, y: 72, size: 1.0 },
      { word: "SANDBOX", icon: "🏖️", who: false, x: 88, y: 68, size: 1.1 },
      { word: "BALL", icon: "⚽", who: false, x: 40, y: 82, size: 0.95 },
    ],
  },
};

export const locationList = Object.values(locations);
