export const LOCALES = {
  es: {
    appTitle: 'Little Chef Academy',
    appSubtitle: 'Aprende palabras, números y colores preparando recetas felices.',
    languageLabel: 'Idioma',
    spanish: 'Español',
    english: 'Inglés',
    startGame: 'Jugar',
    chooseMode: 'Elige una misión',
    wordMode: 'Palabras',
    wordModeDescription: 'Recoge letras en orden para formar la receta.',
    countMode: 'Números',
    countModeDescription: 'Busca la cantidad correcta de ingredientes.',
    colorMode: 'Colores',
    colorModeDescription: 'Encuentra ingredientes del color pedido.',
    recipeBook: 'Recetario',
    round: 'Receta',
    score: 'Estrellas',
    target: 'Objetivo',
    next: 'Siguiente',
    playAgain: 'Jugar otra vez',
    backToMenu: 'Menú',
    soundOn: 'Sonido: sí',
    soundOff: 'Sonido: no',
    speak: 'Escuchar',
    pause: 'Pausa',
    resume: 'Seguir',
    howToMove: 'Muévete con WASD, flechas o los botones táctiles.',
    collectHint: 'Toca el ingrediente correcto para añadirlo a la olla.',
    completedTitle: '¡Receta lista!',
    completedMessage: 'Has preparado {recipe}.',
    finalTitle: '¡Gran chef!',
    finalMessage: 'Completaste todas las recetas de esta misión.',
    correctMessages: [
      '¡Perfecto!',
      '¡Muy bien!',
      '¡Eso es!',
      '¡Qué buena elección!'
    ],
    wrongMessages: [
      'Casi. Busca {target}.',
      'Buen intento. Ahora toca {target}.',
      'Prueba otra vez con {target}.'
    ],
    wordInstruction: 'Forma la palabra {word}. Busca: {target}',
    countInstruction: 'Añade {count} {ingredient}. Llevas {current}.',
    colorInstruction: 'Busca ingredientes de color {color}. Llevas {current}/{count}.',
    colorNames: {
      red: 'rojo',
      yellow: 'amarillo',
      green: 'verde',
      blue: 'azul',
      purple: 'morado',
      orange: 'naranja'
    },
    itemNames: {
      apple: 'manzana',
      banana: 'banana',
      carrot: 'zanahoria',
      cheese: 'queso',
      tomato: 'tomate',
      grape: 'uva',
      bread: 'pan',
      milk: 'leche',
      egg: 'huevo',
      lettuce: 'lechuga',
      blueberry: 'arándano',
      orange: 'naranja'
    },
    recipeNames: {
      soup: 'sopa feliz',
      bread: 'pan blandito',
      salad: 'ensalada arcoíris',
      cake: 'tarta dulce',
      juice: 'zumo mágico',
      sandwich: 'bocadillo sonriente'
    }
  },
  en: {
    appTitle: 'Little Chef Academy',
    appSubtitle: 'Learn words, numbers, and colors by cooking happy recipes.',
    languageLabel: 'Language',
    spanish: 'Spanish',
    english: 'English',
    startGame: 'Play',
    chooseMode: 'Choose a mission',
    wordMode: 'Words',
    wordModeDescription: 'Collect letters in order to build the recipe.',
    countMode: 'Numbers',
    countModeDescription: 'Find the right amount of each ingredient.',
    colorMode: 'Colors',
    colorModeDescription: 'Pick ingredients with the requested color.',
    recipeBook: 'Recipe Book',
    round: 'Recipe',
    score: 'Stars',
    target: 'Goal',
    next: 'Next',
    playAgain: 'Play again',
    backToMenu: 'Menu',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    speak: 'Listen',
    pause: 'Pause',
    resume: 'Resume',
    howToMove: 'Move with WASD, arrow keys, or touch buttons.',
    collectHint: 'Touch the correct ingredient to add it to the pot.',
    completedTitle: 'Recipe ready!',
    completedMessage: 'You cooked {recipe}.',
    finalTitle: 'Great chef!',
    finalMessage: 'You completed every recipe in this mission.',
    correctMessages: [
      'Perfect!',
      'Great job!',
      'That is it!',
      'Wonderful choice!'
    ],
    wrongMessages: [
      'Almost. Find {target}.',
      'Good try. Now pick {target}.',
      'Try again with {target}.'
    ],
    wordInstruction: 'Build the word {word}. Find: {target}',
    countInstruction: 'Add {count} {ingredient}. You have {current}.',
    colorInstruction: 'Find {color} ingredients. You have {current}/{count}.',
    colorNames: {
      red: 'red',
      yellow: 'yellow',
      green: 'green',
      blue: 'blue',
      purple: 'purple',
      orange: 'orange'
    },
    itemNames: {
      apple: 'apple',
      banana: 'banana',
      carrot: 'carrot',
      cheese: 'cheese',
      tomato: 'tomato',
      grape: 'grape',
      bread: 'bread',
      milk: 'milk',
      egg: 'egg',
      lettuce: 'lettuce',
      blueberry: 'blueberry',
      orange: 'orange'
    },
    recipeNames: {
      soup: 'happy soup',
      bread: 'soft bread',
      salad: 'rainbow salad',
      cake: 'sweet cake',
      juice: 'magic juice',
      sandwich: 'smiling sandwich'
    }
  }
};

export function translate(locale, key, replacements = {}) {
  const dictionary = LOCALES[locale] || LOCALES.es;
  const value = key.split('.').reduce((source, part) => source?.[part], dictionary) ?? key;

  if (typeof value !== 'string') return value;

  return value.replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? '');
}
