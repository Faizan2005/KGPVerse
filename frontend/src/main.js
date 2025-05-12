import Phaser from 'phaser';

const ws = new WebSocket("ws://localhost:3333/ws")
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true, // set to false if you don't want collision boxes
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
    this.load.tilemapTiledJSON('citymap', 'assets/maps/map.json');
    this.load.image('citytiles', 'assets/maps/city.png');
    this.load.spritesheet('player', 'assets/red_dot.png', {
        frameWidth: 32,
        frameHeight: 32
    });
}

function create() {
    // Create the map
    const map = this.make.tilemap({ key: 'citymap' });
    const tileset = map.addTilesetImage('city', 'citytiles');

    // Create layers
    const backgroundLayer = map.createLayer('background', tileset, 0, 0);

    // Apply collision to tiles that have "collide: true" set in Tiled
    backgroundLayer.setCollisionByProperty({ collide: true });

      // Only allow tile ID 112 to be a valid walkable tile
    const walkableTileId = 112;
    const walkableTiles = [];
    backgroundLayer.forEachTile(tile => {
        if (tile.index === walkableTileId) {
            walkableTiles.push(tile);
        }
    });

    if (!walkableTiles.length) {
        console.error(`No walkable tiles with ID ${walkableTileId} found!`);
        return;
    }

    // Pick a random walkable tile
    const spawnTile = Phaser.Utils.Array.GetRandom(walkableTiles);
    const worldX = spawnTile.getCenterX();
    const worldY = spawnTile.getCenterY();

    // Create player at random walkable tile
    player = this.physics.add.sprite(worldX, worldY, 'player');
    player.setCollideWorldBounds(true);

    // Set depth for rendering order
    backgroundLayer.setDepth(0);
    player.setDepth(10);

    // Enable collision between player and background
    this.physics.add.collider(player, backgroundLayer);

    // Camera follow
    this.cameras.main.startFollow(player);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
}

ws.onopen = function (event) {
    alert('You are Connected to WebSocket Server');
};

function update() {
    const speed = 160;
    player.body.setVelocity(0);

    let isMoving = false;

    if (this.cursors.left.isDown) {
        player.body.setVelocityX(-speed);
        isMoving = true;
    } else if (this.cursors.right.isDown) {
        player.body.setVelocityX(speed);
        isMoving = true;
    }

    if (this.cursors.up.isDown) {
        player.body.setVelocityY(-speed);
        isMoving = true;
    } else if (this.cursors.down.isDown) {
        player.body.setVelocityY(speed);
        isMoving = true;
    }

    // Normalize diagonal movement
    player.body.velocity.normalize().scale(speed);

    if (isMoving) {
        ws.send(JSON.stringify({'x': player.x, 'y': player.y, 'name': player.name}));
        console.log(`Player Position: x=${player.x}, y=${player.y}`);
    }
}
