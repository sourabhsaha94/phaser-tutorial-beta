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
var score = 0, previousScore = 0, globalScore = 0, scoreText, timerText;
var gameOver;
var PLAYER_VELOCITY_X = 250;
var PLAYER_VELOCITY_Y = 500;
var PLAYER_START_X = 400;
var PLAYER_START_Y = 500;
var PLAYER_GRAVITY_Y = 1000;
var PLATFORM_SPEED = 100;
var jump = false;
var JUMP_TIMER = 0;
var specialStarTimer;
var GOD_MODE = false;
var SLOW_TIME = false;

// preloads the assets with key-value pairing
function preload ()
{
    this.load.image('sky','./assets/sky.png');
    this.load.image('ground','./assets/brown_platform.png');
    this.load.image('star','./assets/star.png');
    this.load.image('bomb','./assets/bomb.png');
    this.load.spritesheet('dude','./assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );
    this.load.audio('background','./assets/soundtrack.mp3');  
    this.load.audio('jumpSound2','./assets/Jump_01.mp3');
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
        createStar(child);
    }, this);

    specialStars = this.physics.add.group();

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

// tween
    timerTween = this.tweens.addCounter({
        from: 5,
        to: 0,
        duration: 5000,
        paused: true,
        repeat: 0,
        onComplete: normalTime,
        onCompleteScope: this
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

// timer
    timerText = this.add.text(700, 16, '', {fontSize: '32px', fill: '#000'});

    $.ajax({
        url: "https://keyvalue.immanuel.co/api/KeyVal/GetValue/"+SCORE_BUCKET_SECRET_KEY+"/globalScore",
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

// create random star per level
    specialStarTimer = this.time.addEvent({
        delay: 8000,
        callback: createSpecialStar,
        callbackScope: this,
        loop: true
    });
    specialStarTimer.paused = false;
}

function worldCollideCallback (gameObject, up, down, left, right)
{
    if(down && !GOD_MODE)
    {
        gameObject.world.scene.physics.pause();
        gameObject.gameObject.setTint(0xff0000);
        gameObject.gameObject.anims.play('turn');
        gameOver = true;
        death_sound.play({volume: 0.5});
        addScoreToLeaderBoard(score);
        specialStarTimer.paused = true;
        timerTween.remove();
        timerText.destroy();
    }
    else if(down && GOD_MODE)
    {
        gameObject.gameObject.body.velocity.y = -PLAYER_VELOCITY_Y;
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
        specialStarTimer.paused = true;
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
        // if (GOD_MODE)
        // {    
        //     GOD_MODE = false;
        //     player.clearTint();
        //     bombs.children.iterate(function(child){
        //         child.setAlpha(1);
        //     })
        // }
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true,true);
            createStar(child);
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
    var x = (Player.x < 400) ? Phaser.Math.Between(700, 800) : Phaser.Math.Between(0,100);
    var y = (Player.y < 300) ? Phaser.Math.Between(700, 800) : Phaser.Math.Between(0,100);
    var bomb = bombs.create(x, y, 'bomb');
    bomb.setDisplaySize(20,20);
    bomb.body.allowGravity = false;
    bomb.setBounce(0.9);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.RND.sign()*Phaser.Math.RND.integerInRange(100,200));
    if(GOD_MODE){
        bomb.setAlpha(0.3);
    }
}

// helper function to create star
function createStar (Star)
{
    Star.body.allowGravity = false;
    Star.setVelocity(Phaser.Math.RND.sign()*Phaser.Math.RND.integerInRange(100,200));
    Star.setBounce(0.9);
    Star.setCollideWorldBounds(true);
}

// callback to create special star
function createSpecialStar ()
{
    var specialStar = specialStars.create(Phaser.Math.RND.integerInRange(10,700),Phaser.Math.RND.integerInRange(5,50),'star');
    specialStar.body.allowGravity = false;
    specialStar.setVelocity(Phaser.Math.RND.sign()*Phaser.Math.RND.integerInRange(100,200));
    specialStar.setBounce(0.9);
    specialStar.setCollideWorldBounds(true);
    this.physics.add.collider(platforms, specialStar);
    this.physics.add.overlap(player, specialStar, collectStar, null, this);

    let powerUpProbability = Phaser.Math.RND.integerInRange(1,3);

    switch(powerUpProbability){
        case 1:
            specialStar.setTint(GREEN_TINT);
            specialStar.setData("powerUp","SLOW_TIME");
        break;
        case 2:
            specialStar.setTint(RED_TINT);
            specialStar.setData("powerUp","GOD_MODE");
        break;
        case 3:
            specialStar.setTint(BLACK_TINT);
            specialStar.setData("powerUp","SUPER_STAR");
            specialStar.setVelocity(Phaser.Math.RND.sign()*300);
        break;
    }

    var tween = this.tweens.add({
        targets: specialStar,
        paused: false,
        callbackScope: this,
        delay: 7000,
        duration: 3000,
        ease: 'Elastic',
        yoyo: false,
        alpha: { from: 1, to: 0},
        onComplete: function() {
            tween.remove();
            specialStar.disableBody(true,true);
        },
        onCompleteScope: this
    });
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
    // adjust the collider box to be inline with the platform sprite
    // see with config.physics.arcade.debug = true
    Platform.body.setSize(400, Platform.getBounds().height-15);
    Platform.body.setOffset(5, 0);
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
        specialStarTimer.paused = true;
        timerTween.remove();
        timerText.destroy();
    }
}

// helper function for god mode
function enableGodMode (context)
{
    GOD_MODE = true;
    let playerTint = player.tintTopLeft;
    player.setTint(GOLDEN_TINT);
    bombs.children.iterate(function (child){
        child.setAlpha(0.3);
    });
    var tweenGodMode = context.tweens.add({
        targets: player,
        paused: false,
        delay: 7000,
        duration: 3000,
        ease: 'Elastic',
        tint: { from: GOLDEN_TINT, to: playerTint},
        onComplete: function() {
            GOD_MODE = false;
            tweenGodMode.remove();
            bombs.children.iterate(function (child){
                child.clearAlpha();
            });
        },
        onCompleteScope: this
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

    specialStars.children.iterate(function (child) {
        child.setData("slowDown",true);
        child.body.velocity.x /= 5;
        child.body.velocity.y /= 5;
    });
    
    background_sound.setRate(0.5);
    timerTween.play();
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

    specialStars.children.iterate(function (child) {
        if(child.getData("slowDown"))
        {
            child.body.velocity.x *= 5;
            child.body.velocity.y *= 5;
        }
        child.setData("slowDown",false);
    });

    timerText.setText('');
    timerTween.stop();
    specialStarTimer.paused = false;
    background_sound.setRate(1);
}

// callback to disable super star
function disableSuperStar (Star)
{
    Star.disableBody(true,true);
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
            url: "https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/"+SCORE_BUCKET_SECRET_KEY+"/globalScore/" + globalScore,
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

    if (SLOW_TIME){
        timerText.setText(timerTween.getValue());
    }
}