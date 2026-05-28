const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const dpr = window.devicePixelRatio || 1

canvas.width = window.innerWidth * dpr
canvas.height = window.innerHeight * dpr

// Per-map state — updated by loadMap()
let MAP_ROWS = 0, MAP_COLS = 0
let MAP_WIDTH = 0, MAP_HEIGHT = 0
let MAP_SCALE = 1
let VIEWPORT_WIDTH = 0, VIEWPORT_HEIGHT = 0
let VIEWPORT_CENTER_X = 0, VIEWPORT_CENTER_Y = 0
let MAX_SCROLL_X = 0, MAX_SCROLL_Y = 0
let collisionBlocks = []
let backgroundCanvas = null
let frontRendersCanvas = null
let monsters = []
let currentMapName = null

// Fade transition
let fadeAlpha = 0
let fadeState = 'none' // 'none' | 'out' | 'loading' | 'in'
let pendingMap = null
let pendingSpawn = null

// Game state
let gameState = 'menu' // 'menu' | 'playing' | 'gameover' | 'victory'
let menuHasGame = false
let menuBlinkTime = 0
let hoveredButton = -1

// Inventory
let inventory = []
let inventoryOpen = false
let selectedSlot  = -1
let hoveredSlot   = -1
let invUseBtn     = null
let invDiscardBtn = null

const ITEM_DATA = {
  hp_potion: { name: 'Lektvar HP',  desc: 'Obnoví 1 srdce. Vzácny nápoj z bylín.', usable: true  },
  coin:      { name: 'Zlatá minca', desc: 'Platidlo kráľovstva. Zbieraj ich!',       usable: false },
  key:       { name: 'Tajný kľúč',  desc: 'Otvára skryté dvere v lese.',              usable: false },
  gem:       { name: 'Drahokam',    desc: 'Vzácny kameň z lesa.',                     usable: false },
}

const BUTTONS = ['NOVÁ HRA', 'POKRAČOVAŤ', 'NASTAVENIA', 'KONIEC']
const menuPetals = []
let menuBg = null

// ─── Map configs ──────────────────────────────────────────────────────────────

const monsterSprites = {
  walkDown:  { x: 0,  y: 0, width: 16, height: 16, frameCount: 4 },
  walkUp:    { x: 16, y: 0, width: 16, height: 16, frameCount: 4 },
  walkLeft:  { x: 32, y: 0, width: 16, height: 16, frameCount: 4 },
  walkRight: { x: 48, y: 0, width: 16, height: 16, frameCount: 4 },
}

const mapConfigs = {
  map1: {
    rows: 28,
    cols: 28,
    layers: {
      l_Terrain,
      l_Trees_1,
      l_Trees_2,
      l_Trees_3,
      l_Trees_4,
      l_Landscape_Decorations,
      l_Landscape_Decorations_2,
      l_Houses,
      l_House_Decorations,
      l_Characters,
      l_Collisions,
    },
    frontLayers: {
      l_Front_Renders,
      l_Front_Renders_2,
      l_Front_Renders_3,
    },
    collisionsData: collisions,
    tilesets: {
      l_Terrain:                 { imageUrl: './images/terrain.png',    tileSize: 16 },
      l_Front_Renders:           { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Front_Renders_2:         { imageUrl: './images/characters.png',  tileSize: 16 },
      l_Front_Renders_3:         { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_1:                 { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_2:                 { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_3:                 { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_4:                 { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Landscape_Decorations:   { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Landscape_Decorations_2: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Houses:                  { imageUrl: './images/decorations.png', tileSize: 16 },
      l_House_Decorations:       { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Characters:              { imageUrl: './images/characters.png',  tileSize: 16 },
      l_Collisions:              { imageUrl: './images/characters.png',  tileSize: 16 },
    },
    spawnPoints: {
      default:    { x: 100, y: 100 },
      fromForest: { x: 380, y: 80, facing: 'down' },
    },
    exits: [
      { x: 376, y: 16, width: 48, height: 32, targetMap: 'map2', targetSpawn: 'fromVillage' },
    ],
    monsters: [
      { x: 200, y: 150, size: 15, imageSrc: './images/bamboo.png',  sprites: monsterSprites },
      { x: 300, y: 150, size: 15, imageSrc: './images/dragon.png',  sprites: monsterSprites },
      { x: 48,  y: 400, size: 15, imageSrc: './images/bamboo.png',  sprites: monsterSprites },
      { x: 288, y: 416, size: 15, imageSrc: './images/bamboo.png',  sprites: monsterSprites },
      { x: 112, y: 416, size: 15, imageSrc: './images/dragon.png',  sprites: monsterSprites },
      { x: 400, y: 400, size: 15, imageSrc: './images/dragon.png',  sprites: monsterSprites },
    ],
    items: [
      { type: 'hp_potion', x: 180, y: 200 },
      { type: 'hp_potion', x: 320, y: 150 },
      { type: 'hp_potion', x: 300, y: 250 },
      { type: 'hp_potion', x: 420, y: 320 },
      { type: 'coin',      x: 250, y: 300 },
      { type: 'coin',      x: 400, y: 180 },
      { type: 'coin',      x: 160, y: 290 },
      { type: 'coin',      x: 380, y: 400 },
      { type: 'coin',      x: 200, y: 420 },
      { type: 'key',       x: 150, y: 350 },
      { type: 'key',       x: 340, y: 180 },
      { type: 'gem',       x: 280, y: 350 },
    ],
  },
  map2: {
    rows: 40,
    cols: 50,
    layers: {
      m2_grass,
      m2_detailed_grass_and_water_with_rocks,
      m2_l_foliage_paths,
      m2_treess_and_building,
      m2_l_trees_flowers,
      m2_details,
    },
    frontLayers: {
      m2_folliage_in_forest,
    },
    collisionsData: m2_collisions,
    tilesets: {
      m2_grass:                              { imageUrl: './images/terrain.png',     tileSize: 16 },
      m2_detailed_grass_and_water_with_rocks: { imageUrl: './images/terrain.png',     tileSize: 16 },
      m2_details:                            { imageUrl: './images/terrain.png',     tileSize: 16 },
      m2_l_foliage_paths:                    { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_treess_and_building:                { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_l_trees_flowers:                    { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_folliage_in_forest:                 { imageUrl: './images/decorations.png', tileSize: 16 },
    },
    spawnPoints: {
      default:     { x: 400, y: 500 },
      fromVillage: { x: 400, y: 500 },
    },
    exits: [
      { x: 0,   y: 300, width: 16, height: 64, targetMap: 'map1', targetSpawn: 'fromForest' },
      { x: 780, y: 300, width: 16, height: 48, targetMap: 'map1', targetSpawn: 'fromForest' },
    ],
    monsters: [
      { x: 200, y: 200, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 350, y: 180, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 500, y: 300, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 280, y: 400, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 450, y: 450, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 150, y: 350, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 600, y: 250, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
    ],
    items: [
      { type: 'hp_potion', x: 200, y: 300 },
      { type: 'hp_potion', x: 450, y: 400 },
      { type: 'coin',      x: 300, y: 250 },
      { type: 'coin',      x: 500, y: 350 },
      { type: 'gem',       x: 350, y: 450 },
      { type: 'gem',       x: 250, y: 500 },
    ],
  },
}

// ─── Tile rendering ────────────────────────────────────────────────────────────

const renderLayer = (tilesData, tilesetImage, tileSize, context) => {
  tilesData.forEach((row, y) => {
    row.forEach((symbol, x) => {
      if (symbol !== 0) {
        const srcX = ((symbol - 1) % (tilesetImage.width / tileSize)) * tileSize
        const srcY =
          Math.floor((symbol - 1) / (tilesetImage.width / tileSize)) * tileSize
        context.drawImage(
          tilesetImage,
          srcX, srcY, tileSize, tileSize,
          x * 16, y * 16, 16, 16
        )
      }
    })
  })
}

const renderStaticLayers = async (layersData, tilesets) => {
  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = MAP_WIDTH
  offscreenCanvas.height = MAP_HEIGHT
  const offscreenContext = offscreenCanvas.getContext('2d')

  for (const [layerName, tilesData] of Object.entries(layersData)) {
    const tilesetInfo = tilesets[layerName]
    if (tilesetInfo) {
      try {
        const tilesetImage = await loadImage(tilesetInfo.imageUrl)
        renderLayer(tilesData, tilesetImage, tilesetInfo.tileSize, offscreenContext)
      } catch (error) {
        console.error(`Failed to load image for layer ${layerName}:`, error)
      }
    }
  }

  return offscreenCanvas
}

// ─── Game objects ──────────────────────────────────────────────────────────────

const player = new Player({ x: 100, y: 100, size: 15 })

const keys = {
  w: { pressed: false },
  a: { pressed: false },
  s: { pressed: false },
  d: { pressed: false },
}

let lastTime = performance.now()
let elapsedTime = 0

const hearts = [
  new Heart({ x: 10, y: 10 }),
  new Heart({ x: 32, y: 10 }),
  new Heart({ x: 54, y: 10 }),
]

const leafs = []
let currentMapItems = []
let worldTime = 0

// ─── loadMap ───────────────────────────────────────────────────────────────────

const loadMap = async (mapName, spawnName) => {
  const config = mapConfigs[mapName]
  currentMapName = mapName

  MAP_ROWS = config.rows
  MAP_COLS = config.cols
  MAP_WIDTH = 16 * MAP_COLS
  MAP_HEIGHT = 16 * MAP_ROWS
  const TARGET_VISIBLE_TILES = 25
  MAP_SCALE = canvas.width / (TARGET_VISIBLE_TILES * 16)
  VIEWPORT_WIDTH = canvas.width / MAP_SCALE
  VIEWPORT_HEIGHT = canvas.height / MAP_SCALE
  VIEWPORT_CENTER_X = VIEWPORT_WIDTH / 2
  VIEWPORT_CENTER_Y = VIEWPORT_HEIGHT / 2
  MAX_SCROLL_X = Math.max(0, MAP_WIDTH - VIEWPORT_WIDTH)
  MAX_SCROLL_Y = Math.max(0, MAP_HEIGHT - VIEWPORT_HEIGHT)

  collisionBlocks = []
  config.collisionsData.forEach((row, y) => {
    row.forEach((symbol, x) => {
      if (symbol === 1) {
        collisionBlocks.push(new CollisionBlock({ x: x * 16, y: y * 16, size: 16 }))
      }
    })
  })

  monsters = config.monsters.map((m) => new Monster({ ...m }))

  backgroundCanvas = await renderStaticLayers(config.layers, config.tilesets)

  if (Object.keys(config.frontLayers).length > 0) {
    frontRendersCanvas = await renderStaticLayers(config.frontLayers, config.tilesets)
  } else {
    frontRendersCanvas = document.createElement('canvas')
    frontRendersCanvas.width = MAP_WIDTH
    frontRendersCanvas.height = MAP_HEIGHT
  }

  const spawn = config.spawnPoints[spawnName] ?? config.spawnPoints.default
  player.x = spawn.x
  player.y = spawn.y
  player.velocity = { x: 0, y: 0 }
  player.center = { x: player.x + player.width / 2, y: player.y + player.height / 2 }
  if (spawn.facing) {
    player.facing = spawn.facing
    player.switchBackToIdleState()
  }

  leafs.length = 0
  currentMapItems = (config.items ?? []).map(item => ({ ...item }))
  elapsedTime = 0
  worldTime = 0
  lastTime = performance.now()
}

// ─── Transitions ───────────────────────────────────────────────────────────────

const startTransition = (targetMap, targetSpawn) => {
  if (fadeState !== 'none') return
  pendingMap = targetMap
  pendingSpawn = targetSpawn
  fadeState = 'out'
}

// ─── Menu helpers ──────────────────────────────────────────────────────────────

function initMenuPetals() {
  menuPetals.length = 0
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  for (let i = 0; i < 30; i++) {
    menuPetals.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.1,
      vy: 0.3 + Math.random() * 0.15,
      size: 4 + Math.random() * 4,
      alpha: 0.5 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.03,
    })
  }
}

function getButtonRects() {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  const BTN_W = Math.floor(W * 0.24)
  const BTN_H = 68
  const BTN_GAP = 16
  const startX = W * 0.635
  const startY = H * 0.57
  return BUTTONS.map((_, i) => ({
    x: startX, y: startY + i * (BTN_H + BTN_GAP), w: BTN_W, h: BTN_H,
  }))
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawSakuraTree(ctx, x, baseY, trunkW, trunkH, crownR) {
  ctx.fillStyle = '#5c3317'
  ctx.fillRect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH)
  const cx = x
  const cy = baseY - trunkH
  const offsets = [
    { dx: 0,           dy: -crownR * 0.8 },
    { dx: -crownR * 0.55, dy: -crownR * 0.35 },
    { dx:  crownR * 0.55, dy: -crownR * 0.35 },
    { dx: -crownR * 0.25, dy: -crownR * 1.15 },
    { dx:  crownR * 0.25, dy: -crownR * 1.05 },
  ]
  const colors = ['#ffb7c5', '#ff8fa3', '#ffccd5']
  offsets.forEach((off, i) => {
    ctx.beginPath()
    ctx.arc(cx + off.dx, cy + off.dy, crownR * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = colors[i % colors.length]
    ctx.globalAlpha = 0.82
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function drawTorii(ctx, cx, topY, h) {
  const pillarW = 12
  const gap = 84
  const leftX = cx - gap / 2
  const rightX = cx + gap / 2
  ctx.fillStyle = '#cc2200'
  // Pillars
  ctx.fillRect(leftX - pillarW / 2, topY, pillarW, h)
  ctx.fillRect(rightX - pillarW / 2, topY, pillarW, h)
  // Top curved beam (kasagi)
  ctx.fillRect(leftX - pillarW / 2 - 18, topY - 5, gap + pillarW + 36, 8)
  ctx.fillRect(leftX - pillarW / 2 - 12, topY + 3, gap + pillarW + 24, 10)
  // Middle beam (nuki)
  ctx.fillRect(leftX + pillarW / 2, topY + h * 0.28, gap - pillarW, 7)
}

// ─── Inventory ─────────────────────────────────────────────────────────────────

function getInvLayout() {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  const PW = W * 0.80
  const PH = H * 0.80
  const PX = (W - PW) / 2
  const PY = (H - PH) / 2
  const PAD = 20
  const LEFT_W  = PW * 0.30
  const MID_W   = PW * 0.45
  const RIGHT_W = PW * 0.25
  const BAR_H   = 36
  const CONTENT_Y = PY + PAD
  const CONTENT_H = PH - PAD * 2 - BAR_H
  return { W, H, PW, PH, PX, PY, PAD, LEFT_W, MID_W, RIGHT_W, BAR_H, CONTENT_Y, CONTENT_H }
}

function getInvSlotRects() {
  const { PX, PY, PAD, LEFT_W, MID_W, CONTENT_Y } = getInvLayout()
  const COLS = 6, ROWS = 4, SLOT = 64, GAP = 10
  const midContentX = PX + LEFT_W + PAD
  const midContentW = MID_W - PAD * 2
  const gridW = COLS * SLOT + (COLS - 1) * GAP
  const gx = midContentX + (midContentW - gridW) / 2
  const gy = CONTENT_Y + 32
  const rects = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      rects.push({
        x: gx + col * (SLOT + GAP),
        y: gy + row * (SLOT + GAP),
        w: SLOT, h: SLOT,
        idx: row * COLS + col,
      })
    }
  }
  return rects
}

function drawItemIcon(ctx, type, cx, cy, size) {
  const s = size / 2
  ctx.save()
  switch (type) {
    case 'hp_potion':
      ctx.fillStyle = '#ff3333'
      ctx.beginPath()
      ctx.arc(cx - s * 0.28, cy - s * 0.05, s * 0.42, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + s * 0.28, cy - s * 0.05, s * 0.42, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx - s * 0.70, cy + s * 0.05)
      ctx.lineTo(cx, cy + s * 0.90)
      ctx.lineTo(cx + s * 0.70, cy + s * 0.05)
      ctx.closePath()
      ctx.fill()
      break
    case 'coin':
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.arc(cx, cy, s * 0.75, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#7a5900'
      ctx.font = `bold ${Math.floor(s * 1.0)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('G', cx, cy)
      ctx.textBaseline = 'alphabetic'
      break
    case 'key':
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.arc(cx, cy - s * 0.28, s * 0.38, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0d0620'
      ctx.beginPath()
      ctx.arc(cx, cy - s * 0.28, s * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(cx - s * 0.11, cy - s * 0.02, s * 0.22, s * 0.85)
      ctx.fillRect(cx + s * 0.11, cy + s * 0.35, s * 0.22, s * 0.15)
      ctx.fillRect(cx + s * 0.11, cy + s * 0.55, s * 0.18, s * 0.12)
      break
    case 'gem':
      ctx.fillStyle = '#aa44ff'
      ctx.beginPath()
      ctx.moveTo(cx,           cy - s * 0.85)
      ctx.lineTo(cx + s * 0.6, cy - s * 0.2)
      ctx.lineTo(cx + s * 0.5, cy + s * 0.8)
      ctx.lineTo(cx - s * 0.5, cy + s * 0.8)
      ctx.lineTo(cx - s * 0.6, cy - s * 0.2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.moveTo(cx,            cy - s * 0.85)
      ctx.lineTo(cx + s * 0.6,  cy - s * 0.2)
      ctx.lineTo(cx,            cy - s * 0.2)
      ctx.closePath()
      ctx.fill()
      break
  }
  ctx.restore()
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineH
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y)
}

function useSelectedItem() {
  if (selectedSlot < 0 || selectedSlot >= inventory.length) return
  const item = inventory[selectedSlot]
  if (item.type === 'hp_potion') {
    const empty = hearts.find(h => h.currentFrame === 0)
    if (empty) {
      empty.currentFrame = 4
      inventory.splice(selectedSlot, 1)
      selectedSlot = Math.min(selectedSlot, inventory.length - 1)
    }
  } else if (item.type === 'coin') {
    console.log('coin: +1 gold')
  } else if (item.type === 'key') {
    console.log('key collected')
  }
}

function discardSelectedItem() {
  if (selectedSlot < 0 || selectedSlot >= inventory.length) return
  inventory.splice(selectedSlot, 1)
  selectedSlot = Math.min(selectedSlot, inventory.length - 1)
}

function drawInventory() {
  const { W, H, PW, PH, PX, PY, PAD, LEFT_W, MID_W, RIGHT_W, BAR_H, CONTENT_Y, CONTENT_H } = getInvLayout()

  c.save()
  c.scale(dpr, dpr)

  // Dark fullscreen overlay
  c.fillStyle = 'rgba(0,0,0,0.85)'
  c.fillRect(0, 0, W, H)

  // Panel
  c.fillStyle = '#1a0a2e'
  c.fillRect(PX, PY, PW, PH)
  c.strokeStyle = '#8b6914'
  c.lineWidth = 4
  c.strokeRect(PX, PY, PW, PH)

  // Corner decorations
  const CD = 14
  c.fillStyle = '#ffd700'
  c.fillRect(PX,          PY,          CD, CD)
  c.fillRect(PX + PW - CD, PY,          CD, CD)
  c.fillRect(PX,          PY + PH - CD, CD, CD)
  c.fillRect(PX + PW - CD, PY + PH - CD, CD, CD)

  // Section dividers
  const divX1 = PX + LEFT_W
  const divX2 = PX + LEFT_W + MID_W
  c.strokeStyle = '#3a2a6e'
  c.lineWidth = 1
  ;[divX1, divX2].forEach(dx => {
    c.beginPath(); c.moveTo(dx, PY + 10); c.lineTo(dx, PY + PH - BAR_H); c.stroke()
  })

  // ── LEFT: Character Info ─────────────────────────────────────────────────
  const lx = PX + PAD
  const lCX = PX + LEFT_W / 2

  c.fillStyle = '#ffd700'
  c.font = 'bold 14px monospace'
  c.textAlign = 'center'
  c.fillText('HRDINA', lCX, CONTENT_Y + 20)

  // Player sprite placeholder
  const sprX = lCX - 32
  const sprY = CONTENT_Y + 28
  c.fillStyle = '#2a1a4e'
  c.fillRect(sprX, sprY, 64, 64)
  c.strokeStyle = '#8b6914'
  c.lineWidth = 2
  c.strokeRect(sprX, sprY, 64, 64)
  if (player.loaded) {
    c.drawImage(player.image,
      player.currentSprite.x, player.currentSprite.y + 0.5, 16, 16,
      sprX + 8, sprY + 8, 48, 48)
  }

  c.fillStyle = '#fff'
  c.font = 'bold 13px monospace'
  c.textAlign = 'center'
  c.fillText('ECHOES', lCX, sprY + 80)

  // HP hearts
  const hpY = sprY + 96
  const HS = 14, HGAP = 18
  const heartStartX = lCX - (hearts.length * HGAP) / 2 + HGAP / 2 - HS / 2
  hearts.forEach((heart, i) => {
    const hx = heartStartX + i * HGAP
    const filled = heart.currentFrame === 4
    c.fillStyle = filled ? '#ff3333' : '#331111'
    c.beginPath(); c.arc(hx + HS * 0.28, hpY + HS * 0.3, HS * 0.28, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.arc(hx + HS * 0.72, hpY + HS * 0.3, HS * 0.28, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.moveTo(hx, hpY + HS * 0.45); c.lineTo(hx + HS / 2, hpY + HS); c.lineTo(hx + HS, hpY + HS * 0.45); c.closePath(); c.fill()
  })

  // Stats
  c.fillStyle = '#fff'
  c.font = 'bold 12px monospace'
  c.textAlign = 'left'
  ;['⚔ Utok:       15', '🛡 Obrana:      5', '💨 Rychlost:  10', '⭐ Level:       1'].forEach((s, i) => {
    c.fillText(s, lx, hpY + 26 + i * 22)
  })

  // ── MIDDLE: Items Grid ───────────────────────────────────────────────────
  const midCX = divX1 + MID_W / 2

  c.fillStyle = '#ffd700'
  c.font = 'bold 14px monospace'
  c.textAlign = 'center'
  c.fillText('INVENTÁR', midCX, CONTENT_Y + 20)

  const SLOT = 64
  getInvSlotRects().forEach(slot => {
    const isHover = hoveredSlot === slot.idx
    const isSel   = selectedSlot === slot.idx
    const hasItem = slot.idx < inventory.length

    c.fillStyle = '#0d0620'
    c.fillRect(slot.x, slot.y, SLOT, SLOT)
    c.strokeStyle = isSel ? '#ffd700' : (isHover ? '#aa8800' : '#3a2a6e')
    c.lineWidth   = isSel ? 2.5 : (isHover ? 2 : 1)
    c.strokeRect(slot.x, slot.y, SLOT, SLOT)

    if (hasItem) {
      const item = inventory[slot.idx]
      drawItemIcon(c, item.type, slot.x + SLOT / 2, slot.y + SLOT / 2, 36)
      c.fillStyle = '#666'
      c.font = '9px monospace'
      c.textAlign = 'right'
      c.fillText(slot.idx + 1, slot.x + SLOT - 3, slot.y + SLOT - 3)
    }
  })

  // ── RIGHT: Item Detail ───────────────────────────────────────────────────
  const rx = divX2 + PAD
  const rw = RIGHT_W - PAD * 2
  const rCX = divX2 + RIGHT_W / 2

  c.fillStyle = '#ffd700'
  c.font = 'bold 14px monospace'
  c.textAlign = 'center'
  c.fillText('DETAIL', rCX, CONTENT_Y + 20)

  invUseBtn = null
  invDiscardBtn = null

  const selItem = selectedSlot >= 0 && selectedSlot < inventory.length ? inventory[selectedSlot] : null
  if (selItem) {
    const data = ITEM_DATA[selItem.type] ?? { name: selItem.type, desc: '', usable: false }

    const iconY = CONTENT_Y + 36
    drawItemIcon(c, selItem.type, rCX, iconY + 24, 48)

    c.fillStyle = '#fff'
    c.font = 'bold 15px monospace'
    c.textAlign = 'center'
    c.fillText(data.name, rCX, iconY + 72)

    c.fillStyle = '#aaa'
    c.font = '11px monospace'
    c.textAlign = 'left'
    wrapText(c, data.desc, rx, iconY + 92, rw, 16)

    const btnW = Math.min(rw, 120)
    const btnX = rCX - btnW / 2
    const btnH = 28
    const btn1Y = CONTENT_Y + CONTENT_H - 68
    const btn2Y = CONTENT_Y + CONTENT_H - 32

    if (data.usable) {
      invUseBtn = { x: btnX, y: btn1Y, w: btnW, h: btnH }
      c.fillStyle = '#1a5c1a'
      c.fillRect(btnX, btn1Y, btnW, btnH)
      c.strokeStyle = '#44cc44'; c.lineWidth = 1.5
      c.strokeRect(btnX, btn1Y, btnW, btnH)
      c.fillStyle = '#44cc44'
      c.font = 'bold 12px monospace'; c.textAlign = 'center'
      c.fillText('POUZIT', btnX + btnW / 2, btn1Y + 19)
    }

    invDiscardBtn = { x: btnX, y: btn2Y, w: btnW, h: btnH }
    c.fillStyle = '#5c1a1a'
    c.fillRect(btnX, btn2Y, btnW, btnH)
    c.strokeStyle = '#cc4444'; c.lineWidth = 1.5
    c.strokeRect(btnX, btn2Y, btnW, btnH)
    c.fillStyle = '#cc4444'
    c.font = 'bold 12px monospace'; c.textAlign = 'center'
    c.fillText('ZAHODIT', btnX + btnW / 2, btn2Y + 19)
  } else {
    c.fillStyle = '#555'
    c.font = '12px monospace'
    c.textAlign = 'center'
    c.fillText('Vyber item', rCX, CONTENT_Y + 60)
  }

  // ── Bottom bar ───────────────────────────────────────────────────────────
  c.fillStyle = '#111'
  c.fillRect(PX, PY + PH - BAR_H, PW, BAR_H)
  c.strokeStyle = '#3a2a6e'; c.lineWidth = 1
  c.beginPath(); c.moveTo(PX, PY + PH - BAR_H); c.lineTo(PX + PW, PY + PH - BAR_H); c.stroke()
  c.fillStyle = '#777'
  c.font = '11px monospace'; c.textAlign = 'center'
  c.fillText('[ I / ESC ] Zavriet   [ Klik ] Vybrat   [ U ] Pouzit', W / 2, PY + PH - BAR_H + 22)

  c.textAlign = 'left'
  c.restore()
}

// ─── Screen draw functions ─────────────────────────────────────────────────────

function drawMenu(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  menuBlinkTime += deltaTime

  c.save()
  c.scale(dpr, dpr)

  // Background image — full device-pixel canvas
  c.restore()
  c.drawImage(menuBg, 0, 0, canvas.width, canvas.height)
  c.save()
  c.scale(dpr, dpr)

  // Sakura petals
  for (const p of menuPetals) {
    p.x += p.vx
    p.y += p.vy
    p.rot += p.rotV
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W }
    c.save()
    c.globalAlpha = p.alpha
    c.translate(p.x, p.y)
    c.rotate(p.rot)
    c.fillStyle = '#ffb7c5'
    c.beginPath()
    c.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }

  // Blink "any key" hint
  const blinkA = (Math.sin(menuBlinkTime * 3) + 1) / 2
  c.globalAlpha = 0.35 + blinkA * 0.65
  c.fillStyle = '#e8d5ff'
  c.font = `bold ${Math.max(10, Math.floor(H * 0.022))}px 'Press Start 2P', monospace`
  c.textAlign = 'center'
  c.fillText('Stlač ľubovoľný kláves', W * 0.27, H * 0.88)
  c.textAlign = 'left'
  c.globalAlpha = 1

  // Buttons — transparent, text only over image planks
  const BTN_W = Math.floor(W * 0.24)
  const BTN_H = 68
  const BTN_GAP = 16
  const btnStartX = W * 0.635
  const btnStartY = H * 0.57

  BUTTONS.forEach((label, i) => {
    const bx = btnStartX
    const by = btnStartY + i * (BTN_H + BTN_GAP)
    const isHover = hoveredButton === i
    const isDisabled = i === 1 && !menuHasGame

    const fontSize = isHover && !isDisabled ? 26 : 24
    c.font = `bold ${fontSize}px monospace`
    c.shadowColor = '#000'
    c.shadowOffsetX = 2
    c.shadowOffsetY = 2
    c.shadowBlur = 0
    c.fillStyle = isDisabled ? '#666' : (isHover ? '#ffd700' : '#fff')
    c.textAlign = 'center'
    c.fillText(label, bx + BTN_W / 2, by + BTN_H * 0.62)
  })
  c.shadowColor = 'transparent'
  c.textAlign = 'left'

  c.restore()
}

function drawGameOver(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  menuBlinkTime += deltaTime

  c.save()
  c.scale(dpr, dpr)

  c.fillStyle = '#000'
  c.fillRect(0, 0, W, H)

  // Red vignette
  const vign = c.createRadialGradient(W / 2, H / 2, H * 0.08, W / 2, H / 2, H * 0.75)
  vign.addColorStop(0, 'rgba(0,0,0,0)')
  vign.addColorStop(1, '#cc0000')
  c.fillStyle = vign
  c.fillRect(0, 0, W, H)

  c.shadowColor = '#ff2200'
  c.shadowBlur = 24
  c.fillStyle = '#cc0000'
  c.font = `bold ${Math.max(40, Math.floor(H * 0.13))}px monospace`
  c.textAlign = 'center'
  c.fillText('YOU DIED', W / 2, H / 2)
  c.shadowBlur = 0

  const blinkA = (Math.sin(menuBlinkTime * 2.2) + 1) / 2
  c.globalAlpha = 0.4 + blinkA * 0.6
  c.fillStyle = '#fff'
  c.font = `bold ${Math.max(13, Math.floor(H * 0.028))}px monospace`
  c.fillText('Stlač ENTER pre návrat do menu', W / 2, H / 2 + H * 0.14)
  c.globalAlpha = 1
  c.textAlign = 'left'

  c.restore()
}

function drawVictory(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  menuBlinkTime += deltaTime

  c.save()
  c.scale(dpr, dpr)

  const bg = c.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#3d2a00')
  bg.addColorStop(0.5, '#7a5500')
  bg.addColorStop(1, '#3d2a00')
  c.fillStyle = bg
  c.fillRect(0, 0, W, H)

  // Gold petals
  for (const p of menuPetals) {
    p.x += p.vx; p.y += p.vy; p.rot += p.rotV
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W }
    c.save()
    c.globalAlpha = p.alpha
    c.translate(p.x, p.y)
    c.rotate(p.rot)
    c.fillStyle = '#ffd700'
    c.beginPath()
    c.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }

  c.shadowColor = '#ffd700'
  c.shadowBlur = 18
  c.fillStyle = '#ffd700'
  c.font = `bold ${Math.max(36, Math.floor(H * 0.1))}px monospace`
  c.textAlign = 'center'
  c.fillText('VILLAGE SAVED!', W / 2, H / 2)
  c.shadowBlur = 0

  const blinkA = (Math.sin(menuBlinkTime * 2) + 1) / 2
  c.globalAlpha = 0.4 + blinkA * 0.6
  c.fillStyle = '#fff'
  c.font = `bold ${Math.max(13, Math.floor(H * 0.028))}px monospace`
  c.fillText('Stlač ENTER pre pokračovanie', W / 2, H / 2 + H * 0.12)
  c.globalAlpha = 1
  c.textAlign = 'left'

  c.restore()
}

// ─── Game state actions ────────────────────────────────────────────────────────

function resetHearts() {
  hearts.forEach((h) => { h.currentFrame = 4 })
}

function startNewGame() {
  resetHearts()
  resetKeys()
  menuHasGame = true
  canvas.style.cursor = 'default'
  hoveredButton = -1
  gameState = 'playing'
  loadMap('map1', 'default')
}

function resetKeys() {
  keys.w.pressed = false
  keys.a.pressed = false
  keys.s.pressed = false
  keys.d.pressed = false
}

function handleButtonClick(index) {
  switch (index) {
    case 0:
      startNewGame()
      break
    case 1:
      if (menuHasGame) {
        resetKeys()
        canvas.style.cursor = 'default'
        hoveredButton = -1
        gameState = 'playing'
      }
      break
    case 2:
      console.log('settings - coming soon')
      break
    case 3:
      if (typeof window.close === 'function') window.close()
      alert('Ďakujeme za hranie!')
      break
  }
}

// ─── Input events ──────────────────────────────────────────────────────────────

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  if (gameState === 'playing' && inventoryOpen) {
    hoveredSlot = getInvSlotRects().findIndex(
      s => mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h
    )
    canvas.style.cursor = hoveredSlot >= 0 ? 'pointer' : 'default'
    return
  }

  if (gameState !== 'menu') { hoveredButton = -1; return }
  hoveredButton = getButtonRects().findIndex(
    (btn) => mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h
  )
  canvas.style.cursor = hoveredButton >= 0 ? 'pointer' : 'default'
})

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  if (gameState === 'playing' && inventoryOpen) {
    const hit = (b) => b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h
    if (hit(invUseBtn))     { useSelectedItem();    return }
    if (hit(invDiscardBtn)) { discardSelectedItem(); return }
    const si = getInvSlotRects().findIndex(
      s => mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h
    )
    if (si >= 0) selectedSlot = si === selectedSlot ? -1 : si
    return
  }

  if (gameState !== 'menu') return
  const idx = getButtonRects().findIndex(
    (btn) => mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h
  )
  if (idx >= 0) handleButtonClick(idx)
})

window.addEventListener('keydown', (e) => {
  const ignore = ['Control', 'Alt', 'Shift', 'Meta', 'Tab', 'F1', 'F2', 'F3',
                  'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
  if (gameState === 'menu') {
    if (!ignore.includes(e.key)) startNewGame()
  } else if (gameState === 'playing') {
    if (e.key === 'i' || e.key === 'I') {
      inventoryOpen = !inventoryOpen
      if (!inventoryOpen) { selectedSlot = -1; hoveredSlot = -1 }
    } else if (e.key === 'Escape' && inventoryOpen) {
      inventoryOpen = false; selectedSlot = -1; hoveredSlot = -1
    } else if ((e.key === 'u' || e.key === 'U') && inventoryOpen) {
      useSelectedItem()
    }
  } else if (gameState === 'gameover' && e.key === 'Enter') {
    resetHearts()
    gameState = 'menu'
    initMenuPetals()
  } else if (gameState === 'victory' && e.key === 'Enter') {
    gameState = 'menu'
    initMenuPetals()
  }
})

// ─── Playing update (extracted from animate) ──────────────────────────────────

function playingUpdate(deltaTime) {
  // Skip render if map not yet loaded
  if (!backgroundCanvas || !frontRendersCanvas) return

  // Fade state machine
  if (fadeState === 'out') {
    fadeAlpha = Math.min(1, fadeAlpha + deltaTime * 2)
    if (fadeAlpha >= 1) {
      fadeState = 'loading'
      loadMap(pendingMap, pendingSpawn).then(() => { fadeState = 'in' })
    }
  } else if (fadeState === 'in') {
    fadeAlpha = Math.max(0, fadeAlpha - deltaTime * 2)
    if (fadeAlpha <= 0) { fadeAlpha = 0; fadeState = 'none' }
  }

  worldTime += deltaTime

  // Leaf spawner
  elapsedTime += deltaTime
  if (elapsedTime > 1.5) {
    leafs.push(new Sprite({
      x: Math.random() * 150,
      y: Math.random() * 50,
      velocity: { x: 0.08, y: 0.08 },
    }))
    elapsedTime = 0
  }

  // Player input — blocked during transitions and inventory
  if (fadeState === 'none' && !inventoryOpen) {
    player.handleInput(keys)
  } else {
    player.velocity.x = 0
    player.velocity.y = 0
  }
  player.update(deltaTime, collisionBlocks)

  // Item pickup
  if (fadeState === 'none' && !inventoryOpen) {
    for (let i = currentMapItems.length - 1; i >= 0; i--) {
      const item = currentMapItems[i]
      if (
        player.x + player.width  >= item.x &&
        player.x                 <= item.x + 16 &&
        player.y + player.height >= item.y &&
        player.y                 <= item.y + 16 &&
        inventory.length < 12
      ) {
        inventory.push({ type: item.type })
        currentMapItems.splice(i, 1)
      }
    }
  }

  // Exit detection
  if (fadeState === 'none' && !inventoryOpen) {
    for (const exit of mapConfigs[currentMapName].exits) {
      if (
        player.x + player.width  >= exit.x &&
        player.x                 <= exit.x + exit.width &&
        player.y + player.height >= exit.y &&
        player.y                 <= exit.y + exit.height
      ) {
        startTransition(exit.targetMap, exit.targetSpawn)
        break
      }
    }
  }

  const scrollX = Math.min(Math.max(0, player.center.x - VIEWPORT_CENTER_X), MAX_SCROLL_X)
  const scrollY = Math.min(Math.max(0, player.center.y - VIEWPORT_CENTER_Y), MAX_SCROLL_Y)

  c.save()
  c.scale(MAP_SCALE, MAP_SCALE)
  c.translate(-scrollX, -scrollY)
  c.clearRect(scrollX, scrollY, canvas.width / MAP_SCALE, canvas.height / MAP_SCALE)
  c.drawImage(backgroundCanvas, 0, 0)

  // Exit markers — blinking rect + label
  const exitAlpha = 0.3 + 0.6 * (Math.sin(worldTime * 2.5) + 1) / 2
  const exitColor = Math.sin(worldTime * 2.5) > 0 ? '#ffffff' : '#ffd700'
  for (const exit of mapConfigs[currentMapName].exits) {
    c.save()
    c.globalAlpha = exitAlpha
    c.strokeStyle = exitColor
    c.lineWidth = 2 / MAP_SCALE
    c.strokeRect(exit.x, exit.y, exit.width, exit.height)
    c.fillStyle = '#fff'
    c.font = `${10 / MAP_SCALE}px monospace`
    c.textAlign = 'center'
    c.fillText('↩ spat', exit.x + exit.width / 2, exit.y - 3 / MAP_SCALE)
    c.restore()
  }

  // Items — bob animation + glow
  for (const item of currentMapItems) {
    const bobY = item.y + Math.sin(worldTime * 3 + item.x) * 1.5
    c.save()
    c.shadowColor = '#ffd700'
    c.shadowBlur = 8
    drawItemIcon(c, item.type, item.x + 8, bobY + 8, 16)
    c.restore()
  }

  player.draw(c)

  for (let i = monsters.length - 1; i >= 0; i--) {
    const monster = monsters[i]
    if (!inventoryOpen) monster.update(deltaTime, collisionBlocks)
    monster.draw(c)

    if (
      player.attackBox.x + player.attackBox.width >= monster.x &&
      player.attackBox.x <= monster.x + monster.width &&
      player.attackBox.y + player.attackBox.height >= monster.y &&
      player.attackBox.y <= monster.y + monster.height &&
      player.isAttacking &&
      !player.hasHitEnemy
    ) {
      monster.receiveHit()
      player.hasHitEnemy = true
      if (monster.health <= 0) monsters.splice(i, 1)
    }

    if (
      player.x + player.width  >= monster.x &&
      player.x                 <= monster.x + monster.width &&
      player.y + player.height >= monster.y &&
      player.y                 <= monster.y + monster.height &&
      !player.isInvincible
    ) {
      player.receiveHit()
      const filledHearts = hearts.filter((h) => h.currentFrame === 4)
      if (filledHearts.length > 0) filledHearts[filledHearts.length - 1].currentFrame = 0
      if (filledHearts.length <= 1) gameState = 'gameover'
    }
  }

  c.drawImage(frontRendersCanvas, 0, 0)

  for (let i = leafs.length - 1; i >= 0; i--) {
    const leaf = leafs[i]
    leaf.update(deltaTime)
    leaf.draw(c)
    if (leaf.alpha <= 0) leafs.splice(i, 1)
  }

  c.restore()

  // HUD — fixed scale independent of map zoom
  c.save()
  c.scale(3 * dpr, 3 * dpr)
  hearts.forEach((heart) => heart.draw(c))
  c.restore()

  // Fade overlay
  if (fadeAlpha > 0) {
    c.save()
    c.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.restore()
  }
}

// ─── Main loop ─────────────────────────────────────────────────────────────────

function animate() {
  const currentTime = performance.now()
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05)
  lastTime = currentTime

  if      (gameState === 'menu')     drawMenu(deltaTime)
  else if (gameState === 'gameover') drawGameOver(deltaTime)
  else if (gameState === 'victory')  drawVictory(deltaTime)
  else                               playingUpdate(deltaTime)

  if (gameState === 'playing' && inventoryOpen) drawInventory()

  requestAnimationFrame(animate)
}

// ─── Start ─────────────────────────────────────────────────────────────────────

;(async () => {
  menuBg = await loadImage('./images/menu.png')
  initMenuPetals()
  lastTime = performance.now()
  animate()
})().catch(err => console.error('Failed to load menu.png — game cannot start:', err))
