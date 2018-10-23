require('dotenv').config();
const async = require('async');
const { Attachment } = require('discord.js');
const Discord = require('discord.js');
const client = new Discord.Client();
const Jimp = require('jimp');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'pic') {
    console.log("Create Image of", msg.author.username, msg.author.avatarURL);
    async.parallel([
      function (callback) {get_image(msg.author.avatarURL, callback)}
    ], function (err, img) {
        if (err) {
            console.error("ERROR", err);
            return;
        }
        console.log("Sending Image of", msg.author.username);
        const attachment=new Attachment('./test.jpg');
        msg.channel.send("aaaaah",attachment);
        console.log("Done Image of", msg.author.username);
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

function get_image(img_path, callback) {
  console.log("getting image");
  Jimp.read(img_path).then(img => {
    img
      .resize(256, 256) // resize
      .quality(100) // set JPEG quality
      .invert()
      .write('test.jpg',() => {callback(null, "a");});
/*
    img.getBufferAsync(Jimp.MIME_JPEG, buffer => {
      console.log("call back");
      callback(null, buffer);
    });
*/
  }).catch(err => {
    callback(err);
  });
}
