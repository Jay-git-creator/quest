/** Game Variables **/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const MAP_WIDTH = 25; // 800 / 32
const MAP_HEIGHT = 18; // 600 / 32

let keys = {};
let gameState = 'play'; // 'play' or 'dialogue'
let currentDialogue = null;
let showReadme = true; // New variable to control readme visibility

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
let gameCompleted = false; // New variable to track game completion

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
  for (let i = 0; i < 10; i++) { // Changed from 5 to 10
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
          m2o: parseFloat((Math.random() * 6 + 4).toFixed(1)), // 4.0% to 10.0%
          rating: parseFloat((Math.random() * 3 + 2).toFixed(1)), // 2.0 to 5.0
          visibility: Math.floor(Math.random() * 101) // 0% to 100%
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
  if (!showReadme && !gameCompleted) {
    // Only update game state if readme is not showing and game is not completed
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

      // Check if all restaurants have been visited
      if (clients === restaurants.length) {
        gameCompleted = true;
        showFinalScore();
      }
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
}

/** Draw Function **/
function draw() {
  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw game elements only if readme is not showing and game is not completed
  if (!showReadme && !gameCompleted) {
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

  // Draw readme popup if it's showing
  if (showReadme) {
    drawReadme();
  }

  // Draw final score popup if game is completed
  if (gameCompleted) {
    drawFinalScore();
  }
}

/** Draw Readme Popup **/
function drawReadme() {
  // Draw semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw readme box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(100, 50, 600, 500);

  // Draw title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Welcome to the VP+ Sales Game!', 250, 100);

  // Draw instructions
  ctx.font = '16px Arial';
  const instructions = [
    "You are a Key Account Manager for your portfolio Restaurants",
    "Your goal is to visit restaurants and decide which product to sell basis eligibility criteria",
    "",
    "Game Controls:",
    "- Use arrow keys or WASD to move",
    "- Visit restaurants (brown buildings) to interact",
    "",
    "Selling Rules:",
    "  1. Read the criteria of the restaurant",
    "  2. Select all the products for which the restaurant is eligible",
    "  3. If your selection is correct, you will get a score",
    "  4. Basis your score you will see your rank on the leaderboard",
    "",
    "Good luck!"
  ];

  const maxWidth = 550; // Maximum width for text wrapping
  let y = 140; // Starting y position for text

  instructions.forEach((line) => {
    if (line === "") {
      y += 20; // Add extra space for empty lines
    } else {
      let words = line.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        let testLine = currentLine + word + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine !== '') {
          ctx.fillText(currentLine, 120, y);
          currentLine = word + ' ';
          y += 25;
        } else {
          currentLine = testLine;
        }
      });

      ctx.fillText(currentLine, 120, y);
      y += 25;
    }
  });

  // Draw start button
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(350, 480, 100, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Start', 380, 508);
}

/** Readme Click Listener **/
canvas.addEventListener('click', function(e) {
  if (showReadme) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if click is on the start button
    if (mouseX >= 350 && mouseX <= 450 && mouseY >= 480 && mouseY <= 520) {
      showReadme = false; // Hide readme and start the game
    }
  }
});

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
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Restaurant Details:', 130, 150);
  ctx.font = '16px Arial';

  // Display criteria values
  const restaurant = currentDialogue;
  ctx.font = '16px Arial';
  ctx.fillText('Has tried Ads before: ' + (restaurant.hasTriedAdsBefore ? 'Yes' : 'No'), 130, 180);
  ctx.fillText('Image Coverage: ' + restaurant.imageCoverage + '%', 130, 210);
  ctx.fillText('Menu to Order (M2O%): ' + restaurant.m2o + '%', 130, 240);
  ctx.fillText('Rating: ' + restaurant.rating, 130, 270);
  ctx.fillText('Visibility: ' + restaurant.visibility + '%', 130, 300);

  // Instructions
  ctx.font = '18px Arial';
  ctx.fillText('For which products this restraunt is eligible?', 130, 330);

  // Product selection buttons
  drawProductButton('GVP', 130, 360);
  drawProductButton('VP+', 250, 360);
  drawProductButton('BoS', 370, 360);

  // Confirm button
  ctx.fillStyle = '#0000FF';
  ctx.fillRect(490, 360, 100, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  ctx.fillText('Confirm', 505, 385);
}

function drawProductButton(product, x, y) {
  ctx.fillStyle = selectedProducts.includes(product) ? '#4CAF50' : '#cccccc';
  ctx.fillRect(x, y, 100, 40);
  ctx.fillStyle = '#000000';
  ctx.font = '16px Arial';
  
  // Center align text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(product, x + 50, y + 20);
  
  // Reset text alignment for other drawings
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

let selectedProducts = [];

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

  // Product selection buttons
  if (mouseY >= 360 && mouseY <= 400) {
    if (mouseX >= 130 && mouseX <= 230) toggleProduct('GVP');
    if (mouseX >= 250 && mouseX <= 350) toggleProduct('VP+');
    if (mouseX >= 370 && mouseX <= 470) toggleProduct('BoS');
  }

  // Confirm button
  if (mouseX >= 490 && mouseX <= 590 && mouseY >= 360 && mouseY <= 400) {
    handlePlayerChoice();
    closeDialogue();
  }
}

function toggleProduct(product) {
  const index = selectedProducts.indexOf(product);
  if (index > -1) {
    selectedProducts.splice(index, 1);
  } else {
    selectedProducts.push(product);
  }
}

function handlePlayerChoice() {
  const restaurant = currentDialogue;
  const correctProducts = getEligibleProducts(restaurant);
  
  const allCorrect = correctProducts.length === selectedProducts.length &&
                     correctProducts.every(product => selectedProducts.includes(product));

  if (allCorrect) {
    score += 1;
    // Provide feedback with animation
    floatingTexts.push({
      text: "+1",
      x: player.x + TILE_SIZE / 2,
      y: player.y,
      opacity: 1
    });
  } else {
    // Optionally, you can add negative feedback for incorrect choices
    floatingTexts.push({
      text: "Incorrect",
      x: player.x + TILE_SIZE / 2,
      y: player.y,
      opacity: 1
    });
  }

  // Reset selected products
  selectedProducts = [];
}

function getEligibleProducts(restaurant) {
  const eligibleProducts = ['GVP']; // GVP is always eligible

  // VP+ eligibility
  if (!restaurant.hasTriedAdsBefore && restaurant.imageCoverage > 30 && restaurant.m2o > 6) {
    eligibleProducts.push('VP+');
  }

  // BoS eligibility
  if (restaurant.imageCoverage > 20 && restaurant.rating > 2.9 && restaurant.visibility > 50) {
    eligibleProducts.push('BoS');
  }

  return eligibleProducts;
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

/** Show Final Score **/
function showFinalScore() {
  gameState = 'completed';
}

/** Draw Final Score **/
function drawFinalScore() {
  // Draw semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw popup box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(200, 150, 400, 300);

  // Draw title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Completed!', canvas.width / 2, 200);

  // Draw score
  ctx.font = '20px Arial';
  ctx.fillText(`Your Final Score: ${score}`, canvas.width / 2, 250);

  // Draw restaurants covered
  ctx.fillText(`Restaurants Covered: ${clients}`, canvas.width / 2, 300);

  // Draw restart button
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(350, 350, 100, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Restart', 400, 375);

  // Reset text alignment
  ctx.textAlign = 'left';
}

/** Final Score Click Listener **/
canvas.addEventListener('click', function(e) {
  if (gameCompleted) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if click is on the restart button
    if (mouseX >= 350 && mouseX <= 450 && mouseY >= 350 && mouseY <= 390) {
      restartGame();
    }
  }
});

/** Restart Game **/
function restartGame() {
  // Reset game variables
  clients = 0;
  score = 0;
  gameCompleted = false;
  gameState = 'play';
  selectedProducts = [];
  floatingTexts = [];

  // Reset player position
  player.x = office.x;
  player.y = office.y;

  // Reset restaurants
  restaurants.forEach(restaurant => {
    restaurant.visited = false;
  });

  // Regenerate map and restaurants (optional, remove if you want to keep the same layout)
  // mapData = [];
  // buildings = [];
  // restaurants = [];
  // generateMap();
  // placeRestaurants();
}
