/* eslint-disable no-underscore-dangle */
const moment = require('moment');

function getLocalTimeStr()
{ 
  var now = new Date();
  var local_time = moment(now).local().format('YY/MM/DD HH:mm:ss');
  
  return local_time; 
}

module.exports = {
  getLocalTimeStr
};
