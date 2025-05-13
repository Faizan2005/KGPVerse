import Phaser from 'phaser';

let npcList = []; // Stores NPC IDs
let npcSprites = new Map();
let npcDirections = new Map();
let npcGroup;

const ws = new WebSocket("ws://localhost:3333/ws")
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false, // set to false if you don't want collision boxes
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

let player;

function preload() {
    this.load.tilemapTiledJSON('citymap', 'assets/maps/dummy.json'); 
    this.load.image('citytiles', 'assets/maps/city.png');
    this.load.spritesheet('player', 'assets/sprite.png', {
        frameWidth: 16,
        frameHeight: 16
    });
}

function create() {
    // Create the map
    const map = this.make.tilemap({ key: 'citymap' });
    this.map = map;
    const tileset = map.addTilesetImage('city', 'citytiles');

    // Create layers
    const backgroundLayer = map.createLayer('background', tileset, 0, 0);
    const overlayLayer = map.createLayer('overlay', tileset, 0, 0);
    const objectsLayer = map.createLayer('objects', tileset, 0, 0);
    const frontLayer = map.createLayer('front', tileset, 0, 0);

    // Apply collision to overlay and objects layers
    overlayLayer.setCollisionByProperty({ collide: true });
    objectsLayer.setCollisionByProperty({ collide: true });

    // Set world bounds to match the map size
    const mapWidth = map.widthInPixels;
    const mapHeight = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    const matchingTiles = overlayLayer.getTilesWithin(0, 0, map.width, map.height)
        .filter(tile => tile.index === 308);

    if (!matchingTiles.length) {
        console.error("No walkable tiles with index 308 found.");
        return; // or handle fallback spawn logic
    }

    const spawnTile = Phaser.Utils.Array.GetRandom(matchingTiles);
    const worldX = spawnTile.getCenterX();
    const worldY = spawnTile.getCenterY();
  
    player = this.physics.add.sprite(worldX, worldY, 'player');
    player.setCollideWorldBounds(true);
    player.setScale(2); // Scale up to 32px x 32px

    // Set depth for rendering order
    backgroundLayer.setDepth(0);
    overlayLayer.setDepth(1);
    objectsLayer.setDepth(2);
    player.setDepth(3);
    frontLayer.setDepth(4);

    // Enable collision between player and layers
    this.physics.add.collider(player, overlayLayer);
    this.physics.add.collider(player, objectsLayer);

    // Camera follow
    this.cameras.main.startFollow(player);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Create animations
    this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk-left',
        frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Create NPC group with physics
    npcGroup = this.physics.add.group({
        bounceX: 0,
        bounceY: 0,
        collideWorldBounds: true
    });

    // Store layer references for later use
    this.overlayLayer = overlayLayer;
    this.objectsLayer = objectsLayer;

    // Add colliders for the NPC group
    this.physics.add.collider(npcGroup, overlayLayer);
    this.physics.add.collider(npcGroup, objectsLayer);
    this.physics.add.collider(npcGroup, player);
    this.physics.add.collider(npcGroup, npcGroup); // NPCs collide with each other

    this.input.keyboard.on('keydown-P', () => {
        const id = crypto.randomUUID(); // Or use any random ID gen you like
        npcList.push(id);
        spawnNPC.call(this, id);
    });
    
    this.input.keyboard.on('keydown-Q', () => {
        const id = npcList.pop();
        if (id && npcSprites.has(id)) {
            npcSprites.get(id).destroy();
            npcSprites.delete(id);
        }
    });
}

function spawnNPC(id) {
    const overlayLayer = this.map.getLayer('overlay').tilemapLayer;

    const matchingTiles = overlayLayer.getTilesWithin(0, 0, this.map.width, this.map.height)
        .filter(tile => tile.index === 308);

    if (!matchingTiles.length) {
        console.warn("No valid spawn tiles found.");
        return;
    }

    const spawnTile = Phaser.Utils.Array.GetRandom(matchingTiles);
    
    // Create the NPC sprite
    const npc = this.physics.add.sprite(
        spawnTile.getCenterX(),
        spawnTile.getCenterY(),
        'player'
    );

    // Set up physics body
    npc.body.setSize(16, 16); // Match collision box to sprite size
    npc.setScale(2);
    npc.setDepth(3);
    npc.setCollideWorldBounds(true);
    npc.setBounce(0);
    
    // Add to physics group
    npcGroup.add(npc);

    // Store NPC references
    npcSprites.set(id, npc);
    npcDirections.set(id, {
        direction: 'right',
        steps: 0
    });

    // Add specific colliders for this NPC
    this.physics.add.collider(npc, this.overlayLayer);
    this.physics.add.collider(npc, this.objectsLayer);
    this.physics.add.collider(npc, player);
}

ws.onopen = function (event) {
    alert('You are Connected to WebSocket Server');
};

function nextDirection(current) {
    const order = ['right', 'down', 'left', 'up'];
    const index = (order.indexOf(current) + 1) % order.length;
    return order[index];
}

function update() {
    const npcSpeed = 50; // pixels per second
    const maxSteps = 64; // how far in one direction before turning (in pixels)

    npcList.forEach(id => {
        const npc = npcSprites.get(id);
        const data = npcDirections.get(id);
        if (!npc || !data) return;

        // Reset velocity
        npc.body.setVelocity(0);

        // Set velocity and animation based on direction
        switch (data.direction) {
            case 'right': 
                npc.body.setVelocityX(npcSpeed);
                npc.anims.play('walk-right', true);
                break;
            case 'down':  
                npc.body.setVelocityY(npcSpeed);
                npc.anims.play('walk-down', true);
                break;
            case 'left':  
                npc.body.setVelocityX(-npcSpeed);
                npc.anims.play('walk-left', true);
                break;
            case 'up':    
                npc.body.setVelocityY(-npcSpeed);
                npc.anims.play('walk-up', true);
                break;
        }

        // Update steps
        data.steps += npcSpeed * (1 / 60);

        // Change direction when max steps reached
        if (data.steps >= maxSteps) {
            data.steps = 0;
            data.direction = nextDirection(data.direction);
            // Stop animation when changing direction
            npc.anims.stop();
        }
    });

    const speed = 160;
    player.body.setVelocity(0);

    let isMoving = false;

    // Horizontal movement
    if (this.cursors.left.isDown) {
        player.body.setVelocityX(-speed);
        isMoving = true;
    } else if (this.cursors.right.isDown) {
        player.body.setVelocityX(speed);
        isMoving = true;
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
        player.body.setVelocityY(-speed);
        isMoving = true;
    } else if (this.cursors.down.isDown) {
        player.body.setVelocityY(speed);
        isMoving = true;
    }

    // Normalize and scale the velocity so diagonal movement isn't faster
    player.body.velocity.normalize().scale(speed);

    // Set animations based on direction
    if (this.cursors.left.isDown) {
        player.anims.play('walk-left', true);
    } else if (this.cursors.right.isDown) {
        player.anims.play('walk-right', true);
    } else if (this.cursors.up.isDown) {
        player.anims.play('walk-up', true);
    } else if (this.cursors.down.isDown) {
        player.anims.play('walk-down', true);
    } else {
        player.anims.stop();
    }

    // Log coordinates
    if (isMoving && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            'x': player.x,
            'y': player.y,
            'name': player.name
        }));
        console.log(`Player Position: x=${player.x}, y=${player.y}`);
    }
}
