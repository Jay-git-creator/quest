/** Game Variables **/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Adjust canvas size to fit mobile screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const TILE_SIZE = 64; // Increased tile size for better visibility on mobile

let keys = {};
let gameState = 'play'; // 'play' or 'dialogue'
let currentDialogue = null;

/** Player Object **/
let player = {
  x: 0, // will be set in init
  y: 0,
  width: TILE_SIZE,
  height: TILE_SIZE,
  speed: 4,
  direction: 'right', // 'left', 'right', 'up', 'down'
  frame: 0,
  frameDelay: 0,
  frameMax: 10
};

/** Game Data **/
let clients = 0; // Represents restaurants covered
let score = 0; // For tracking correct choices

/** Map Data **/
let mapData = [];
let buildings = [];
let restaurants = [];

/** Office **/
const office = { x: 6 * TILE_SIZE, y: 5 * TILE_SIZE };

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
const MAP_WIDTH = Math.ceil(canvas.width / TILE_SIZE);
const MAP_HEIGHT = Math.ceil(canvas.height / TILE_SIZE);

function generateMap() {
  mapData = [];
  buildings = [];
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
  restaurants = [];
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
    if (keys['left']) {
      if (!checkCollision(player.x - player.speed, player.y)) {
        player.x -= player.speed;
        player.direction = 'left';
        moved = true;
      }
    }
    if (keys['right']) {
      if (!checkCollision(player.x + player.speed, player.y)) {
        player.x += player.speed;
        player.direction = 'right';
        moved = true;
      }
    }
    if (keys['up']) {
      if (!checkCollision(player.x, player.y - player.speed)) {
        player.y -= player.speed;
        player.direction = 'up';
        moved = true;
      }
    }
    if (keys['down']) {
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
    ctx.font = '24px Arial';
    ctx.fillText(ft.text, ft.x - ctx.measureText(ft.text).width / 2, ft.y);
    ctx.globalAlpha = 1.0;
  });
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
  ctx.fillRect(0, 16, TILE_SIZE, TILE_SIZE - 16);

  // Roof
  ctx.fillStyle = '#777777'; // Gray color
  ctx.fillRect(0, 0, TILE_SIZE, 16);

  // Door
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(TILE_SIZE / 2 - 8, TILE_SIZE - 24, 16, 24);

  // Sign
  ctx.fillStyle = '#000000';
  ctx.font = '14px Arial';
  ctx.fillText('Office', -10, -5);

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
  ctx.fillRect(0, 16, TILE_SIZE, TILE_SIZE - 16);

  // Roof
  ctx.fillStyle = '#CD853F'; // Peru color
  ctx.fillRect(0, 0, TILE_SIZE, 16);

  // Door
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(TILE_SIZE / 2 - 8, TILE_SIZE - 24, 16, 24);

  // Sign
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(TILE_SIZE / 2 - 16, 16, 32, 8);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px Arial';
  ctx.fillText('Restaurant', -20, -5);

  ctx.restore();
}

/** Draw UI **/
function drawUI() {
  // Draw background for UI
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';

  // Updated "Clients" to "Restaurants Covered"
  ctx.fillText('Restaurants Covered: ' + clients, 10, 35);
  ctx.fillText('Score: ' + score, canvas.width - 150, 35);
}

/** Open Dialogue **/
function openDialogue(restaurant) {
  gameState = 'dialogue';
  currentDialogue = restaurant;
  clients += 1; // Increment restaurants covered when visiting
  showDialogue();
}

/** Show Dialogue **/
function showDialogue() {
  const dialogueContainer = document.getElementById('dialogue-container');
  const dialogueBox = document.getElementById('dialogue-box');
  dialogueBox.innerHTML = ''; // Clear previous content

  // Dialogue content
  const restaurant = currentDialogue;

  let content = `
    <h2>Restaurant Details:</h2>
    <p>Has tried Ads before: ${restaurant.hasTriedAdsBefore ? 'Yes' : 'No'}</p>
    <p>Image Coverage: ${restaurant.imageCoverage}%</p>
    <p>Menu to Order (M2O%): ${restaurant.m2o}%</p>
    <h3>Should you sell VP+ to this restaurant?</h3>
  `;

  dialogueBox.innerHTML = content;

  // Sell VP+ Button
  const sellButton = document.createElement('button');
  sellButton.classList.add('dialogue-button', 'sell-button');
  sellButton.textContent = 'Sell VP+';
  sellButton.addEventListener('click', () => {
    handlePlayerChoice(true);
    closeDialogue();
  });

  // Do Not Sell VP+ Button
  const dontSellButton = document.createElement('button');
  dontSellButton.classList.add('dialogue-button', 'dont-sell-button');
  dontSellButton.textContent = 'Do Not Sell VP+';
  dontSellButton.addEventListener('click', () => {
    handlePlayerChoice(false);
    closeDialogue();
  });

  dialogueBox.appendChild(sellButton);
  dialogueBox.appendChild(dontSellButton);

  dialogueContainer.style.display = 'flex';
}

/** Close Dialogue **/
function closeDialogue() {
  gameState = 'play';
  currentDialogue = null;
  const dialogueContainer = document.getElementById('dialogue-container');
  dialogueContainer.style.display = 'none';
}

/** Handle Player Choice **/
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

/** Event Listeners **/

// On-screen control buttons
const leftButton = document.getElementById('left-button');
const rightButton = document.getElementById('right-button');
const upButton = document.getElementById('up-button');
const downButton = document.getElementById('down-button');

function handleButtonPress(direction) {
  keys[direction] = true;
}

function handleButtonRelease(direction) {
  keys[direction] = false;
}

// Add touch event listeners to control buttons
leftButton.addEventListener('touchstart', () => handleButtonPress('left'));
leftButton.addEventListener('touchend', () => handleButtonRelease('left'));
rightButton.addEventListener('touchstart', () => handleButtonPress('right'));
rightButton.addEventListener('touchend', () => handleButtonRelease('right'));
upButton.addEventListener('touchstart', () => handleButtonPress('up'));
upButton.addEventListener('touchend', () => handleButtonRelease('up'));
downButton.addEventListener('touchstart', () => handleButtonPress('down'));
downButton.addEventListener('touchend', () => handleButtonRelease('down'));

// Prevent default scrolling on touch devices
document.body.addEventListener('touchmove', function(event) {
  event.preventDefault();
}, { passive: false });

// Start the Game
init();

/** Draw Sales Manager Character **/
function drawSalesManagerRight(frame) {
  // Sales manager facing right
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 2, TILE_SIZE / 2); // Head

  ctx.fillStyle = '#000000'; // Black for eyes
  ctx.fillRect(TILE_SIZE / 2 + TILE_SIZE / 8, TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 8); // Eye

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Left leg
  ctx.fillRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase left leg
  } else {
    ctx.clearRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase right leg
  }
}

function drawSalesManagerLeft(frame) {
  // Sales manager facing left
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 2, TILE_SIZE / 2); // Head

  ctx.fillStyle = '#000000'; // Black for eyes
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 8); // Eye

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Left leg
  ctx.fillRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase left leg
  } else {
    ctx.clearRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase right leg
  }
}

function drawSalesManagerUp(frame) {
  // Sales manager facing up
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 2, TILE_SIZE / 2); // Head

  ctx.fillStyle = '#000000'; // Black for hair
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 2, TILE_SIZE / 4); // Hair

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Left leg
  ctx.fillRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase left leg
  } else {
    ctx.clearRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase right leg
  }
}

function drawSalesManagerDown(frame) {
  // Sales manager facing down
  ctx.fillStyle = '#FFD700'; // Yellow for head
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 2, TILE_SIZE / 2); // Head

  ctx.fillStyle = '#000000'; // Black for eyes
  ctx.fillRect(TILE_SIZE / 4 + TILE_SIZE / 8, TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 8); // Left eye
  ctx.fillRect(TILE_SIZE / 2 + TILE_SIZE / 16, TILE_SIZE / 4, TILE_SIZE / 8, TILE_SIZE / 8); // Right eye

  ctx.fillStyle = '#FF4500'; // Orange for body
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2); // Body

  ctx.fillStyle = '#0000FF'; // Blue for legs
  ctx.fillRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Left leg
  ctx.fillRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Right leg

  // Simple walking animation
  if (frame === 1) {
    ctx.clearRect(TILE_SIZE / 4, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase left leg
  } else {
    ctx.clearRect(TILE_SIZE / 2, TILE_SIZE - TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 4); // Erase right leg
  }
}

