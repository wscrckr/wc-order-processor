const rp = require('request-promise');
const fs = require('fs');

// Define the initial library
var xero = {};
var URL_PREFIX = 'https://api.xero.com/api.xro/2.0';
xero.url = {
  invoices: URL_PREFIX + '/invoices',
  contacts: URL_PREFIX + '/contacts'
}

xero.init = function init() {
  console.log('Xero init() started');
  xero.xConsumerKey = process.env.XERO_CONSUMER_KEY;
  xero.xConsumerSecret = process.env.XERO_CONSUMER_SECRET;
  xero.xPrivateKeyName = process.env.XERO_PRIVATE_KEY;
  xero.xPrivateKey = fs.readFileSync(xero.xPrivateKeyName, 'UTF-8');

  xero.oauth = {
    consumer_key: xero.xConsumerKey,
    signature_method: 'RSA-SHA1',
    private_key: xero.xPrivateKey,
    token: xero.xConsumerKey,
    token_secret: xero.xConsumerSecret
  };
}

xero.getInvoices = function getInvoices(whereFilter, orderBy, pageNum, cb) {
  var qs = {
    where: whereFilter,
    order: orderBy,
    page: pageNum
  }
  getAny(xero.url.invoices, qs, cb);
}

xero.getContacts = function getContacts(whereFilter, cb) {
  var qs = {
    where: whereFilter
  }
  getAny(xero.url.contacts, qs, cb);
}

// Helper function to make the get() call
var getAny = function getAny(url, qs, cb) {
  
  // Setup the options
  var options = {
    url: url,
    oauth: xero.oauth,
    qs: qs,
    json: true
  }

  // Issue the request-promise
  rp.get(options)
    .then(cb)
    .catch(function (err) {
      console.err('Xero API failed!');
      console.error(err);
    });
}

module.exports = xero;
