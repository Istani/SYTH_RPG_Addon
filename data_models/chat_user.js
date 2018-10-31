var knex = require('knex')(require("../knexfile.js"));

var table_name = "bot_chatuser";
var MODEL = {};
MODEL.show = function (return_data, done_callback, send_data) {
  try {
    knex(table_name).select().then((result) => {
      return_data.data = result;
      done_callback();
    }).catch((e) => {
      console.error(table_name, "show 1", e.code);
      done_callback(e);
    });
  } catch (e) {
    console.error("show 2", e.code);
    done_callback(e);
  }
};
MODEL.rand = function (return_data, done_callback, send_data) {
  try {
    knex(table_name).select().orderBy(knex.raw('RAND()')).then((result) => {
      return_data.data = result[0];
      done_callback();
    }).catch((e) => {
      console.error(table_name, "rand 1", e.code);
      done_callback(e);
    });
  } catch (e) {
    console.error("rand 2", e.code);
    done_callback(e);
  }
};
MODEL.find = function (return_data, done_callback, send_data) {
  try {
    knex(table_name).select().where(send_data).then((result) => {
      return_data.data = result[0];
      done_callback();
    }).catch((e) => {
      console.error(table_name, "find 1", e.code);
      done_callback(e);
    });
  } catch (e) {
    console.error("find 2", e.code);
    done_callback(e);
  }
};
module.exports = MODEL; 
