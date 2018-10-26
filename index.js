require('dotenv').config();
const async = require('async');
const { Attachment } = require('discord.js');
const Discord = require('discord.js');
const client = new Discord.Client();
const Jimp = require('jimp');

var monster={};
function load_monster() {
  try {
    monster=require("./tmp/mob.json");
  } catch(error) {
    console.error("Monster", "Couldn't load Monster!");
    monster={};
    //save_monster(); - Can't save empty monster
  }
}
load_monster();
function save_monster() {
  const fs = require("fs");
  var data = JSON.stringify(monster);
  fs.writeFileSync("./tmp/mob.json",data);
  load_monster();
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'Spawn') {
    // Check Role
    // Check for Monster Already Spawned
    if (monster.hp === undefined || monster.hp<1) {
      // No Monster Alive - Generate Monster
      console.log("Generate new Monster!");
      monster.name="Dark "+msg.author.username;
      monster.hp_max = 1;
      monster.hp = monster.hp_max;
      async.parallel([
        function (callback) {get_image(msg.author.avatarURL, callback)},
      ], function (err) {
        if (err) {
            console.error("ERROR", err);
            return;
        }
        save_monster();
        show_monster(msg);
      });
    } else {
      show_monster(msg);
    }
  }
  if (msg.content === "Attack") {
    if (monster.hp >0) {
      var tmp_dmg=1;
      monster.hp-=tmp_dmg;
      if (monster.hp<0) {
        tmp_dmg+=monster_hp;
        monster.hp=0;
      }
      save_monster();
      msg.channel.send("⚔ " + msg.author.username+" hat "+tmp_dmg+" Schaden gemacht!");
    } else {
      msg.channel.send("🔍 " + msg.author + ": Kein Monster in Sicht!");
    }
    msg.delete();
  }
});

client.login(process.env.DISCORD_TOKEN);

function show_monster(msg) {
  var hp_text = monster.hp + "/" + monster.hp_max;
  var hp_details=""; //██░░░░░░░ 23%"
  var hp_prozent=(monster.hp*100)/monster.hp_max;
  var step_prozent=5;
  var tmp_prozent=0;
  while (tmp_prozent<100) {
    tmp_prozent+=step_prozent;
    if(tmp_prozent<=hp_prozent) {
      hp_details+="█";
    } else {
      hp_details+="░";
    }
  }
  hp_details+=" "+parseInt(hp_prozent)+"%";
  const embed = new Discord.RichEmbed()
    .setTitle(monster.name)
    .setDescription("")
    .setImage("attachment://mob.jpg")
    .addField("❤ HP ("+hp_text+"):", hp_details, true);
  msg.channel.send({ embed, files: [{ attachment: './tmp/mob.jpg', name: 'mob.jpg' }] });
  //const attachment=new Attachment('./tmp/mob.jpg');
  //msg.channel.send(monster.name, attachment);
  msg.delete();
}

function get_image(img_path, callback) {
  Jimp.read(img_path).then(img => {
    img
      .resize(256, 256) // resize
      .quality(100) // set JPEG quality
      .invert()
      .write('./tmp/mob.jpg',() => {callback();});
  }).catch(err => {
    callback(err);
  });
}
