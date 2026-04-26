export const COLORS = {
  red: '#ef4444',
  yellow: '#facc15',
  green: '#22c55e',
  blue: '#38bdf8',
  purple: '#a855f7',
  orange: '#fb923c'
};

export const INGREDIENTS = [
  { id: 'apple', emoji: '🍎', color: 'red' },
  { id: 'banana', emoji: '🍌', color: 'yellow' },
  { id: 'carrot', emoji: '🥕', color: 'orange' },
  { id: 'cheese', emoji: '🧀', color: 'yellow' },
  { id: 'tomato', emoji: '🍅', color: 'red' },
  { id: 'grape', emoji: '🍇', color: 'purple' },
  { id: 'bread', emoji: '🍞', color: 'orange' },
  { id: 'milk', emoji: '🥛', color: 'blue' },
  { id: 'egg', emoji: '🥚', color: 'yellow' },
  { id: 'lettuce', emoji: '🥬', color: 'green' },
  { id: 'blueberry', emoji: '🫐', color: 'blue' },
  { id: 'orange', emoji: '🍊', color: 'orange' }
];

export const RECIPES = [
  {
    id: 'soup',
    word: 'SOPA',
    ingredients: ['tomato', 'carrot', 'lettuce'],
    countIngredient: 'tomato',
    count: 3,
    color: 'red',
    colorCount: 3
  },
  {
    id: 'bread',
    word: 'PAN',
    ingredients: ['bread', 'milk', 'egg'],
    countIngredient: 'bread',
    count: 2,
    color: 'yellow',
    colorCount: 3
  },
  {
    id: 'salad',
    word: 'MESA',
    ingredients: ['lettuce', 'tomato', 'carrot', 'cheese'],
    countIngredient: 'lettuce',
    count: 4,
    color: 'green',
    colorCount: 2
  },
  {
    id: 'cake',
    word: 'TARTA',
    ingredients: ['egg', 'milk', 'banana', 'grape'],
    countIngredient: 'egg',
    count: 5,
    color: 'purple',
    colorCount: 2
  },
  {
    id: 'juice',
    word: 'ZUMO',
    ingredients: ['orange', 'apple', 'blueberry'],
    countIngredient: 'orange',
    count: 3,
    color: 'blue',
    colorCount: 2
  },
  {
    id: 'sandwich',
    word: 'CASA',
    ingredients: ['bread', 'cheese', 'lettuce', 'tomato'],
    countIngredient: 'cheese',
    count: 4,
    color: 'orange',
    colorCount: 4
  }
];
