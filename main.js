/** Game Variables **/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const MAP_WIDTH = 25; // 800 / 32
const MAP_HEIGHT = 18; // 600 / 32

let keys = {};
let gameState = 'play'; // 'play' or 'dialogue'
let currentDialogue = null;

/** Player Object **/
let player = {
  x: 0, // will be set in init
  y: 0,
  width: TILE_SIZE,
  height: TILE_SIZE,
  speed: 2,
  direction: 'right', // 'left', 'right', 'up', 'down'
  frame: 0,
  frameDelay: 0,
  frameMax: 10
};

/** Game Data **/
let clients = 0; // Renamed to represent restaurants covered
let score = 0; // For tracking correct choices

/** Map Data **/
let mapData = [];
let buildings = [];
let restaurants = [];

/** Office **/
const office = { x: 12 * TILE_SIZE, y: 9 * TILE_SIZE };

/** Floating Texts for Animations **/
let floatingTexts = [];

/** Initialize the Game **/
function init() {
  generateMap();
  placeRestaurants();
  player.x = office.x;
  player.y = office.y;
  gameLoop();
}

/** Generate Map **/
function generateMap() {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    let row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push('road'); // Initialize all as road
    }
    mapData.push(row);
  }

  // Place buildings randomly
  for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT * 0.1; i++) {
    let x = Math.floor(Math.random() * MAP_WIDTH);
    let y = Math.floor(Math.random() * MAP_HEIGHT);
    // Ensure we don't place a building on the office position
    if (x !== office.x / TILE_SIZE || y !== office.y / TILE_SIZE) {
      mapData[y][x] = 'building';
      buildings.push({ x: x * TILE_SIZE, y: y * TILE_SIZE });
    }
  }
}

/** Place Restaurants **/
function placeRestaurants() {
  for (let i = 0; i < 5; i++) {
    let placed = false;
    while (!placed) {
      let x = Math.floor(Math.random() * MAP_WIDTH);
      let y = Math.floor(Math.random() * MAP_HEIGHT);
      if (mapData[y][x] === 'road') {
        let restaurant = {
          x: x * TILE_SIZE,
          y: y * TILE_SIZE,
          visited: false,
          // Randomly assign criteria values
          hasTriedAdsBefore: Math.random() < 0.5,
          imageCoverage: Math.floor(Math.random() * 81) + 20, // 20% to 100%
          m2o: parseFloat((Math.random() * 6 + 4).toFixed(1)) // 4.0% to 10.0%
        };
        restaurants.push(restaurant);
        placed = true;
      }
    }
  }
}

/** Game Loop **/
function gameLoop() {
  update();
  draw();
  window.requestAnimationFrame(gameLoop);
}

/** Update Function **/
function update() {
  if (gameState === 'play') {
    // Player Movement
    let moved = false;
    if (keys['ArrowLeft'] || keys['a']) {
      if (!checkCollision(player.x - player.speed, player.y)) {
        player.x -= player.speed;
        player.direction = 'left';
        moved = true;
      }
    }
    if (keys['ArrowRight'] || keys['d']) {
      if (!checkCollision(player.x + player.speed, player.y)) {
        player.x += player.speed;
        player.direction = 'right';
        moved = true;
      }
    }
    if (keys['ArrowUp'] || keys['w']) {
      if (!checkCollision(player.x, player.y - player.speed)) {
        player.y -= player.speed;
        player.direction = 'up';
        moved = true;
      }
    }
    if (keys['ArrowDown'] || keys['s']) {
      if (!checkCollision(player.x, player.y + player.speed)) {
        player.y += player.speed;
        player.direction = 'down';
        moved = true;
      }
    }

    // Animate Player
    if (moved) {
      player.frameDelay++;
      if (player.frameDelay >= player.frameMax) {
        player.frameDelay = 0;
        player.frame = (player.frame + 1) % 2; // Two frames for animation
      }
    } else {
      player.frame = 0;
    }

    // Check for Restaurant Interaction
    restaurants.forEach(restaurant => {
      if (!restaurant.visited && isColliding(player, restaurant)) {
        restaurant.visited = true;
        openDialogue(restaurant);
      }
    });
  }

  // Update floating texts
  floatingTexts.forEach((ft, index) => {
    ft.y -= 1; // Move up
    ft.opacity -= 0.02; // Fade out
    if (ft.opacity <= 0) {
      floatingTexts.splice(index, 1);
    }
  });
}

/** Draw Function **/
function draw() {
  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Map
  drawMap();

  // Draw Office
  drawOffice(office.x, office.y);

  // Draw Restaurants
  restaurants.forEach(restaurant => {
    if (!restaurant.visited) {
      drawRestaurant(restaurant.x, restaurant.y);
    }
  });

  // Draw Player
  if (gameState === 'play' || gameState === 'dialogue') {
    drawPlayer();
  }

  // Draw UI
  drawUI();

  // Draw Floating Texts
  floatingTexts.forEach(ft => {
    ctx.globalAlpha = ft.opacity;
    ctx.fillStyle = '#00FF00'; // Green color
    ctx.font = '20px Arial';
    ctx.fillText(ft.text, ft.x - ctx.measureText(ft.text).width / 2, ft.y);
    ctx.globalAlpha = 1.0;
  });

  // Draw Dialogue if in dialogue state
  if (gameState === 'dialogue') {
    drawDialogue();
  }
}

/** Check Collision with Buildings **/
function checkCollision(x, y) {
  let collides = false;
  buildings.forEach(building => {
    if (
      x < building.x + TILE_SIZE &&
      x + TILE_SIZE > building.x &&
      y < building.y + TILE_SIZE &&
      y + TILE_SIZE > building.y
    ) {
      collides = true;
    }
  });
  return collides;
}

/** Collision Detection **/
function isColliding(a, b) {
  return (
    a.x < b.x + TILE_SIZE &&
    a.x + TILE_SIZE > b.x &&
    a.y < b.y + TILE_SIZE &&
    a.y + TILE_SIZE > b.y
  );
}

/** Draw Map **/
function drawMap() {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      let tile = mapData[y][x];
      if (tile === 'road') {
        ctx.fillStyle = '#cccccc';
      } else if (tile === 'building') {
        ctx.fillStyle = '#888888';
      }
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

/** Draw Office **/
function drawOffice(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Base of the building
  ctx.fillStyle = '#555555'; // Dark gray color
  ctx.fillRect(0, 8, TILE_SIZE, TILE_SIZE - 8);

  // Roof
  ctx.fillStyle = '#777777'; // Gray color
  ctx.fillRect(0, 0, TILE_SIZE, 8);

  // Door
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(12, 20, 8, 12);

  // Sign
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  ctx.fillText('Office', -8, -5);

  ctx.restore();
}

/** Draw Player **/
function drawPlayer() {
  // Draw player as pixel art character
  const x = player.x;
  const y = player.y;
  const frame = player.frame;

  // Save the context state
  ctx.save();

  // Translate to player's position
  ctx.translate(x, y);

  // Draw the character based on direction
  if (player.direction === 'left') {
    drawSalesManagerLeft(frame);
  } else if (player.direction === 'right') {
    drawSalesManagerRight(frame);
  } else if (player.direction === 'up') {
    drawSalesManagerUp(frame);
  } else if (player.direction === 'down') {
    drawSalesManagerDown(frame);
  }

  // Restore the context state
  ctx.restore();
}

/** Draw Restaurant **/
function drawRestaurant(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Base of the building
  ctx.fillStyle = '#8B4513'; // Brown color
  ctx.fillRect(0, 8, TILE_SIZE, TILE_SIZE - 8);

  // Roof
  ctx.fillStyle = '#CD853F'; // Peru color
  ctx.fillRect(0, 0, TILE_SIZE, 8);

  // Door
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(12, 20, 8, 12);

  // Sign
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(8, 8, 16, 4);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px Arial';
  ctx.fillText('Restaurant', -8, -5);

  ctx.restore();
}

/** Draw UI **/
function drawUI() {
  // Draw background for UI
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';

  // Removed "Sales" from the UI
  // ctx.fillText('Sales: $' + sales, 10, 25);

  // Updated "Clients" to "Restaurants Covered"
  ctx.fillText('Restaurants Covered: ' + clients, 10, 25);
  ctx.fillText('Score: ' + score, 250, 25);
}

/** Open Dialogue **/
function openDialogue(restaurant) {
  gameState = 'dialogue';
  currentDialogue = restaurant;
  clients += 1; // Increment restaurants covered when visiting
}

/** Draw Dialogue **/
function drawDialogue() {
  // Draw dialogue box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(100, 100, 600, 400);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(110, 110, 580, 380);

  // Dialogue text
  ctx.fillStyle = '#000000';
  ctx.font = '18px Arial';
  ctx.fillText('Restaurant Details:', 130, 150);

  // Display criteria values
  const restaurant = currentDialogue;
  ctx.font = '16px Arial';
  ctx.fillText('Has tried Ads before: ' + (restaurant.hasTriedAdsBefore ? 'Yes' : 'No'), 130, 190);
  ctx.fillText('Image Coverage: ' + restaurant.imageCoverage + '%', 130, 220);
  ctx.fillText('Menu to Order (M2O%): ' + restaurant.m2o + '%', 130, 250);

  // Instructions
  ctx.font = '18px Arial';
  ctx.fillText('Should you sell VP+ to this restaurant?', 130, 290);

  // Sell VP+ Button
  ctx.fillStyle = '#00cc00';
  ctx.fillRect(200, 350, 150, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  let sellText = 'Sell VP+';
  let sellTextWidth = ctx.measureText(sellText).width;
  ctx.fillText(sellText, 200 + 75 - sellTextWidth / 2, 380);

  // Do Not Sell VP+ Button
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(450, 350, 180, 50); // Increased width to prevent overflow
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  let notSellText = 'Do Not Sell VP+';
  let notSellTextWidth = ctx.measureText(notSellText).width;
  ctx.fillText(notSellText, 450 + 90 - notSellTextWidth / 2, 380); // Adjusted position

  // Note: Adjusted font sizes and positions to prevent text overflow
}

/** Dialogue Click Listener **/
canvas.addEventListener('click', function(e) {
  if (gameState === 'dialogue') {
    dialogueClickListener(e);
  }
});

function dialogueClickListener(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Sell VP+ Button
  if (mouseX >= 200 && mouseX <= 350 && mouseY >= 350 && mouseY <= 400) {
    // Player chose to sell VP+
    handlePlayerChoice(true);
    closeDialogue();
  }

  // Do Not Sell VP+ Button
  if (mouseX >= 450 && mouseX <= 630 && mouseY >= 350 && mouseY <= 400) {
    // Player chose not to sell VP+
    handlePlayerChoice(false);
    closeDialogue();
  }
}

function handlePlayerChoice(playerChoseToSell) {
  const restaurant = currentDialogue;
  // Check if the restaurant meets all criteria
  const shouldSellVP = !restaurant.hasTriedAdsBefore &&
    restaurant.imageCoverage > 30 &&
    restaurant.m2o > 6;

  if (playerChoseToSell === shouldSellVP) {
    // Correct choice
    score += 1;
    // Provide feedback with animation
    floatingTexts.push({
      text: '+1',
      x: player.x + TILE_SIZE / 2,
      y: player.y,
      opacity: 1
    });
  } else {
    // Incorrect choice
    // Provide feedback with animation (no score change)
    floatingTexts.push({
      text: '+0',
      x: player.x + TILE_SIZE / 2,
      y: player.y,
      opacity: 1
    });
  }
}

function closeDialogue() {
  gameState = 'play';
  currentDialogue = null;
}

/** Event Listeners **/
window.addEventListener('keydown', function(e) {
  keys[e.key] = true;
});

window.addEventListener('keyup', function(e) {
  keys[e.key] = false;
});

/** Start the Game **/
init();

/** Draw Sales Manager Character **/
function drawSalesManagerRight(frame) {
  // Sales manager facing right
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(12, 4, 8, 8); // Head

  ctx.fillStyle = '#000000'; // Black for eyes
  ctx.fillRect(16, 6, 2, 2); // Eye

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(12, 12, 8, 12); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(12, 24, 4, 8); // Left leg
  ctx.fillRect(16, 24, 4, 8); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(12, 24, 4, 8); // Erase left leg
  } else {
    ctx.clearRect(16, 24, 4, 8); // Erase right leg
  }
}

function drawSalesManagerLeft(frame) {
  // Sales manager facing left
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(12, 4, 8, 8); // Head

  ctx.fillStyle = '#000000'; // Black for eyes
  ctx.fillRect(14, 6, 2, 2); // Eye

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(12, 12, 8, 12); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(12, 24, 4, 8); // Left leg
  ctx.fillRect(16, 24, 4, 8); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(12, 24, 4, 8); // Erase left leg
  } else {
    ctx.clearRect(16, 24, 4, 8); // Erase right leg
  }
}

function drawSalesManagerUp(frame) {
  // Sales manager facing up
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(12, 4, 8, 8); // Head

  ctx.fillStyle = '#000000'; // Black for hair
  ctx.fillRect(12, 4, 8, 4); // Hair

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(12, 12, 8, 12); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(12, 24, 4, 8); // Left leg
  ctx.fillRect(16, 24, 4, 8); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(12, 24, 4, 8); // Erase left leg
  } else {
    ctx.clearRect(16, 24, 4, 8); // Erase right leg
  }
}

function drawSalesManagerDown(frame) {
  // Sales manager facing down
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(12, 4, 8, 8); // Head

  ctx.fillStyle = '#000000'; // Black for eyes
  ctx.fillRect(14, 6, 2, 2); // Left eye
  ctx.fillRect(16, 6, 2, 2); // Right eye

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(12, 12, 8, 12); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(12, 24, 4, 8); // Left leg
  ctx.fillRect(16, 24, 4, 8); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(12, 24, 4, 8); // Erase left leg
  } else {
    ctx.clearRect(16, 24, 4, 8); // Erase right leg
  }
}
