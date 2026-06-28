(function () {
  function boot(opts) {
    opts = opts || {};
    const container = opts.container || "game-container";

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: container,
      pixelArt: true,
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 } }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      },
      scale: { mode: Phaser.Scale.RESIZE }
    };

    return new Phaser.Game(config);
  }

  function preload() {
    // Tileset used by the focused demo map
    this.load.image("CuteRPG_Field_B", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Field_B.png");

    // Focused demo tilemap
    this.load.tilemapTiledJSON("map", "/static/assets/the_ville/visuals/focused_demo.json");

    // Player atlas
    this.load.atlas("atlas", "/static/assets/characters/Yuriko_Yamamoto.png", "/static/assets/characters/atlas.json");
  }

  function create() {
    const map = this.make.tilemap({ key: "map" });

    const fieldB = map.addTilesetImage("CuteRPG_Field_B", "CuteRPG_Field_B");

    // Layers from focused_demo.json
    const groundLayer = map.createLayer("Ground", fieldB, 0, 0);
    const buildingsLayer = map.createLayer("Buildings", fieldB, 0, 0);
    const decorationLayer = map.createLayer("Decoration", fieldB, 0, 0);

    groundLayer.setDepth(0);
    buildingsLayer.setDepth(1);
    decorationLayer.setDepth(2);

    // Fire glow overlay on the burning house (left side)
    const fireEmitter = this.add.particles("atlas", {
      frame: "down",
      x: 288,
      y: 560,
      speed: { min: -30, max: 30 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      frequency: 80,
      tint: [0xff5500, 0xffaa00],
      blendMode: "ADD",
    });
    fireEmitter.setDepth(2);

    const SPAWN = { x: 800, y: 640 };

    // Player sprite — visible above ground (depth 1), below foreground decoration (depth 2)
    const player = this.physics.add
      .sprite(SPAWN.x, SPAWN.y, "atlas", "down")
      .setSize(30, 40)
      .setOffset(0, 0);
    player.setDepth(1);
    player.setCollideWorldBounds(true);

    // Store references on the scene for update()
    this._snPlayer = player;

    // Child NPC at the burning house threshold
    const child = this.physics.add.sprite(350, 600, "atlas", "down");
    child.setDepth(1);
    child.body.immovable = true;

    // Owner NPC at the restaurant
    const owner = this.physics.add.sprite(1250, 600, "atlas", "down");
    owner.setDepth(1);
    owner.body.immovable = true;

    const wanderers = [];
    for (const wx of [512, 700, 900, 1050, 1180]) {
      const npc = this.physics.add.sprite(wx, 640, "atlas", "down");
      npc.setDepth(1);
      npc.body.setCollideWorldBounds(true);
      wanderers.push(npc);
    }
    this._snWanderers = wanderers;
    this._snNextWander = 0;

    window.SmartNPCGame.resetPlayer = () => {
      if (player && player.body) {
        player.body.reset(SPAWN.x, SPAWN.y);
        player.setVelocity(0, 0);
        player.anims.stop();
        player.setFrame("down");
      }
    };

    // Walk animations
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNames("atlas", { prefix: "down-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNames("atlas", { prefix: "up-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNames("atlas", { prefix: "left-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNames("atlas", { prefix: "right-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const camera = this.cameras.main;
    camera.startFollow(player);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    if (window.SmartNPCPlayer) {
      window.SmartNPCPlayer.init(this, player);
    }
  }

  function update(time, delta) {
    if (window.SmartNPCPlayer && this._snPlayer) {
      window.SmartNPCPlayer.update(this, this._snPlayer);
    }
    updatePlayerAnimation(this._snPlayer);
    updateWanderers(this, time);
  }

  function updateWanderers(scene, time) {
    if (!scene._snWanderers || time < scene._snNextWander) return;
    scene._snNextWander = time + 1000;
    for (const npc of scene._snWanderers) {
      const speed = 60;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      npc.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      const anim = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
        ? (Math.cos(angle) > 0 ? "walk-right" : "walk-left")
        : (Math.sin(angle) > 0 ? "walk-down" : "walk-up");
      npc.play(anim, true);
    }
  }

  function updatePlayerAnimation(player) {
    if (!player || !player.body) return;
    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;
    const moving = Math.abs(vx) > 1 || Math.abs(vy) > 1;
    if (!moving) {
      player.anims.stop();
      return;
    }
    let anim = null;
    if (Math.abs(vx) > Math.abs(vy)) {
      anim = vx > 0 ? "walk-right" : "walk-left";
    } else {
      anim = vy > 0 ? "walk-down" : "walk-up";
    }
    if (player.anims.currentAnim?.key !== anim) {
      player.play(anim);
    }
  }

  window.SmartNPCGame = { boot: boot };
})();
