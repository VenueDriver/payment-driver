'use strict';

const Logger = require('../Logger/log');

class MoneySanitizer {
  sanitize(value) {
    if (!value) {
      return;
    }

    try {
      value = value.toString(); //in case when value is number

      var decimals = value.split('.');
      if(decimals.length < 2) decimals.push("00");
      if(decimals[1].length === 0) decimals[1] = "00";
      if(decimals[1].length === 1) decimals[1] = decimals[1] + "0";
      if(decimals[1].length > 2) decimals[1] = decimals[1].substring(0,2);
      return decimals[0] + "." + decimals[1];
    } catch (error) {
      Logger.printError(['Error In money sanitizer: ',error]);
    }
  }
}

module.exports = new MoneySanitizer();
