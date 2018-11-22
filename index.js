require('dotenv').config();
const async = require('async');
const { Attachment } = require('discord.js');
const Discord = require('discord.js');
const client = new Discord.Client();
const Jimp = require('jimp');
const fs = require('fs');
const moment = require('moment');

const sponsors = require("./data_models/sponsors.js");
const user = require("./data_models/chat_user.js");
const roles = require("./data_models/chat_user_roles.js");

const settings = { // später aus file/db
  mvp_role: "RPG-MVP",
  min_dmg: 5,
  min_hp: 100,
  prefix: "?"
};

function show_helptext(msg) {
  // Reminder: Auch Embeded Texte sind Zeichenbegrenzt!
  const embed = new Discord.RichEmbed()
    .setTitle("RPG-Help")
    .setDescription("Fehler oder Wünsche:\r\nhttps://github.com/Istani/SYTH_RPG_Addon/issues\r\n")
    .addField(settings.prefix+"help", "Zeigt diesen Text an!\r\n", false)
    .addField(settings.prefix+"spawn", "Beschwört ein neues Monster, falls keins vorhanden ist!\r\n", false)
    .addField(settings.prefix+"attack", "Lässt deinen Charakter angreifen!\r\n", false)
    .addField(settings.prefix+"heal", "Heilt deinen Charakter, falls du ein Heilitem besitzt!\r\n", false)
    .addField(settings.prefix+"inventory", "Zeigt dein Inventar an!\r\n", false)
    .addField(settings.prefix+"harvest", "Lässt deinen Charakter Kräuter sammeln!\r\n", false)
    .addField(settings.prefix+"charinfo", "Zeigt Informationen zu deinen Charakter an!\r\n", false)
    .addField(settings.prefix+"mobinfo", "Zeigt Informationen zu dem Monster an!\r\n", false);
  msg.channel.send(embed);
}

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
  var data = JSON.stringify(monster);
  fs.writeFileSync("./tmp/mob.json",data);
  load_monster();
}
var mvp_list={};
function load_mvp() {
  try {
    mvp_list=require("./tmp/mvp.json");
  } catch (error) {
    console.log("MVP","Couldn't load!");
    mvp_list={};
  }
}
load_mvp();
function save_mvp() {
  var data = JSON.stringify(mvp_list);
  fs.writeFileSync("./tmp/mvp.json",data);
  load_mvp();
}
function add_mvp(username, channel) {
  if (mvp_list[username] == undefined) {
    mvp_list[username]={};
    mvp_list[username].first=moment();
  }
  if (mvp_list[username].first==0) {
    mvp_list[username].first=moment();
  }
  mvp_list[username].last=moment();
  if (channel) {
    var role=channel.guild.roles.find((role) => { return role.name == settings.mvp_role;});
    var member=channel.guild.members.find((member) => {return member.user.username==username;});
    channel.guild.member(member).addRole(role);
    channel.send("👑 **" + username + "** wurde zum MVP!");
  }
  save_mvp();
}
function check_mvp(member, guild, role) {
  if (mvp_list[member.user.username]==undefined) {
    add_mvp(member.user.username);
    mvp_list[member.user.username].last=0;
    mvp_list[member.user.username].first=0;
    save_mvp();
  }
  if (mvp_list[member.user.username].last<moment().subtract(30, 'days')) {
    guild.member(member).removeRole(role);
    console.log("MVP","Remove",member.user.username);
    mvp_list[member.user.username].last=0;
    mvp_list[member.user.username].first=0;
    save_mvp();
  }
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
  var data = JSON.stringify(chars);
  fs.writeFileSync("./tmp/chars.json",data);
  load_chars();
}
function clear_chars(cb) {
  try {
    fs.unlinkSync('./tmp/chars.json');
    load_chars();
  } catch (err) {
    console.error(err);
  }
  chars={};
  cb();
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
      dmg:settings.min_dmg,
      hp_max:settings.min_hp,
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
    load_inventory(char_data.id);
  });
}
var inventories={};
function load_inventory(user_id) {
  try {
    inventories[user_id]=require("./tmp/inv_"+user_id+".json");
    // Werte die später dazugekommen sind
    if (inventories[user_id].max_items==undefined) {
      inventories[user_id].max_items=30;
    }
  } catch (err) {
    //console.log(err);
    inventories[user_id]={};
    inventories[user_id].items=[];
    inventories[user_id].max_items=30;
    save_inventory(user_id);
  }
}
function save_inventory(user_id) {
  if (inventories[user_id]==undefined) {
    load_inventory(user_id);
  }
  var data = JSON.stringify(inventories[user_id]);
  fs.writeFileSync("./tmp/inv_"+user_id+".json",data);
}
function display_inventroy(msg) {
  var user=msg.author.id;
  var inv = inventories[user].items;
  var inv_length=inv.length;
  var output_text="";
  for (var i=0;i<inv_length;i++) {
    output_text+=inv[i].icon+" "+inv[i].name+"\r\n";
  }
  if (output_text=="") {
    output_text="Keine Items vorhanden!";
  }
  var embed = new Discord.RichEmbed()
    .setTitle(msg.author.username)
    .setDescription("")
    .addField("Inventory",output_text,true);
  msg.author.send(embed);
}
var item_definition=require("./data/items.json");
function get_iteminfo(name) {
  return item_definition.find((e) => {return e.name==name;});
}
function add_item(user_id, item_name) {
  var tmp_item = get_iteminfo(item_name);
  if (tmp_item == undefined) {
    return false;
  }
  if (inventories[user_id].items.length>=inventories[user_id].max_items) {
    return false;
  }
  inventories[user_id].items.push(tmp_item);
  save_inventory(user_id);
  return true;
}
function remove_item(user_id, item_name) {
  var tmp_item = inventories[user_id].items.findIndex((e) => {return e.name==item_name;});
  if (tmp_item == undefined) {
    return false;
  }
  if (inventories[user_id].items.length<=1) {
    inventories[user_id].items=[];
  } else {
    inventories[user_id].items.splice(tmp_item,1);
  }
  save_inventory(user_id);
  return true;
}

var valid_guilds=[];
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  check_server();
  client.setInterval(check_server, 1000*60*60);
});
client.on('disconnect', () => {
  process.exit(0);
});
client.on('guildCreate', () => {
  check_server();
});
client.on('roleCreate', () => {
  check_server();
});
function check_server() {
  var guilds=client.guilds;
  guilds.forEach((guild) => {
    var roles=guild.roles;
    roles.forEach((role) => {
      if (role.name==settings.mvp_role) {
        var members = role.members;
        members.forEach((member) => {
          check_mvp(member, guild, role);
        });
        if (valid_guilds.length==0) {
          var already_valid=false;
        } else {
          var already_valid=valid_guilds.find((e) => {return e==guild.id;});
        }
        if (already_valid) {
          // already valid
        } else {
          console.log("Found Valid Guild", guild.name);
          valid_guilds.push(guild.id);
        }
      }
    });
  });
}

client.on('message', msg => {
  if (valid_guilds.length==0) {
    return;
  }
  var check_msg_guild=valid_guilds.find((e) => {return e==msg.guild.id;})
  if (!check_msg_guild) {
    return;
  }
  async.series([
    function (callback) {if (chars[msg.author.id]==undefined){gen_char(msg, callback);} else {callback();}},
    function (callback) {if (inventories[msg.author.id]==undefined) {load_inventory(msg.author.id); callback();} else {callback();}},
    function (callback) {callback();}
  ], function (err) {
    if (err) {
      console.error("ERROR", err);
      return;
     }
    msg.content=msg.content.toLowerCase();
    if (msg.content === settings.prefix) {
      msg.content+="help";
    }
    if (msg.content === settings.prefix+'spawn') {
      // Check Role
      // Check for Monster Already Spawned
      if (monster.hp === undefined || monster.hp<1) {
        // No Monster Alive - Generate Monster
        console.log("Generate new Monster!");
        var data_sponsors = {};
        async.series([
          function (callback) {chars={};clear_chars(callback);},
          function (callback) {sponsors.rand(data_sponsors, callback, {});},
          function (callback) {get_image(data_sponsors.data.youtube_snippet_sponsordetails_profileimageurl,callback);}
        ], function (err) {
          if (err) {
            console.error("ERROR", err);
            return;
          }
          gen_char(msg, ()=>{});
          monster.name="Dark "+data_sponsors.data.youtube_snippet_sponsordetails_displayname;
          monster.hp_max = data_sponsors.data.simpleyth_monate*100;
          monster.hp = monster.hp_max;
          monster.attacks=[];
          monster.aggro={};
          monster.atk=settings.min_dmg;
          save_monster();
          show_monster(msg);
        });
      } else {
        //msg.channel.send("❌ "+msg.author+": Göttlich Kraft verweigert, es existiert bereits ein Kampf!");
        msg.content=settings.prefix+"help";
        msg.delete();
      }
    }
    if (msg.content === settings.prefix+"mobinfo") {
      show_monster(msg);
    }
    if (msg.content === settings.prefix+"charinfo") {
      show_char(msg, msg.author.id);
      msg.delete();
    }
    if (msg.content === settings.prefix+"inventory") {
      display_inventroy(msg);
      msg.delete();
    }
    if (msg.content === settings.prefix+"attack") {
      if (chars[msg.author.id].hp==0) {
        msg.channel.send("💀 "+msg.author+":Ist Tot und kann nicht mehr angreifen!");
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
        if (monster.hp==0) {
          calc_mvp(msg.channel);
        }
      } else {
        msg.channel.send("🔍 " + msg.author + ": Kein Monster in Sicht!");
      }
      msg.delete();
    }
    if (msg.content === settings.prefix+"harvest") {
      if (add_item(msg.author.id, "Heilkraut")) {
        var tmp_item=get_iteminfo("Heilkraut");
        msg.channel.send("⛏ **"+msg.author.username+"** sammelt **"+tmp_item.icon+" "+tmp_item.name+"**!");
      } else {
       msg.channel.send("❌ "+msg.author+": Item konnte nicht aufgesammelt werde!"); 
      }
      msg.delete();
    }
    if (msg.content === settings.prefix+"heal") {
      var healitem=inventories[msg.author.id].items.find((e) => {return e.heal>0;});
      if (healitem == undefined) {
        msg.channel.send("❌ "+msg.author+": Kein Heilungsitem gefunden!");
      } else if (remove_item(msg.author.id, healitem.name)) {
        var tmp_heal=healitem.heal;
        chars[msg.author.id].hp+=tmp_heal;
        if (chars[msg.author.id].hp>chars[msg.author.id].hp_max) {
          tmp_heal+=(chars[msg.author.id].hp_max-chars[msg.author.id].hp);
          chars[msg.author.id].hp=chars[msg.author.id].hp_max;
        }
        msg.channel.send("💊 **"+msg.author.username+"** heilt sich um "+tmp_heal+"!");
        monster.attacks.push({user: msg.author.id, dmg: 0});
        monster.aggro[msg.author.id]+=tmp_heal*0.25;
        save_monster();
        save_chars();
        if (monster.hp>0 && monster.attacks.length%5==0) {
          monster_attack(msg);
        }
      } else {
        msg.channel.send("❌ "+msg.author+": Item konnte nicht eingesetzt werden!");
      }
      msg.delete();
    }
    if (msg.content === settings.prefix+"help") {
      show_helptext(msg);
    }
  });
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
  monster.atk=settings.min_dmg;
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

function calc_mvp(channel) {
  var attack_sums={};
  monster.attacks.forEach((attack) => {
    if (attack_sums[attack.user]==undefined) {
      attack_sums[attack.user]=0;
    }
    attack_sums[attack.user]+=attack.dmg;
  });
  var sortable = [];
  for (var user in attack_sums) {
    sortable.push([user, attack_sums[user]]);
  }
  sortable.sort((a, b) => {return b[1] - a[1];});
  var embed = new Discord.RichEmbed()
    .setTitle("Damage-Meter")
    .setDescription("");
  var max_length=sortable.length;
  if (max_length>10) {
    max_length=10;
  }
  var output_text="";
  for (var i = 0;i<max_length;i++) {
    output_text+=(i+1) + ". <@" + sortable[i][0] +">: " + sortable[i][1] + " \r\n";
  }
  embed.addField("Top 10",output_text,true);
  channel.send({ embed });
  add_mvp(channel.guild.members.get(sortable[0][0]).user.username,channel);
}
