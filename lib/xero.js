const rp = require('request-promise');
const fs = require('fs');

// Define the initial library
var xero = {};
xero.url = {
  invoices: 'https://api.xero.com/api.xro/2.0/invoices'
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
  return true;
}

xero.requestHelper = function(error, response, body) {
  if (!err & response.statusCode == 200) {
    return body;
  } else {
    if (err) {
      console.error('Xero API error');
      console.error(err);
    } else {
      console.error('Xero API bad status code: ' + response.statusCode);
      console.error(body);
    }
    return null;
  }
}

xero.getInvoices = function getInvoices(whereFilter, orderBy, pageNum, cb) {
  var options = {
    url: xero.url.invoices,
    oauth: xero.oauth,
    qs: {
      where: whereFilter,
      order: orderBy,
      page: pageNum
    },
    json: true
  }
  rp.get(options)
    .then(cb)
    .catch(function (err) {
      console.err('Xero API failed!');
      console.error(err);
    });
}

xero.getContacts = function getContacts(whereFilter, cb) {

}

module.exports = xero;
