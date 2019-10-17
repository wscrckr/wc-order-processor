const rp = require('request-promise');
const fs = require('fs');
const js2xmlparser = require('js2xmlparser');

// Define the initial library
var xero = {};
var URL_PREFIX = 'https://api.xero.com/api.xro/2.0';
xero.url = {
  invoices: URL_PREFIX + '/invoices',
  contacts: URL_PREFIX + '/contacts'
}

xero.init = function init() {
  console.log('Xero init() started');
  require('dotenv').config()
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

// GET an array of invoices
xero.getInvoices = function getInvoices(whereFilter, orderBy, pageNum, cb) {
  var qs = {
    where: whereFilter,
    order: orderBy,
    page: pageNum
  }
  return getHelper(xero.url.invoices, qs, cb);
}

// POST a new invoice
xero.addInvoice = function addInvoice(jsonPayload, rootTag, cb) {
  return sendHelper('POST', xero.url.invoices, jsonPayload, rootTag, cb);
}

// GET an array of contacts
xero.getContacts = function getContacts(whereFilter, cb) {
  var qs = {
    where: whereFilter
  }
  return getHelper(xero.url.contacts, qs, cb);
}

// POST a new contact
xero.addContact = function addContact(jsonPayload, rootTag, cb) {
  return sendHelper('POST', xero.url.contacts, jsonPayload, rootTag, cb);
}

// Helper function to make a GET call
var getHelper = function getHelper(url, qs, cb) {
  
  // Setup the options
  var options = {
    url: url,
    oauth: xero.oauth,
    qs: qs,
    json: true
  }

  // Issue the request-promise
  return rp.get(options);
    // .then(cb)
    // .catch(function (err) {
    //   console.error('Xero API GET failed!');
    //   console.error(err);
    // });
}

// Helper function to make a PUT or POST call
var sendHelper = function postHelper(method, url, jsonPayload, rootTag, cb) {
  
  // Convert the JSON to XML
  var xmlPayload = js2xmlparser.parse(rootTag, jsonPayload);
  // console.log(xmlPayload);

  // Setup the options
  var options = {
    method: method,
    url: url,
    oauth: xero.oauth,
    body: xmlPayload
  }

  // Issue the request-promise
  return rp(options);
    // .then(cb)
    // .catch(function (err) {
    //   console.error('Xero API PUT / POST failed!');
    //   // console.error(err);
    // });
}

module.exports = xero;
