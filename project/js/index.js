const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
c.imageSmoothingEnabled = false
const dpr = window.devicePixelRatio || 1

canvas.width = 1024 * dpr
canvas.height = 576 * dpr

const MAP_ROWS = 28
const MAP_COLS = 28
const MAP_WIDTH = 16 * MAP_COLS
const MAP_HEIGHT = 16 * MAP_ROWS
const MAP_SCALE = dpr + 2
const VIEWPORT_HEIGHT = canvas.height / MAP_SCALE
const VIEWPORT_WIDTH = canvas.width / MAP_SCALE
const VIEWPORT_CENTER_X = VIEWPORT_WIDTH / 2
const VIEWPORT_CENTER_Y = VIEWPORT_HEIGHT / 2
const MAX_SCROLL_X = MAP_WIDTH - VIEWPORT_WIDTH
const MAX_SCROLL_Y = MAP_HEIGHT - VIEWPORT_HEIGHT

const layersData = {
  l_Terrain: l_Terrain,
  l_Trees_1: l_Trees_1,
  l_Trees_2: l_Trees_2,
  l_Trees_3: l_Trees_3,
  l_Trees_4: l_Trees_4,
  l_Landscape_Decorations: l_Landscape_Decorations,
  l_Landscape_Decorations_2: l_Landscape_Decorations_2,
  l_Houses: l_Houses,
  l_House_Decorations: l_House_Decorations,
  l_Characters: l_Characters,
  l_Collisions: l_Collisions,
};

const frontRendersLayersData = {
  l_Front_Renders: l_Front_Renders,
}

const tilesets = {
  l_Terrain: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_Front_Renders: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Trees_1: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Trees_2: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Trees_3: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Trees_4: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Landscape_Decorations: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Landscape_Decorations_2: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Houses: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_House_Decorations: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Characters: { imageUrl: './images/characters.png', tileSize: 16, animations: [] },
  l_Collisions: { imageUrl: './images/characters.png', tileSize: 16, animations: [] },
};


// Tile setup
const collisionBlocks = []
const blockSize = 16 // Assuming each tile is 16x16 pixels

collisions.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 1) {
      collisionBlocks.push(
        new CollisionBlock({
          x: x * blockSize,
          y: y * blockSize,
          size: blockSize,
        }),
      )
    }
  })
})

const firstLayerKey = Object.keys(layersData)[0]
const firstLayer = layersData[firstLayerKey]
const mapWidthPx = firstLayer ? firstLayer[0].length * blockSize : 0
const mapHeightPx = firstLayer ? firstLayer.length * blockSize : 0

const tilesetImages = {}
const animatedCells = {}
const animationsByLayer = {}

const renderLayer = (tilesData, tilesetImage, tileSize, context, skipSymbols) => {
  const tilesPerRow = Math.ceil(tilesetImage.width / tileSize)

  tilesData.forEach((row, y) => {
    row.forEach((symbol, x) => {
      if (symbol !== 0 && (!skipSymbols || !skipSymbols.has(symbol))) {
        const tileIndex = symbol - 1
        const srcX = (tileIndex % tilesPerRow) * tileSize
        const srcY = Math.floor(tileIndex / tilesPerRow) * tileSize
        context.drawImage(
          tilesetImage,
          srcX, srcY, tileSize, tileSize,
          x * 16, y * 16, 16, 16,
        )
      }
    })
  })
}

const renderStaticLayers = async (layersData) => {
  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = Math.max(mapWidthPx * dpr, 1)
  offscreenCanvas.height = Math.max(mapHeightPx * dpr, 1)
  const offscreenContext = offscreenCanvas.getContext('2d')
  offscreenContext.imageSmoothingEnabled = false
  offscreenContext.scale(dpr, dpr)

  for (const [layerName, tilesData] of Object.entries(layersData)) {
    const tilesetInfo = tilesets[layerName]
    if (tilesetInfo) {
      try {
        const tilesetImage = await loadImage(tilesetInfo.imageUrl)
        tilesetImages[layerName] = tilesetImage
        const animations = tilesetInfo.animations || []
        animationsByLayer[layerName] = animations
        const startSymbols = new Set(animations.map((a) => a.frames[0]))
        if (startSymbols.size) {
          const cells = []
          tilesData.forEach((row, y) => {
            row.forEach((symbol, x) => {
              if (startSymbols.has(symbol)) cells.push({ x, y, startSymbol: symbol })
            })
          })
          animatedCells[layerName] = cells
        }
        renderLayer(tilesData, tilesetImage, tilesetInfo.tileSize, offscreenContext, startSymbols)
      } catch (error) {
        console.error(`Failed to load image for layer ${layerName}:`, error)
      }
    }
  }

  return offscreenCanvas
}

function drawAnimatedTiles(context, now) {
  for (const layerName in animatedCells) {
    const cells = animatedCells[layerName]
    if (!cells || !cells.length) continue
    const animations = animationsByLayer[layerName] || []
    const tilesetImage = tilesetImages[layerName]
    const info = tilesets[layerName]
    if (!tilesetImage || !info) continue
    const tileSize = info.tileSize
    const tilesPerRow = Math.ceil(tilesetImage.width / tileSize)
    for (const cell of cells) {
      const anim = animations.find((a) => a.frames[0] === cell.startSymbol)
      if (!anim) continue
      const fps = anim.fps > 0 ? anim.fps : 6
      const frameIndex = Math.floor((now / 1000) * fps) % anim.frames.length
      const symbol = anim.frames[frameIndex]
      const tileIndex = symbol - 1
      const srcX = (tileIndex % tilesPerRow) * tileSize
      const srcY = Math.floor(tileIndex / tilesPerRow) * tileSize
      context.drawImage(
        tilesetImage,
        srcX, srcY, tileSize, tileSize,
        cell.x * 16, cell.y * 16, 16, 16,
      )
    }
  }
}
// END - Tile setup

// Change xy coordinates to move player's default position
const player = new Player({
  x: 100,
  y: 100,
  size: 15,
})

const monsterSprites = {
  walkDown: {
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    FrameCount: 4,
  },
  walkUp: {
    x: 16,
    y: 0,
    width: 16,
    height: 16,
    FrameCount: 4,
  }
  , walkRight: {
    x: 48,
    y: 0,
    width: 16,
    height: 16,
    FrameCount: 4,
  },
  walkLeft: {
    x: 32,
    y: 0,
    width: 16,
    height: 16,
    FrameCount: 4,
  },
}

const monsters = [
  new Monster({
    x: 200,
    y: 150,
    size: 15,
    imageSrc: './images/Bamboo.png',
    sprites: monsterSprites,
  }),
  new Monster({
    x: 300,
    y: 150,
    size: 15,
    imageSrc: './images/Dragon.png',
    sprites: monsterSprites,
  }),
  new Monster({
    x: 48,
    y: 400,
    size: 15,
    imageSrc: './images/Bamboo.png',
    sprites: monsterSprites,
  }),
  new Monster({
    x: 288,
    y: 416,
    size: 15,
    imageSrc: './images/Bamboo.png',
    sprites: monsterSprites,
  }),
  new Monster({
    x: 112,
    y: 416,
    size: 15,
    imageSrc: './images/Dragon.png',
    sprites: monsterSprites,
  }),
  new Monster({
    x: 400,
    y: 400,
    size: 15,
    imageSrc: './images/Dragon.png',
    sprites: monsterSprites,
  }),
]

const keys = {
  w: {
    pressed: false,
  },
  a: {
    pressed: false,
  },
  s: {
    pressed: false,
  },
  d: {
    pressed: false,
  },
}

let lastTime = performance.now()
let frontRendersCanvas
function animate(backgroundCanvas) {
  // Calculate delta time
  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime

  // Update player position
  player.handleInput(keys)
  player.update(deltaTime, collisionBlocks)

  const horizontalScrollDistance = Math.min(MAX_SCROLL_X, Math.max(0, player.center.x - VIEWPORT_CENTER_X))
  const verticalScrollDistance = Math.min(MAX_SCROLL_Y, Math.max(0, player.center.y - VIEWPORT_CENTER_Y))



  // Render scene
  c.save()
  c.scale(MAP_SCALE, MAP_SCALE)
  c.translate(-horizontalScrollDistance, -verticalScrollDistance)
  c.clearRect(0, 0, canvas.width, canvas.height)
  c.drawImage(backgroundCanvas, 0, 0, mapWidthPx, mapHeightPx)
  drawAnimatedTiles(c, currentTime)
  player.draw(c)

  // render out our monsters
  for (let i = monsters.length - 1; i >= 0; i--) {
    const monster = monsters[i]
    monster.update(deltaTime, collisionBlocks)
    monster.draw(c)
  }

  c.drawImage(frontRendersCanvas, 0, 0, mapWidthPx, mapHeightPx)

  c.restore()

  requestAnimationFrame(() => animate(backgroundCanvas))
}

const startRendering = async () => {
  try {
    const backgroundCanvas = await renderStaticLayers(layersData)
    frontRendersCanvas = await renderStaticLayers(frontRendersLayersData)
    if (!backgroundCanvas) {
      console.error('Failed to create the background canvas')
      return
    }

    animate(backgroundCanvas)
  } catch (error) {
    console.error('Error during rendering:', error)
  }
}

startRendering()

