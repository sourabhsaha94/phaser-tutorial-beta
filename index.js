var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y:300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var score = 0, scoreText;
var gameOver;
var PLAYER_VELOCITY_X = 250;
var PLAYER_VELOCITY_Y = 500;
var PLAYER_START_X = 100;
var PLAYER_START_Y = 450;

// preloads the assets with key-value pairing
function preload ()
{
    this.load.image('sky','./assets/sky.png');
    this.load.image('ground','./assets/platform.png');
    this.load.image('star','./assets/star.png');
    this.load.image('bomb','./assets/bomb.png');
    this.load.spritesheet('dude','./assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );  
}

// creates the scene, run only once
function create ()
{
    this.add.image(400,300,'sky');

// platform
    platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    platforms.create(600,400,'ground');
    platforms.create(50,250,'ground');
    platforms.create(750,220,'ground');

// stars
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX:70 }
    });
    stars.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.4,0.8));
    });

// bomb
    bombs = this.physics.add.group();

// player
    player = this.physics.add.sprite(PLAYER_START_X,PLAYER_START_Y,'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.body.setGravityY(300);

// animations
    this.anims.create({
        key:'left',
        frames: this.anims.generateFrameNumbers('dude',{start: 0, end: 3}),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{key:'dude',frame: 4}],
        frameRate: 20
    });

    this.anims.create({
        key:'right',
        frames: this.anims.generateFrameNumbers('dude',{start: 5, end: 8}),
        frameRate: 10,
        repeat: -1
    });

// colliders
    this.physics.add.collider(player,platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, bombs, hitBomb, null, this);

// input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', restartGame, this);

// score
    scoreText = this.add.text(16, 16, 'Score: 0', {fontSize: '32px', fill: '#000'});
    gameOver = false;
}

// callback to execute when star is collected
function collectStar (player, star)
{
    star.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);

    if(stars.countActive(true) === 0)
    {
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true,true);
        });

        var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0,400);

        var bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

// callback to execute when bomb is touched
function hitBomb (player, bomb)
{
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    gameOver = true;
}

// callback to restart the game
function restartGame (event){
    if (gameOver) 
    {
        score = 0;
        this.scene.restart();
    }
}

// update loop [Main game loop]
function update ()
{
    if (cursors.left.isDown)
    {
        player.setVelocityX(-PLAYER_VELOCITY_X);
        player.anims.play('left', true);
    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(PLAYER_VELOCITY_X);
        player.anims.play('right', true);
    }
    else
    {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down)
    {
        player.setVelocityY(-PLAYER_VELOCITY_Y);
    }

    if (gameOver === true)
    {
        scoreText.setText('Final Score is ' + score + ' Press R to Restart');
    }
}