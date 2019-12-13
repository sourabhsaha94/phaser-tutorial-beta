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
var PLAYER_GRAVITY_Y = 500;

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

    // console.log(this);
    this.add.image(400,300,'sky');

// platform
    ground = this.physics.add.staticGroup();
    ground.create(400, 568, 'ground').setScale(2).refreshBody();

    platforms = this.physics.add.staticGroup();
    platforms.create(600,400,'ground');
    platforms.create(50,350,'ground');
    platforms.create(750,220,'ground');

// stars
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX:70 }
    });
    stars.children.iterate(function (child) {
        createStar(child);
    });

// bomb
    bombs = this.physics.add.group();

// player
    player = this.physics.add.sprite(PLAYER_START_X,PLAYER_START_Y,'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.body.setGravityY(PLAYER_GRAVITY_Y);
//reduce collision box size to have more realistic collisions
    player.body.setSize(player.getBounds().width-5, player.getBounds().height-5);

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
    this.physics.add.collider(player,ground);
    this.physics.add.collider(stars, ground);
    this.physics.add.collider(bombs, ground);
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, bombs, hitBomb, null, this);

// input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', restartGame, this);
    this.input.keyboard.on('keydown-D', restartGame, this); // debug to restart the scene

// score
    scoreText = this.add.text(16, 16, 'Score: 0\nCollect the starts and avoid the Bombs!', {fontSize: '32px', fill: '#000'});
    gameOver = false;

// create the Bomb
    createBomb(player);
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
            createStar(child);
        });

       createBomb(player);
    }
}

// helper function to create bomb
function createBomb (Player)
{
     var x = (Player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0,400);

    var bomb = bombs.create(x, 16, 'bomb');
    bomb.setBounce(1);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
}

// helper function to create star
function createStar (Star)
{
    Star.setVelocity(Phaser.Math.FloatBetween(-200,200));
    Star.setBounce(1);
    Star.setCollideWorldBounds(true); 
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
    if (gameOver || event.key === "d") 
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