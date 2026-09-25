const fs = require('fs');

const now = Date.now();
const generateId = () => Math.random().toString(36).substring(2, 9);

function createTextObject(text, x, y, size, color, align, width) {
  return {
    id: generateId(),
    type: 'text',
    x, y,
    width,
    height: size * 1.5,
    rotation: 0,
    zIndex: 10,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    text,
    fontSize: size,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 'normal',
    textAlign: align,
    color,
    backgroundColor: 'transparent'
  };
}

function createCircle(x, y, radius, color) {
  return {
    id: generateId(),
    type: 'circle',
    x: x - radius,
    y: y - radius,
    width: radius * 2,
    height: radius * 2,
    rotation: 0,
    zIndex: 5,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    centerX: x,
    centerY: y,
    radius: radius,
    strokeColor: color,
    strokeWidth: 4,
    opacity: 1
  };
}

function createSnakeStroke(startX, startY) {
  // A wiggly line for a snake
  const points = [];
  let y = startY;
  for(let i = 0; i < 200; i++) {
    const x = startX + i * 2;
    y = startY + Math.sin(i * 0.1) * 30;
    points.push({ x, y, pressure: 0.8 });
  }
  
  return {
    id: generateId(),
    type: 'stroke',
    tool: 'pen',
    penId: 'marker',
    x: startX,
    y: startY - 30,
    width: 400,
    height: 60,
    rotation: 0,
    zIndex: 8,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    points,
    color: '#16a34a',
    width: 12,
    opacity: 1,
    smooth: true,
    penSettings: {}
  };
}

const objects = [
  createTextObject("Jolly Phonics: The 's' Sound", 100, 100, 48, '#1e40af', 'left', 600),
  createTextObject("S s", 150, 200, 120, '#b91c1c', 'left', 300),
  createTextObject("Action:\nWeave your hand in an s shape,\nlike a snake, and say ssssss.", 100, 400, 32, '#1e293b', 'left', 500),
  createTextObject("Song:\nThe snake is in the grass,\nThe snake is in the grass,\n/s/! /s/!\nThe snake is in the grass.", 600, 400, 32, '#1e293b', 'left', 400),
  
  // A simple snake drawing
  createSnakeStroke(500, 250),
  // Sun drawing
  createCircle(850, 150, 40, '#eab308'),
  createTextObject("snake", 500, 300, 24, '#16a34a', 'left', 100),
  createTextObject("sun", 850, 200, 24, '#eab308', 'center', 100)
];

const doc = {
  format: "jaihind-whiteboard-package",
  packageVersion: 1,
  document: {
    version: 1,
    id: "jolly-phonics-s",
    title: "Jolly Phonics - S",
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        background: "#ffffff",
        backgroundType: "plain",
        objects: objects,
        createdAt: now,
        updatedAt: now
      }
    ],
    activePageIndex: 0,
    createdAt: now,
    updatedAt: now
  },
  assets: []
};

fs.writeFileSync('lessons/Jolly_Phonics_S.jhw', JSON.stringify(doc, null, 2));
console.log('Saved lessons/Jolly_Phonics_S.jhw');
