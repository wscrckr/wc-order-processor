const Xero = require('xero');

// Define the initial library
var xero = {};

xero.init = function init() {
  console.log('Xero init() started');
  var xConsumerKey = process.env.XERO_CONSUMER_KEY;
  var xConsumerSecret = process.env.XERO_CONSUMER_SECRET;
  var xPrivateKey = process.env.XERO_PRIVATE_KEY;
  this.xero = new Xero(xConsumerKey, xConsumerSecret, xPrivateKey);

  // Return true if the init was successful
  if (this.xero != null) {
    console.log('Xero init() successful');
    return true;
  }
  console.error('Xero init() failed')
  return false;
}

module.exports = xero;
