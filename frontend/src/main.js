import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
    this.load.tilemapTiledJSON('citymap', 'assets/maps/city.json');
    this.load.image('citytiles', 'assets/maps/city.png');
    this.load.spritesheet('player', 'assets/maps/player.png', {
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
    const treeLayer = map.createLayer('trees', tileset, 0, 0);

    // Apply collision ONLY on background
    backgroundLayer.setCollisionByProperty({ collide: true });

    // Create player sprite
    player = this.physics.add.sprite(100, 100, 'player');
    player.setCollideWorldBounds(true);

    // Set depth for rendering order
    backgroundLayer.setDepth(0); // Background at depth 0
    player.setDepth(10);          // Player at depth 1
    treeLayer.setDepth(20);       // Trees at depth 2

    // Enable collision between player and background
    this.physics.add.collider(player, backgroundLayer);

    // Optional: camera follow
    this.cameras.main.startFollow(player);

    // Input for movement
    this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    const speed = 160;
    player.body.setVelocity(0);

    let isMoving = false; // Flag to check if the player is moving

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

    // Log the player's position if moving
    if (isMoving) {
        console.log(`Player Position: x=${player.x}, y=${player.y}`);
    }
}
