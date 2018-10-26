var knex = require('knex')(require("../knexfile.js"));

var table_name = "youtube_sponsors";
var MODEL = {};
MODEL.show = function (return_data, done_callback, send_data) {
  try {
    knex(table_name).select().then((result) => {
        return_data.chat = result;
        done_callback();
      }
    ).catch((e) => {
      console.error("chat.show", e);
      done_callback(e);
    });
  } catch (e) {
    console.error("chat.show", e);
    done_callback(e);
  }
};
module.exports = MODEL; 