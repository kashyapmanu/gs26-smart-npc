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
    // Tilesets (same paths as smallville/environment/frontend_server/templates/demo/main_script.html)
    this.load.image("blocks_1", "/static/assets/the_ville/visuals/map_assets/blocks/blocks_1.png");
    this.load.image("walls", "/static/assets/the_ville/visuals/map_assets/v1/Room_Builder_32x32.png");
    this.load.image("interiors_pt1", "/static/assets/the_ville/visuals/map_assets/v1/interiors_pt1.png");
    this.load.image("interiors_pt2", "/static/assets/the_ville/visuals/map_assets/v1/interiors_pt2.png");
    this.load.image("interiors_pt3", "/static/assets/the_ville/visuals/map_assets/v1/interiors_pt3.png");
    this.load.image("interiors_pt4", "/static/assets/the_ville/visuals/map_assets/v1/interiors_pt4.png");
    this.load.image("interiors_pt5", "/static/assets/the_ville/visuals/map_assets/v1/interiors_pt5.png");
    this.load.image("CuteRPG_Field_B", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Field_B.png");
    this.load.image("CuteRPG_Field_C", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Field_C.png");
    this.load.image("CuteRPG_Harbor_C", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Harbor_C.png");
    this.load.image("CuteRPG_Village_B", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Village_B.png");
    this.load.image("CuteRPG_Forest_B", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Forest_B.png");
    this.load.image("CuteRPG_Desert_C", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Desert_C.png");
    this.load.image("CuteRPG_Mountains_B", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Mountains_B.png");
    this.load.image("CuteRPG_Desert_B", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Desert_B.png");
    this.load.image("CuteRPG_Forest_C", "/static/assets/the_ville/visuals/map_assets/cute_rpg_word_VXAce/tilesets/CuteRPG_Forest_C.png");

    this.load.tilemapTiledJSON("map", "/static/assets/the_ville/visuals/the_ville_jan7.json");

    // Player atlas
    this.load.atlas("atlas", "/static/assets/characters/Yuriko_Yamamoto.png", "/static/assets/characters/atlas.json");
  }

  function create() {
    const map = this.make.tilemap({ key: "map" });

    const collisions = map.addTilesetImage("blocks", "blocks_1");
    const walls = map.addTilesetImage("Room_Builder_32x32", "walls");
    const interiors_pt1 = map.addTilesetImage("interiors_pt1", "interiors_pt1");
    const interiors_pt2 = map.addTilesetImage("interiors_pt2", "interiors_pt2");
    const interiors_pt3 = map.addTilesetImage("interiors_pt3", "interiors_pt3");
    const interiors_pt4 = map.addTilesetImage("interiors_pt4", "interiors_pt4");
    const interiors_pt5 = map.addTilesetImage("interiors_pt5", "interiors_pt5");
    const CuteRPG_Field_B = map.addTilesetImage("CuteRPG_Field_B", "CuteRPG_Field_B");
    const CuteRPG_Field_C = map.addTilesetImage("CuteRPG_Field_C", "CuteRPG_Field_C");
    const CuteRPG_Harbor_C = map.addTilesetImage("CuteRPG_Harbor_C", "CuteRPG_Harbor_C");
    const CuteRPG_Village_B = map.addTilesetImage("CuteRPG_Village_B", "CuteRPG_Village_B");
    const CuteRPG_Forest_B = map.addTilesetImage("CuteRPG_Forest_B", "CuteRPG_Forest_B");
    const CuteRPG_Desert_C = map.addTilesetImage("CuteRPG_Desert_C", "CuteRPG_Desert_C");
    const CuteRPG_Mountains_B = map.addTilesetImage("CuteRPG_Mountains_B", "CuteRPG_Mountains_B");
    const CuteRPG_Desert_B = map.addTilesetImage("CuteRPG_Desert_B", "CuteRPG_Desert_B");
    const CuteRPG_Forest_C = map.addTilesetImage("CuteRPG_Forest_C", "CuteRPG_Forest_C");

    const tileset_group_1 = [
      CuteRPG_Field_B, CuteRPG_Field_C, CuteRPG_Harbor_C, CuteRPG_Village_B,
      CuteRPG_Forest_B, CuteRPG_Desert_C, CuteRPG_Mountains_B, CuteRPG_Desert_B, CuteRPG_Forest_C,
      interiors_pt1, interiors_pt2, interiors_pt3, interiors_pt4, interiors_pt5, walls
    ];

    map.createLayer("Bottom Ground", tileset_group_1, 0, 0);
    map.createLayer("Exterior Ground", tileset_group_1, 0, 0);
    map.createLayer("Exterior Decoration L1", tileset_group_1, 0, 0);
    map.createLayer("Exterior Decoration L2", tileset_group_1, 0, 0);
    map.createLayer("Interior Ground", tileset_group_1, 0, 0);
    map.createLayer("Wall", [CuteRPG_Field_C, walls], 0, 0);
    map.createLayer("Interior Furniture L1", tileset_group_1, 0, 0);
    map.createLayer("Interior Furniture L2 ", tileset_group_1, 0, 0);
    const foregroundL1Layer = map.createLayer("Foreground L1", tileset_group_1, 0, 0);
    const foregroundL2Layer = map.createLayer("Foreground L2", tileset_group_1, 0, 0);
    foregroundL1Layer.setDepth(2);
    foregroundL2Layer.setDepth(2);

    const collisionsLayer = map.createLayer("Collisions", collisions, 0, 0);
    collisionsLayer.setCollisionByProperty({ collide: true });
    collisionsLayer.setDepth(-1);

    // Player sprite
    const player = this.physics.add
      .sprite(2400, 588, "atlas", "down")
      .setSize(30, 40)
      .setOffset(0, 0);
    player.setDepth(-1);
    player.setCollideWorldBounds(true);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const camera = this.cameras.main;
    camera.startFollow(player);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    if (window.SmartNPCPlayer) {
      window.SmartNPCPlayer.init(this, player);
    }

    // Store references on the scene for update()
    this._snPlayer = player;
  }

  function update(time, delta) {
    if (window.SmartNPCPlayer && this._snPlayer) {
      window.SmartNPCPlayer.update(this, this._snPlayer);
    }
  }

  window.SmartNPCGame = { boot: boot };
})();
