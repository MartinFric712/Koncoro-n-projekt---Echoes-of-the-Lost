const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
c.imageSmoothingEnabled = false
const dpr = window.devicePixelRatio || 1

canvas.width = 1024 * dpr
canvas.height = 576 * dpr

const layersData = {
   l_Ground: l_Ground,
   l_Fence: l_Fence,
   l_Enviroment: l_Enviroment,
   l_Decorations: l_Decorations,
   l_Steps: l_Steps,
   l_Buildnigs: l_Buildnigs,
   l_Roof: l_Roof,
};

const tilesets = {
  l_Ground: { imageUrl: './images/terrain.png', tileSize: 16, animations: [] },
  l_Fence: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Enviroment: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Decorations: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Steps: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Buildnigs: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
  l_Roof: { imageUrl: './images/decorations.png', tileSize: 16, animations: [] },
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

