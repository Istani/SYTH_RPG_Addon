require('dotenv').config();
const async = require('async');
const { Attachment } = require('discord.js');
const Discord = require('discord.js');
const client = new Discord.Client();
const Jimp = require('jimp');

const sponsors = require("./data_models/sponsors.js");
const user = require("./data_models/chat_user.js");
const roles = require("./data_models/chat_user_roles.js");

var monster={};
function load_monster() {
  try {
    monster=require("./tmp/mob.json");
  } catch(error) {
    console.error("Monster", "Couldn't load!");
    monster={};
  }
}
load_monster();
function save_monster() {
  const fs = require("fs");
  var data = JSON.stringify(monster);
  fs.writeFileSync("./tmp/mob.json",data);
  load_monster();
}

var chars={};
function load_chars() {
  try {
    chars=require("./tmp/chars.json");
  } catch(error) {
    console.error("Chars", "Couldn't load!");
    chars={};
  }
}
load_chars();
function save_chars() {
  const fs = require("fs");
  var data = JSON.stringify(chars);
  fs.writeFileSync("./tmp/chars.json",data);
  load_chars();
}
function clear_chars() {
  const fs = require("fs");
  try {
    fs.unlinkSync('./tmp/chars.json');
  } catch (err) {
  // handle the error
  }
  load_chars();
}
function gen_char(msg, callback) {
  var search_user = {
    service: "Discord",
    host: msg.guild.id,
    user: msg.author.id
  };
  var data_user ={};
  async.series([
    function (cb) {user.find(data_user, cb, search_user);},
  ], function (err) {
    var char_data = { //default daten
      dmg:5,
      hp_max:100,
      id: msg.author.id,
      name: msg.author.username
    }
    if (err || data_user.data==undefined) {
      // Den User gibt es nicht? - Wohl neu...
      console.error("Gen Char", err);
    } else {
      char_data.dmg+=data_user.data.msg_avg;
      char_data.hp_max+=data_user.data.msg_sum;
    }
    char_data.hp=char_data.hp_max;
    chars[char_data.id]=char_data;
    save_chars();
    callback();
  });
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
      clear_chars(); // Ein neuer Kampf beginnt
      var data_sponsors = {};
      async.series([
        function (callback) {sponsors.rand(data_sponsors, callback, {});},
        function (callback) {get_image(data_sponsors.data.youtube_snippet_sponsordetails_profileimageurl,callback);}
      ], function (err) {
        if (err) {
            console.error("ERROR", err);
            return;
        }
        monster.name="Dark "+data_sponsors.data.youtube_snippet_sponsordetails_displayname;
        monster.hp_max = data_sponsors.data.simpleyth_monate*100;
        monster.hp = monster.hp_max;
        monster.attacks=[];
        monster.aggro={};
        monster.atk=0;
        save_monster();
        show_monster(msg);
      });
    } else {
      msg.channel.send("X "+msg.author+": Göttlich Kraft verweigert, es existiert bereits ein Kampf!");
      msg.delete();
    }
  }
  if (msg.content === "Mobinfo") {
    show_monster(msg);
  }
  if (msg.content === "Charinfo") {
    show_char(msg, msg.author.id);
    msg.delete();
  }
  if (msg.content === "Attack") {
    async.series([
      function (callback) {if (chars[msg.author.id]==undefined){gen_char(msg, callback);}else{callback();}},
    ], function (error) {
      if (chars[msg.author.id].hp==0) {
        msg.channel.send("X "+msg.author+": Ist Tot und kann nicht mehr angreifen!");
      } else if (monster.hp >0) {
        var tmp_dmg=chars[msg.author.id].dmg;
        monster.hp-=tmp_dmg;
        if (monster.hp<0) {
          tmp_dmg+=monster.hp;
          monster.hp=0;
        }
        if (monster.aggro[msg.author.id] == undefined) {
          monster.aggro[msg.author.id]=0;
        }
        monster.attacks.push({user: msg.author.id, dmg: tmp_dmg});
        monster.aggro[msg.author.id]+=tmp_dmg;
        monster.atk+=tmp_dmg;
        save_monster();
        msg.channel.send("⚔ **" + msg.author.username+"** hat "+tmp_dmg+" Schaden an **"+monster.name+"** gemacht!");
        if (monster.hp>0 && monster.attacks.length%5==0) {
          monster_attack(msg);
        }
      } else {
        msg.channel.send("🔍 " + msg.author + ": Kein Monster in Sicht!");
      }
      msg.delete();
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

function show_monster(msg) {
  var hp_text = monster.hp + "/" + monster.hp_max;
  var hp_details=""; //██░░░░░░░ 23%"
  var hp_prozent=parseInt((monster.hp*100)/monster.hp_max);
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
  hp_details+=" "+hp_prozent+"%";
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
function show_char(msg, userid) {
  var hp_text = chars[userid].hp + "/" + chars[userid].hp_max;
  var hp_details=""; //██░░░░░░░ 23%"
  var hp_prozent=parseInt((chars[userid].hp*100)/chars[userid].hp_max);
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
  hp_details+=" "+hp_prozent+"%";
  const embed = new Discord.RichEmbed()
    .setTitle(chars[userid].name)
    .setDescription("")
    .addField("❤ HP ("+hp_text+"):", hp_details, true);
  msg.channel.send({ embed });
}

function monster_attack(msg) {
  var most_aggro={user:0, value:0};
  Object.keys(monster.aggro).forEach(function(key) {
    var val = monster.aggro[key];
    if (val>most_aggro.value) {
      if (chars[key].hp>0) {
        most_aggro.user=key;
        most_aggro.value=val;
      }
    }
  });
  var tmp_dmg=monster.atk;
  monster.atk=0;
  chars[most_aggro.user].hp-=tmp_dmg;
  if (chars[most_aggro.user].hp<0) {
    tmp_dmg+=chars[most_aggro.user].hp;
    chars[most_aggro.user].hp=0;
  }
  if (chars[most_aggro.user].hp==0) {
    monster.aggro[most_aggro.user]=0;
  }
  msg.channel.send("⚔ **" + monster.name +"** hat "+tmp_dmg+" Schaden an **"+chars[most_aggro.user].name+"** gemacht!");

  show_char(msg, most_aggro.user);

  save_monster();
  save_chars();
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
