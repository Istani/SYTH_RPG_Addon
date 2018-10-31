const fs = require('fs');
var config = require('dotenv').config();
var config_example = "";
if (fs.existsSync("./.env")) {
  for (var attributename in config.parsed) {
    config_example += attributename + "=\r\n";
  }
  fs.writeFileSync('./.env.example', config_example);
}

module.exports = {
  client: 'mysql',
  connection: {
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_BASE
  }
};
