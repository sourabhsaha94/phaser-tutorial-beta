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

const SCORE_BUCKET_SECRET_KEY = "337gu3nb";
var game = new Phaser.Game(config);
var score = 0, previousScore = 0, globalScore = 0, scoreText;
var gameOver;
var PLAYER_VELOCITY_X = 250;
var PLAYER_VELOCITY_Y = 500;
var PLAYER_START_X = 400;
var PLAYER_START_Y = 500;
var PLAYER_GRAVITY_Y = 1000;
var jump = false;
var JUMP_TIMER = 0;


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
    platforms = this.physics.add.group();
    platforms.create(400, 568, 'ground');
    platforms.create(50,350,'ground');
    platforms.create(350,150,'ground');
    platforms.create(750,220,'ground');
    platforms.children.iterate(function (child) {
        createPlatform(child);
    });

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
    this.physics.add.collider(player,platforms, matchPlatformSpeed, null, this);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, bombs, hitBomb, null, this);

// input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-R', restartGame, this);
    this.input.keyboard.on('keydown-D', restartGame, this); // debug to restart the scene

// score
    scoreText = this.add.text(16, 16, 'Score: 0\nCollect the starts and avoid the Bombs!', {fontSize: '18px', fill: '#000'});
    gameOver = false;

    $.ajax({
        url: "https://keyvalue.immanuel.co/api/KeyVal/GetValue/337gu3nb/globalScore",
        type: "GET",
        success: updateGlobalScore,
        error: function (error) {
            console.log ("Error getting score");
        }
    });

// create the Bomb
    createBomb(player);
}

function updateGlobalScore (result)
{
    globalScore = result;
}

// callback to execute when star is collected
function collectStar (player, star)
{
    star.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score + '\tLast Score: ' + previousScore + '\tGlobal Highscore: ' + globalScore);
    if(stars.countActive(true) === 0)
    {
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true,true);
            createStar(child);
        });

       createBomb(player);
    }
}

// callback to match speed of player and platform
function matchPlatformSpeed (player, platform)
{
    player.body.velocity.x = platform.body.velocity.x;
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

// helper function to create moving platform
function createPlatform (Platform)
{
    Platform.body.allowGravity = false;
    Platform.body.setImmovable(true);
    Platform.body.setBounceX(1);
    Platform.body.setCollideWorldBounds(true);
    Platform.displayWidth = Phaser.Math.FloatBetween(100,300);
    Platform.body.setVelocityX(Phaser.Math.FloatBetween(10,100));
}

// callback to execute when bomb is touched
function hitBomb (player, bomb)
{
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    gameOver = true;
    addScoreToLeaderBoard(score);
}

// callback to restart the game
function restartGame (event)
{
    if (gameOver || event.key === "d") 
    {
        score = 0;
        this.scene.restart();
    }
}

function addScoreToLeaderBoard (Score)
{
    previousScore = score;
    if (score > globalScore)
    {
        globalScore = score;
        $.ajax({
            url: "https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/337gu3nb/globalScore/" + globalScore,
            type: "POST",
            success: function (data) {
                console.log ("Updated successfully");
            },
            error: function (error) {
                console.log ("Error getting score");
            }
        });
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
        player.anims.play('turn');
    }

    if (cursors.up.isDown)
    {
        jump = true;
    }

    if (player.body.touching.down)
    {
        JUMP_TIMER = this.time.now;
    }

    if (jump && this.time.now - JUMP_TIMER < 400)
    {
        player.setVelocityY(-PLAYER_VELOCITY_Y);
    }
    else
    {
        jump = false;
    }

    if (cursors.up.isUp)
    {
        jump = false;
    }          

    if (gameOver === true)
    {
        scoreText.setText('Final Score is ' + score + ' Press R to Restart');
    }
}