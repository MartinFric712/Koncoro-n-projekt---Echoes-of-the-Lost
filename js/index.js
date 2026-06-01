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

// Coins
let coins = []
let coinCount = 0

// In-game notification
let notifText = ''
let notifTimer = 0

// Fade transition
let fadeAlpha = 0
let fadeState = 'none' // 'none' | 'out' | 'loading' | 'in'
let pendingMap = null
let pendingSpawn = null

// Audio
const bgMusic = new Audio('./5 - Peaceful.ogg')
bgMusic.loop = true
bgMusic.volume = 0.5 // Predvolená hlasitosť 50%
let musicStarted = false
let volumeLevel = 50
let hoveredSettingsBtn = null

// Game state
let gameState = 'menu' // 'menu' | 'playing' | 'intro' | 'story' | 'gameover' | 'victory' | 'settings'

// Story
const COINS_NEEDED = 30
let storyPage = 0
let storyTime = 0
const STORY_PAGES = [
  {
    bg: ['#0a0010', '#1a0030'],
    lines: [
      'V tichej dedine pod horou Kuroi',
      'žil mladý ninja menom Kaito.',
    ],
    sub: 'Život bol pokojný... až do tej noci.',
    delay: 0,
  },
  {
    bg: ['#0d0000', '#300010'],
    lines: [
      'Temný samuraj Kage prepadol dedinu.',
      'Uniesol Kaitovu milovanú — Yuki.',
    ],
    sub: 'Zanechal jediný odkaz na čiernom papieri...',
    delay: 0,
  },
  {
    bg: ['#0a0a00', '#1a1a00'],
    lines: [
      '"Prines mi 30 zlatých coinov,',
      ' inak Yuki navždy zmizne v tme."',
    ],
    sub: '— Kage, Temný Samuraj',
    delay: 0,
    quote: true,
  },
  {
    bg: ['#000d00', '#001a05'],
    lines: [
      'Kaito sa vydáva na cestu.',
      'Zbiera coiny z porazených nepriateľov.',
    ],
    sub: 'Yuki čaká. Čas beží. Ide na to.',
    delay: 0,
    last: true,
  },
]
let menuHasGame = false
let menuBlinkTime = 0
let hoveredButton = -1

const BUTTONS = ['NOVÁ HRA', 'POKRAČOVAŤ', 'NASTAVENIA', 'KONIEC']
const menuPetals = []
let menuBg = null

// ─── Map configs ──────────────────────────────────────────────────────────────

const monsterSprites = {
  walkDown: { x: 0, y: 0, width: 16, height: 16, frameCount: 4 },
  walkUp: { x: 16, y: 0, width: 16, height: 16, frameCount: 4 },
  walkLeft: { x: 32, y: 0, width: 16, height: 16, frameCount: 4 },
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
      l_Terrain: { imageUrl: './images/terrain.png', tileSize: 16 },
      l_Front_Renders: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Front_Renders_2: { imageUrl: './images/characters.png', tileSize: 16 },
      l_Front_Renders_3: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_1: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_2: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_3: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Trees_4: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Landscape_Decorations: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Landscape_Decorations_2: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Houses: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_House_Decorations: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Characters: { imageUrl: './images/characters.png', tileSize: 16 },
      l_Collisions: { imageUrl: './images/characters.png', tileSize: 16 },
    },
    spawnPoints: {
      default: { x: 100, y: 100 },
      fromForest: { x: 380, y: 80, facing: 'down' },
    },
    exits: [
      { x: 370, y: 16, width: 48, height: 32, targetMap: 'map2', targetSpawn: 'fromVillage' },
    ],
    monsters: [
      { x: 200, y: 150, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 300, y: 150, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 48, y: 400, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 288, y: 416, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 112, y: 416, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 400, y: 400, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
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
      m2_l_Characters,
    },
    frontLayers: {
      m2_folliage_in_forest,
    },
    collisionsData: m2_collisions,
    tilesets: {
      m2_grass: { imageUrl: './images/terrain.png', tileSize: 16 },
      m2_detailed_grass_and_water_with_rocks: { imageUrl: './images/terrain.png', tileSize: 16 },
      m2_details: { imageUrl: './images/terrain.png', tileSize: 16 },
      m2_l_foliage_paths: { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_treess_and_building: { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_l_trees_flowers: { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_folliage_in_forest: { imageUrl: './images/decorations.png', tileSize: 16 },
      m2_l_Characters: { imageUrl: './Images2/characters.png', tileSize: 16 },
    },
    spawnPoints: {
      fromVillage: { x: 575, y: 600 },
      fromMap3: { x: 640, y: 50, facing: 'down' },
    },
    exits: [
      { x: 610, y: 5, width: 64, height: 16, targetMap: 'map3', targetSpawn: 'fromMap2' },
      { x: 525, y: 620, width: 96, height: 16, targetMap: 'map1', targetSpawn: 'fromForest' },
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
  },
  map3: {
    rows: 60,
    cols: 60,
    layers: {
      l_Ground,
      l_Enviroment,
      l_Buildnigs,
      l_Fence,
      l_Steps,
      l_Decorations,
      m3_l_Characters,
    },
    frontLayers: {
      l_Building_Front,
      l_Roof,
    },
    collisionsData: m3_collisions,
    tilesets: {
      l_Ground: { imageUrl: './images/terrain.png', tileSize: 16 },
      l_Fence: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Enviroment: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Decorations: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Steps: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Buildnigs: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Roof: { imageUrl: './images/decorations.png', tileSize: 16 },
      l_Building_Front: { imageUrl: './images/decorations.png', tileSize: 16 },
      m3_l_Characters: { imageUrl: './images2/characters.png', tileSize: 16 },
    },
    spawnPoints: {
      fromMap2: { x: 785, y: 900, facing: 'down' },
    },
    exits: [
      { x: 780, y: 930, width: 40, height: 16, targetMap: 'map2', targetSpawn: 'fromMap3' },
    ],
    monsters: [
      { x: 356, y: 468, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 356, y: 212, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 292, y: 212, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 260, y: 404, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 628, y: 292, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 436, y: 612, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 100, y: 404, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 596, y: 228, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 564, y: 660, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 356, y: 292, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 676, y: 388, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 292, y: 340, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 564, y: 356, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
      { x: 228, y: 164, size: 15, imageSrc: './images/dragon.png', sprites: monsterSprites },
      { x: 372, y: 724, size: 15, imageSrc: './images/bamboo.png', sprites: monsterSprites },
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
  coins.length = 0
  elapsedTime = 0
  worldTime = 0
  lastTime = performance.now()
}

// ─── Transitions ───────────────────────────────────────────────────────────────

const startTransition = (targetMap, targetSpawn) => {
  if (fadeState !== 'none') return
  if (targetMap === 'map3') {
    if (coinCount >= COINS_NEEDED) {
      notifText = `Máš ${coinCount} coinov. Choď zachrániť Yuki!`
    } else {
      notifText = `Máš len ${coinCount}/${COINS_NEEDED} coinov! Kage ťa nezoberie vážne.`
    }
    notifTimer = 4.0
  }
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
  const BTN_W = W * 0.322
  const startX = W * 0.678
  const planks = [
    { y: H * 0.430, h: H * 0.065 },
    { y: H * 0.547, h: H * 0.060 },
    { y: H * 0.658, h: H * 0.060 },
    { y: H * 0.768, h: H * 0.060 },
  ]
  return BUTTONS.map((_, i) => ({
    x: startX, y: planks[i].y, w: BTN_W, h: planks[i].h,
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
    { dx: 0, dy: -crownR * 0.8 },
    { dx: -crownR * 0.55, dy: -crownR * 0.35 },
    { dx: crownR * 0.55, dy: -crownR * 0.35 },
    { dx: -crownR * 0.25, dy: -crownR * 1.15 },
    { dx: crownR * 0.25, dy: -crownR * 1.05 },
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

// ─── Screen draw functions ─────────────────────────────────────────────────────

function drawMenu(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  menuBlinkTime += deltaTime

  c.save()
  c.scale(dpr, dpr)

  // Background image — full device-pixel canvas
  c.restore()
  if (menuBg) {
      c.drawImage(menuBg, 0, 0, canvas.width, canvas.height)
  }
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



  // Buttons — use same rects as getButtonRects() for perfect alignment
  const btns = getButtonRects()

  BUTTONS.forEach((label, i) => {
    const btn = btns[i]
    const isHover = hoveredButton === i
    const isDisabled = i === 1 && !menuHasGame

    const fontSize = Math.floor(btn.h * 0.45)
    c.font = `bold ${isHover && !isDisabled ? fontSize + 2 : fontSize}px monospace`
    c.shadowColor = '#000'
    c.shadowOffsetX = 2
    c.shadowOffsetY = 2
    c.shadowBlur = 0
    c.fillStyle = isDisabled ? '#666' : (isHover ? '#ffd700' : '#fff')
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2)
    c.textBaseline = 'alphabetic'
  })
  c.shadowColor = 'transparent'
  c.textAlign = 'left'

  c.restore()
}

// ─── Intro & Story screens ────────────────────────────────────────────────────

function drawIntro(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  menuBlinkTime += deltaTime
  storyTime += deltaTime

  c.save()
  c.scale(dpr, dpr)

  // Dark bg
  c.fillStyle = '#000'
  c.fillRect(0, 0, W, H)

  // Falling petals (red/dark)
  for (const p of menuPetals) {
    p.x += p.vx; p.y += p.vy; p.rot += p.rotV
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W }
    c.save()
    c.globalAlpha = p.alpha * 0.5
    c.translate(p.x, p.y)
    c.rotate(p.rot)
    c.fillStyle = '#cc2244'
    c.beginPath()
    c.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }

  // Title
  const titleSize = Math.max(28, Math.floor(H * 0.07))
  c.shadowColor = '#ff3366'
  c.shadowBlur = 20
  c.fillStyle = '#ff3366'
  c.font = `bold ${titleSize}px monospace`
  c.textAlign = 'center'
  c.fillText('NINJA TYCOON', W / 2, H * 0.22)
  c.shadowBlur = 0

  // Subtitle
  c.fillStyle = '#ffcc00'
  c.font = `bold ${Math.floor(titleSize * 0.45)}px monospace`
  c.fillText('— Záchrana Yuki —', W / 2, H * 0.32)

  // Story teaser box
  c.fillStyle = 'rgba(0,0,0,0.6)'
  const bw = W * 0.7, bh = H * 0.28
  const bx = (W - bw) / 2, by = H * 0.42
  c.fillRect(bx, by, bw, bh)
  c.strokeStyle = '#cc2244'
  c.lineWidth = 2
  c.strokeRect(bx, by, bw, bh)

  const lh = Math.max(13, Math.floor(H * 0.030))
  c.fillStyle = '#fff'
  c.font = `${lh}px monospace`
  const lines = [
    'Temný samuraj Kage uniesol tvoju milovanú.',
    `Zbier ${COINS_NEEDED} coinov z porazených nepriateľov`,
    'a vykúp ju zo zajatia na poslednej mape.',
    '',
    'Prejdi lesom, údolím a dostaň sa do jeho hradu.',
  ]
  lines.forEach((ln, i) => {
    c.fillText(ln, W / 2, by + lh * 1.5 + i * (lh * 1.35))
  })

  // Coin goal reminder
  c.fillStyle = '#ffcc00'
  c.font = `bold ${Math.max(14, Math.floor(H * 0.034))}px monospace`
  c.fillText(`Cieľ: ${COINS_NEEDED} 🪙  coinov`, W / 2, H * 0.80)

  // Blink start
  const blinkA = (Math.sin(menuBlinkTime * 2.5) + 1) / 2
  c.globalAlpha = 0.4 + blinkA * 0.6
  c.fillStyle = '#aaa'
  c.font = `bold ${Math.max(11, Math.floor(H * 0.024))}px monospace`
  c.fillText('Stlač ENTER pre začatie', W / 2, H * 0.90)
  c.globalAlpha = 1
  c.textAlign = 'left'
  c.restore()
}

function drawStory(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  menuBlinkTime += deltaTime
  storyTime += deltaTime

  const page = STORY_PAGES[storyPage]
  c.save()
  c.scale(dpr, dpr)

  const grad = c.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, page.bg[0])
  grad.addColorStop(1, page.bg[1])
  c.fillStyle = grad
  c.fillRect(0, 0, W, H)

  // petals
  for (const p of menuPetals) {
    p.x += p.vx * 0.5; p.y += p.vy * 0.5; p.rot += p.rotV
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W }
    c.save()
    c.globalAlpha = p.alpha * 0.4
    c.translate(p.x, p.y)
    c.rotate(p.rot)
    c.fillStyle = page.quote ? '#aaaa00' : '#cc3355'
    c.beginPath()
    c.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }

  // Page number dots
  STORY_PAGES.forEach((_, i) => {
    c.beginPath()
    c.arc(W / 2 + (i - STORY_PAGES.length / 2 + 0.5) * 22, H * 0.12, 4, 0, Math.PI * 2)
    c.fillStyle = i === storyPage ? '#fff' : '#555'
    c.fill()
  })

  // Main lines
  const lSize = Math.max(18, Math.floor(H * 0.048))
  c.textAlign = 'center'
  c.fillStyle = page.quote ? '#ffee44' : '#fff'
  c.font = `${page.quote ? 'italic ' : ''}bold ${lSize}px monospace`
  c.shadowColor = '#000'
  c.shadowBlur = 8
  page.lines.forEach((ln, i) => {
    c.fillText(ln, W / 2, H * 0.38 + i * (lSize * 1.6))
  })
  c.shadowBlur = 0

  // Sub line
  c.fillStyle = '#aaa'
  c.font = `${Math.max(12, Math.floor(H * 0.028))}px monospace`
  c.fillText(page.sub, W / 2, H * 0.65)

  // Coin reminder on last page
  if (page.last) {
    c.fillStyle = '#ffcc00'
    c.font = `bold ${Math.max(14, Math.floor(H * 0.036))}px monospace`
    c.fillText(`Zbier ${COINS_NEEDED} coinov !`, W / 2, H * 0.76)
  }

  // Nav hint
  const blinkA = (Math.sin(menuBlinkTime * 2.5) + 1) / 2
  c.globalAlpha = 0.4 + blinkA * 0.6
  c.fillStyle = '#888'
  c.font = `${Math.max(10, Math.floor(H * 0.022))}px monospace`
  const hint = storyPage < STORY_PAGES.length - 1 ? 'ENTER — ďalej' : 'ENTER — hrať!'
  c.fillText(hint, W / 2, H * 0.90)
  c.globalAlpha = 1
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
  const won = coinCount >= COINS_NEEDED
  c.fillText(won ? 'YUKI JE SLOBODNÁ!' : 'KAGE PORAZENÝ...', W / 2, H * 0.35)
  c.shadowBlur = 0

  // Story ending text
  c.fillStyle = '#fff'
  c.font = `${Math.max(13, Math.floor(H * 0.030))}px monospace`
  if (won) {
    const ending = [
      'Kaito porazil Kageho a prinesl 30 coinov.',
      'Yuki bola oslobodená.',
      '',
      'Dedina sa opäť radovala.',
      'A Kaito... konečne vydýchol.',
    ]
    ending.forEach((ln, i) => c.fillText(ln, W / 2, H * 0.50 + i * Math.floor(H * 0.048)))
  } else {
    const ending = [
      `Zozbierané coiny: ${coinCount} / ${COINS_NEEDED}`,
      '',
      'Kage bol porazený, ale bez výkupného',
      'Yuki zmizla v tme navždy...',
    ]
    ending.forEach((ln, i) => c.fillText(ln, W / 2, H * 0.50 + i * Math.floor(H * 0.048)))
  }
  // dummy fillText to keep structure — original was here
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

function getSettingsButtons() {
  const W = canvas.width / dpr
  const H = canvas.height / dpr
  return {
    minus: { x: W / 2 - W * 0.25, y: H * 0.45, w: W * 0.15, h: H * 0.1 },
    plus: { x: W / 2 + W * 0.1, y: H * 0.45, w: W * 0.15, h: H * 0.1 },
    back: { x: W / 2 - W * 0.15, y: H * 0.7, w: W * 0.3, h: H * 0.1 }
  }
}

function drawSettings(deltaTime) {
  const W = canvas.width / dpr
  const H = canvas.height / dpr

  c.save()
  c.scale(dpr, dpr)

  // Tmavé pozadie s menu obrázkom v pozadí
  if (menuBg) {
    c.drawImage(menuBg, 0, 0, canvas.width, canvas.height)
  }
  c.fillStyle = 'rgba(0,0,0,0.85)'
  c.fillRect(0, 0, W, H)

  // Nadpis
  c.fillStyle = '#ffcc00'
  c.font = `bold ${Math.max(30, Math.floor(H * 0.08))}px monospace`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('NASTAVENIA', W / 2, H * 0.2)

  // Aktuálna hlasitosť
  c.fillStyle = '#fff'
  c.font = `bold ${Math.max(20, Math.floor(H * 0.05))}px monospace`
  c.fillText(`HLASITOSŤ: ${volumeLevel}%`, W / 2, H * 0.5)

  const btns = getSettingsButtons()

  // Tlačidlo Mínus
  c.fillStyle = hoveredSettingsBtn === 'minus' ? '#ff3366' : '#fff'
  c.fillText('[-]', btns.minus.x + btns.minus.w / 2, btns.minus.y + btns.minus.h / 2)

  // Tlačidlo Plus
  c.fillStyle = hoveredSettingsBtn === 'plus' ? '#44ff44' : '#fff'
  c.fillText('[+]', btns.plus.x + btns.plus.w / 2, btns.plus.y + btns.plus.h / 2)

  // Tlačidlo Späť
  c.fillStyle = hoveredSettingsBtn === 'back' ? '#ffd700' : '#888'
  c.font = `bold ${Math.max(16, Math.floor(H * 0.04))}px monospace`
  c.fillText('SPÄŤ DO MENU', btns.back.x + btns.back.w / 2, btns.back.y + btns.back.h / 2)

  c.restore()
}

// ─── Game state actions ────────────────────────────────────────────────────────

function resetHearts() {
  hearts.forEach((h) => { h.currentFrame = 4 })
}

function startNewGame() {
  resetHearts()
  resetKeys()
  coinCount = 0
  storyPage = 0
  storyTime = 0
  menuHasGame = true
  canvas.style.cursor = 'default'
  hoveredButton = -1
  gameState = 'intro'
  initMenuPetals()
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
      gameState = 'settings'
      hoveredSettingsBtn = null
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

  if (gameState === 'menu') {
    hoveredButton = getButtonRects().findIndex(
      (btn) => mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h
    )
    canvas.style.cursor = hoveredButton >= 0 ? 'pointer' : 'default'
  } else if (gameState === 'settings') {
    hoveredSettingsBtn = null
    const btns = getSettingsButtons()
    for (const [key, b] of Object.entries(btns)) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        hoveredSettingsBtn = key
      }
    }
    canvas.style.cursor = hoveredSettingsBtn ? 'pointer' : 'default'
  } else {
    hoveredButton = -1
    canvas.style.cursor = 'default'
  }
})

canvas.addEventListener('click', (e) => {
  // Spustenie hudby pri prvom kliknutí do hry
  if (!musicStarted) {
    bgMusic.play().catch(err => console.log('Autoplay zablokovaný:', err))
    musicStarted = true
  }

  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  if (gameState === 'menu') {
    const idx = getButtonRects().findIndex(
      (btn) => mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h
    )
    if (idx >= 0) handleButtonClick(idx)
  } else if (gameState === 'settings') {
    const btns = getSettingsButtons()
    if (mx >= btns.minus.x && mx <= btns.minus.x + btns.minus.w && my >= btns.minus.y && my <= btns.minus.y + btns.minus.h) {
      volumeLevel = Math.max(0, volumeLevel - 10)
      bgMusic.volume = volumeLevel / 100
    }
    if (mx >= btns.plus.x && mx <= btns.plus.x + btns.plus.w && my >= btns.plus.y && my <= btns.plus.y + btns.plus.h) {
      volumeLevel = Math.min(100, volumeLevel + 10)
      bgMusic.volume = volumeLevel / 100
    }
    if (mx >= btns.back.x && mx <= btns.back.x + btns.back.w && my >= btns.back.y && my <= btns.back.y + btns.back.h) {
      gameState = 'menu'
      canvas.style.cursor = 'default'
    }
  }
})

window.addEventListener('keydown', (e) => {
  const ignore = ['Control', 'Alt', 'Shift', 'Meta', 'Tab', 'F1', 'F2', 'F3',
    'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
  if (gameState === 'intro' && e.key === 'Enter') {
    storyPage = 0
    storyTime = 0
    menuBlinkTime = 0
    initMenuPetals()
    gameState = 'story'
  } else if (gameState === 'story' && e.key === 'Enter') {
    if (storyPage < STORY_PAGES.length - 1) {
      storyPage++
      menuBlinkTime = 0
    } else {
      gameState = 'playing'
      loadMap('map1', 'default')
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

  // Player input — blocked during transitions
  if (fadeState === 'none') {
    player.handleInput(keys)
  } else {
    player.velocity.x = 0
    player.velocity.y = 0
  }
  player.update(deltaTime, collisionBlocks)

  // Exit detection
  if (fadeState === 'none') {
    for (const exit of mapConfigs[currentMapName].exits) {
      if (
        player.x + player.width >= exit.x &&
        player.x <= exit.x + exit.width &&
        player.y + player.height >= exit.y &&
        player.y <= exit.y + exit.height
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

  player.draw(c)

  for (let i = monsters.length - 1; i >= 0; i--) {
    const monster = monsters[i]
    monster.update(deltaTime, collisionBlocks)
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
      if (monster.health <= 0) {
        // Drop 1-3 coins
        const drop = 1 + Math.floor(Math.random() * 3)
        for (let d = 0; d < drop; d++) {
          coins.push({
            x: monster.x + monster.width / 2 + (Math.random() - 0.5) * 16,
            y: monster.y + monster.height / 2 + (Math.random() - 0.5) * 16,
            vy: -0.8 - Math.random() * 0.8,
            vx: (Math.random() - 0.5) * 1.2,
            gravity: 0.15,
            bobTime: Math.random() * Math.PI * 2,
            landed: false,
            collected: false,
            alpha: 1,
          })
        }
        monsters.splice(i, 1)
        if (currentMapName === 'map3' && monsters.length === 0) {
          setTimeout(() => {
            gameState = 'victory'
            initMenuPetals()
          }, 800)
        }
      }
    }

    if (
      player.x + player.width >= monster.x &&
      player.x <= monster.x + monster.width &&
      player.y + player.height >= monster.y &&
      player.y <= monster.y + monster.height &&
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

  // Coins — update, draw, pickup
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i]
    if (coin.collected) {
      coin.alpha -= 0.08
      if (coin.alpha <= 0) { coins.splice(i, 1); continue }
    } else {
      if (!coin.landed) {
        coin.vy += coin.gravity
        coin.x += coin.vx
        coin.y += coin.vy
        coin.vx *= 0.92
        if (coin.vy > 0.5 && coin.vy < 0.7) {
          coin.landed = true
          coin.vy = 0
          coin.vx = 0
        }
      }
      coin.bobTime += 0.05
      // Pickup detection
      const cx = coin.x, cy = coin.y, cr = 5
      if (
        player.x < cx + cr && player.x + player.width > cx - cr &&
        player.y < cy + cr && player.y + player.height > cy - cr
      ) {
        coin.collected = true
        coinCount++
      }
    }
    // Draw pixel art coin
    const cs = c
    const px = Math.round(coin.x)
    const py = Math.round(coin.y + (coin.collected ? 0 : Math.sin(coin.bobTime) * 1.2))
    cs.save()
    cs.globalAlpha = coin.alpha
    // Shadow
    cs.fillStyle = 'rgba(0,0,0,0.25)'
    cs.beginPath()
    cs.ellipse(px, py + 6, 4, 2, 0, 0, Math.PI * 2)
    cs.fill()
    // Coin body
    cs.fillStyle = '#c8860a'
    cs.fillRect(px - 4, py - 2, 8, 6)
    cs.fillRect(px - 2, py - 4, 4, 10)
    // Inner gold
    cs.fillStyle = '#f5c518'
    cs.fillRect(px - 3, py - 1, 6, 4)
    cs.fillRect(px - 1, py - 3, 2, 8)
    // Highlight
    cs.fillStyle = '#ffe87a'
    cs.fillRect(px - 2, py - 2, 2, 2)
    cs.fillRect(px - 2, py - 2, 1, 3)
    // Dark edge
    cs.fillStyle = '#7a4f00'
    cs.fillRect(px - 4, py - 2, 1, 6)
    cs.fillRect(px + 3, py - 2, 1, 6)
    cs.fillRect(px - 2, py - 4, 4, 1)
    cs.fillRect(px - 2, py + 5, 4, 1)
    cs.restore()
  }

  c.restore()

  // HUD — hearts top-left, slightly smaller
  c.save()
  const heartScale = 4 * dpr
  c.scale(heartScale, heartScale)
  const heartSpacing = 22
  const heartMargin = 8
  hearts.forEach((heart, i) => {
    heart.x = heartMargin + i * heartSpacing
    heart.y = heartMargin
  })
  hearts.forEach((heart) => heart.draw(c))
  c.restore()

  // Coin counter HUD — top-right
  c.save()
  const coinSize = Math.floor(Math.min(canvas.width, canvas.height) * 0.038)
  const hudX = canvas.width - coinSize * 5.5
  const hudY = 20 * dpr
  // Coin icon (pixel art, small)
  const s = coinSize
  c.fillStyle = '#c8860a'
  c.fillRect(hudX, hudY - s * 0.4, s, s * 0.8)
  c.fillRect(hudX + s * 0.25, hudY - s * 0.6, s * 0.5, s * 1.2)
  c.fillStyle = '#f5c518'
  c.fillRect(hudX + s * 0.12, hudY - s * 0.2, s * 0.75, s * 0.4)
  c.fillRect(hudX + s * 0.37, hudY - s * 0.45, s * 0.25, s * 0.9)
  c.fillStyle = '#ffe87a'
  c.fillRect(hudX + s * 0.12, hudY - s * 0.2, s * 0.25, s * 0.25)
  c.fillStyle = '#7a4f00'
  c.fillRect(hudX, hudY - s * 0.4, s * 0.12, s * 0.8)
  c.fillRect(hudX + s * 0.88, hudY - s * 0.4, s * 0.12, s * 0.8)
  // Counter text
  c.fillStyle = '#fff'
  c.font = `bold ${Math.round(s * 1.1)}px monospace`
  c.shadowColor = '#000'
  c.shadowOffsetX = 1 * dpr
  c.shadowOffsetY = 1 * dpr
  c.shadowBlur = 0
  c.textBaseline = 'middle'
  c.fillText(`x ${coinCount}`, hudX + s * 1.4, hudY)
  c.shadowColor = 'transparent'
  c.textBaseline = 'alphabetic'
  c.restore()

  // In-game notification banner
  if (notifTimer > 0) {
    notifTimer -= deltaTime
    const W2 = canvas.width / dpr
    const H2 = canvas.height / dpr
    const alpha = Math.min(1, notifTimer * 2) * Math.min(1, (notifTimer > 0.5 ? 1 : notifTimer * 2))
    c.save()
    c.scale(dpr, dpr)
    c.globalAlpha = alpha
    const nSize = Math.max(12, Math.floor(H2 * 0.030))
    const nW = W2 * 0.7
    const nH = nSize * 2.4
    const nX = (W2 - nW) / 2
    const nY = H2 * 0.08
    c.fillStyle = coinCount >= COINS_NEEDED ? 'rgba(0,80,0,0.85)' : 'rgba(80,0,0,0.85)'
    c.fillRect(nX, nY, nW, nH)
    c.strokeStyle = coinCount >= COINS_NEEDED ? '#44ff44' : '#ff4444'
    c.lineWidth = 2
    c.strokeRect(nX, nY, nW, nH)
    c.fillStyle = '#fff'
    c.font = `bold ${nSize}px monospace`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(notifText, W2 / 2, nY + nH / 2)
    c.textBaseline = 'alphabetic'
    c.textAlign = 'left'
    c.restore()
  }

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

  if (gameState === 'menu') drawMenu(deltaTime)
  else if (gameState === 'intro') drawIntro(deltaTime)
  else if (gameState === 'story') drawStory(deltaTime)
  else if (gameState === 'gameover') drawGameOver(deltaTime)
  else if (gameState === 'victory') drawVictory(deltaTime)
  else if (gameState === 'settings') drawSettings(deltaTime)
  else playingUpdate(deltaTime)

  requestAnimationFrame(animate)
}

// ─── Start ─────────────────────────────────────────────────────────────────────

; (async () => {
  menuBg = await loadImage('./images/menu.png')
  initMenuPetals()
  lastTime = performance.now()
  animate()
})().catch(err => console.error('Failed to load menu.png — game cannot start:', err))