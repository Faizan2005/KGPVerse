import Phaser from 'phaser';

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

    // Create player at a random walkable tile
    const spawnTile = overlayLayer.findByIndex(112); // Assuming 112 is a walkable tile
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
}

ws.onopen = function (event) {
    alert('You are Connected to WebSocket Server');
};

function update() {
    const speed = 160;
    player.body.setVelocity(0);

    if (this.cursors.left.isDown) {
        player.body.setVelocityX(-speed);
        player.anims.play('walk-left', true);
    } else if (this.cursors.right.isDown) {
        player.body.setVelocityX(speed);
        player.anims.play('walk-right', true);
    } else if (this.cursors.up.isDown) {
        player.body.setVelocityY(-speed);
        player.anims.play('walk-up', true);
    } else if (this.cursors.down.isDown) {
        player.body.setVelocityY(speed);
        player.anims.play('walk-down', true);
    } else {
        player.anims.stop();
    }

    // Normalize diagonal movement
    player.body.velocity.normalize().scale(speed);

    if (isMoving) {
        ws.send(JSON.stringify({'x': player.x, 'y': player.y, 'name': player.name}));
        console.log(`Player Position: x=${player.x}, y=${player.y}`);
    }
}
