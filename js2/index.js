const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
c.imageSmoothingEnabled = false
const dpr = window.devicePixelRatio || 1

canvas.width = 1024 * dpr
canvas.height = 576 * dpr

const layersData = {
   l_terrain_layer_1: l_terrain_layer_1,
   l_2: l_2,
   l_3: l_3,
   l_4: l_4,
   l_5: l_5,
   l_6: l_6,
   l_7: l_7,
   l_8: l_8,
   l_9: l_9,
   l_10: l_10,
   l_11: l_11,
   l_12: l_12,
   l_13: l_13,
   l_14: l_14,
   l_15: l_15,
   l_16: l_16,
   l_17: l_17,
   l_18: l_18,
   l_19: l_19,
};

const tilesets = {
  l_terrain_layer_1: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_2: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_3: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_4: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_5: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_6: { imageUrl: './images/characters.png', tileSize: 16, animations: [] },
  l_7: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_8: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_9: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_10: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_11: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_12: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_13: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_14: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_15: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_16: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_17: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_18: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_19: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
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

const renderStaticLayers = async () => {
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
function animate(backgroundCanvas) {
  // Calculate delta time
  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime

  // Update player position
  player.handleInput(keys)
  player.update(deltaTime, collisionBlocks)

  // Render scene
  c.save()
  c.scale(dpr, dpr)
  c.clearRect(0, 0, canvas.width, canvas.height)
  c.drawImage(backgroundCanvas, 0, 0, mapWidthPx, mapHeightPx)
  drawAnimatedTiles(c, currentTime)
  player.draw(c)
  c.restore()

  requestAnimationFrame(() => animate(backgroundCanvas))
}

const startRendering = async () => {
  try {
    const backgroundCanvas = await renderStaticLayers()
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

