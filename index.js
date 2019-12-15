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
const GREEN_TINT = 0x339cff;
const RED_TINT = 0xff3368;
const GOLDEN_TINT = 0xfcff33;
const BLACK_TINT = 0x000000;

var background_sound, jump_sound, collectStar_sound, death_sound;
var game = new Phaser.Game(config);
var score = 0, previousScore = 0, globalScore = 0, scoreText;
var gameOver;
var PLAYER_VELOCITY_X = 250;
var PLAYER_VELOCITY_Y = 500;
var PLAYER_START_X = 400;
var PLAYER_START_Y = 500;
var PLAYER_GRAVITY_Y = 1000;
var PLATFORM_SPEED = 100;
var PLATFORM_SPEED_SLOW = 10;
var jump = false;
var JUMP_TIMER = 0;
var GOD_MODE = false;
var SLOW_TIME = false;


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
    this.load.audio('background','./assets/soundtrack.mp3');  
    this.load.audio('jumpSound1','./assets/Jump_00.mp3');
    this.load.audio('jumpSound2','./assets/Jump_01.mp3');
    this.load.audio('jumpSound3','./assets/Jump_02.mp3');
    this.load.audio('jumpSound4','./assets/Jump_03.mp3');
    this.load.audio('collectStarSound','./assets/Collect_Point_00.mp3');
    this.load.audio('heroDeathSound','./assets/Hero_Death_00.mp3');
}

// creates the scene, run only once
function create ()
{

// console.log(this);
    this.add.image(400,300,'sky');

// platform
    platforms = this.physics.add.group();
    platforms.create(400, 588, 'ground');
    platforms.create(50,370,'ground');
    platforms.create(350,200,'ground');
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
        createStar(child, this);
    }, this);

// bomb
    bombs = this.physics.add.group();

// player
    player = this.physics.add.sprite(PLAYER_START_X,PLAYER_START_Y,'dude');
    player.setBounce(0.2);
    player.body.collideWorldBounds = true;
    player.body.onWorldBounds = true;
    player.body.setGravityY(PLAYER_GRAVITY_Y);
//reduce collision box size to have more realistic collisions
    player.setSize(player.getBounds().width-25, player.getBounds().height-10);

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
    this.physics.world.on('worldbounds', worldCollideCallback);

// input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown', restartGame, this);
    this.input.keyboard.on('keydown-UP', playJumpSound, this);

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
    SLOW_TIME = false;
    GOD_MODE = false;

// cue music
    background_sound = this.sound.add('background');
    background_sound.play({ volume: 0.5, loop: true});
    collectStar_sound = this.sound.add('collectStarSound');
    jump_sound = this.sound.add('jumpSound2');
    death_sound = this.sound.add('heroDeathSound');
}

function worldCollideCallback (gameObject, up, down, left, right)
{
    if(down)
    {
        gameObject.world.scene.physics.pause();
        gameObject.gameObject.setTint(0xff0000);
        gameObject.gameObject.anims.play('turn');
        gameOver = true;
        death_sound.play({volume: 0.5});
        addScoreToLeaderBoard(score);
    }
}

// callback to play jump sound
function playJumpSound ()
{
    jump_sound.play({volume: 0.2});
}

function updateGlobalScore (result)
{
    globalScore = result;
}

// callback to execute when star is collected
function collectStar (player, star)
{
    star.disableBody(true, true);
    collectStar_sound.play({volume: 0.4});   
    if(!GOD_MODE && star.getData("powerUp") === "GOD_MODE")
    {
        enableGodMode(this);
    }
    else if(!SLOW_TIME && star.getData("powerUp") === "SLOW_TIME")
    {
        slowTime(this);
    }

    if (star.getData("powerUp") === "SUPER_STAR")
    {
        score += 20;
    }

    score += 10;
    scoreText.setText('Score: ' + score + '\tLast Score: ' + previousScore + '\tGlobal Highscore: ' + globalScore);

    // level over
    if(stars.countActive(true) === 0)
    {
        if (SLOW_TIME)
        {
            normalTime();
        }
        if (GOD_MODE)
        {    
            disableGodMode();
        }
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true,true);
            createStar(child, this);
        }, this);
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
    bomb.body.allowGravity = false;
    bomb.setBounce(0.9);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.RND.sign()*Phaser.Math.RND.integerInRange(100,200));
}

// helper function to create star
function createStar (Star, context)
{
    Star.body.allowGravity = false;
    Star.setVelocity(Phaser.Math.RND.sign()*Phaser.Math.RND.integerInRange(100,200));
    Star.setBounce(0.9);
    Star.setCollideWorldBounds(true);

    let powerUpProbability = Phaser.Math.RND.integerInRange(1,25);

    if (powerUpProbability === 5)
    {
        Star.setTint(GREEN_TINT);
        Star.setData("powerUp","SLOW_TIME");
    }
    else if (powerUpProbability === 6)
    {
        Star.setTint(RED_TINT);
        Star.setData("powerUp","GOD_MODE");
    }
    else if (powerUpProbability === 7)
    {
        Star.setTint(BLACK_TINT);
        Star.setData("powerUp","SUPER_STAR");
        Star.setVelocity(Phaser.Math.RND.sign()*300);
        context.time.delayedCall(10000, disableSuperStar, null, context);
    }
}

// helper function to create moving platform
function createPlatform (Platform, movable)
{
    Platform.body.allowGravity = false;
    Platform.body.setImmovable(true);
    Platform.body.setBounceX(1);
    Platform.body.setCollideWorldBounds(true);
    Platform.displayWidth = 350;
    Platform.body.setVelocityX(Phaser.Math.RND.sign()*PLATFORM_SPEED);
}

// callback to execute when bomb is touched
function hitBomb (player, bomb)
{
    if(!GOD_MODE)
    {
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play('turn');
        gameOver = true;
        death_sound.play({volume: 0.5});
        addScoreToLeaderBoard(score);
    }
}

// helper function for god mode
function enableGodMode (context)
{
    GOD_MODE = true;
    player.setTint(GOLDEN_TINT);
    bombs.children.iterate(function (child){
        child.setAlpha(0.2);
    });
    context.time.delayedCall(5000, disableGodMode);
}

// helper function to disable god mode
function disableGodMode ()
{
    GOD_MODE = false;
    player.clearTint();
    bombs.children.iterate(function (child){
        child.clearAlpha();
    });
}

// helper function to slow time
function slowTime (context)
{

    SLOW_TIME = true;

    stars.children.iterate(function (child) {
        child.setData("slowDown",true);
        child.body.velocity.x /= 5;
        child.body.velocity.y /= 5;
    });

    bombs.children.iterate(function (child) {
        child.setData("slowDown",true);
        child.body.velocity.x /= 5;
        child.body.velocity.y /= 5;
    });

    platforms.children.iterate(function (child) {
        child.setData("slowDown",true);
        child.body.velocity.x /= 5;
        child.body.velocity.y /= 5;
    });
    
    background_sound.setRate(0.5);
    context.time.delayedCall(5000, normalTime);
}

// helper function to normal time
function normalTime ()
{
    SLOW_TIME = false;

    stars.children.iterate(function (child) {
        if(child.getData("slowDown"))
        {
            child.body.velocity.x *= 5;
            child.body.velocity.y *= 5;
        }
        child.setData("slowDown",false);
    });

    bombs.children.iterate(function (child) {
        if(child.getData("slowDown"))
        {
            child.body.velocity.x *= 5;
            child.body.velocity.y *= 5;
        }
        child.setData("slowDown",false);
    });

    platforms.children.iterate(function (child) {
        if(child.getData("slowDown"))
        {
            child.body.velocity.x *= 5;
            child.body.velocity.y *= 5;
        }
        child.setData("slowDown",false);
    });

    background_sound.setRate(1);
}

// callback to disable super star
function disableSuperStar ()
{
    stars.children.iterate(function(child) {
        if (child.active && child.getData("powerUp") === "SUPER_STAR"){
            child.disableBody(true,true);
        }
    });
}


// callback to restart the game
function restartGame (event)
{
    if (gameOver) 
    {
        score = 0;
        background_sound.stop();
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
        background_sound.stop();
        scoreText.setText('Final Score is ' + score + ' Press Any Key to Restart\t' + 'Global Highscore: ' + globalScore);
    }
}