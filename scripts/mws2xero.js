const mws = require('../lib/mws.js');
const xero = require('../lib/xero.js');
const wisecracker = require('../lib/wisecracker.js');

// Initialize the libraries
mws.init();
xero.init();

// First check the newest MWS order from xero
var getNewestOrder = function getNewestOrder() {
  var whereFilter = 'Type=="ACCREC" AND Contact.Name.StartsWith("Amazon")';
  var orderBy = 'Date DESC';
  var pageNum = 1;
  xero.getInvoices(whereFilter, orderBy, pageNum)
  .then(function(body) {

    // Get the newest invoice reference i
    var invoice = body.Invoices[0];
    var fixedDate = fixDate(invoice.Date);
    console.log(fixedDate.toString());
    console.log('Xero newest invoice: ' + invoice.InvoiceNumber + ' on ' + fixedDate);
    return fixedDate;
  })
  .then(function(fixedDate) {
    // Get the Amazon orders since then
    return mws.listOrders(fixedDate);
  })
  .then(function(result, metadata) {
    console.log('There are ' + result.result.length + ' orders.');
    for (var i=0; i < result.result.length; i++) {
      var mwsOrder = result.result[i];
      processOrder(mwsOrder);
    }
  })
}

// Process a single MWS Order
var processOrder = function processOrder(mwsOrder) {
  var mwsId = mwsOrder.AmazonOrderId;
  var customerName = 'Amazon Customer';
  console.log('Processing Order ' + mwsOrder.AmazonOrderId + ' for ' + customerName);
  var lineItems = [];

  mws.getItems(mwsId)
  .then(function(result, metadata) {
    lineItems = result.result;
    console.log(mwsId + ' has ' + lineItems.length + ' line items');
    var whereFilter = 'Name=="' + customerName + '"';
    return xero.getContacts(whereFilter)
  })
  .then(function(xeroContactResponse) {
    var xeroContact = xeroContactResponse.Contacts[0];
    return wisecracker.addAmazonOrder2Xero(mwsOrder, lineItems, xeroContact)
  })
  .then(function(xeroInvoice) {
    console.log('Xero Invoice AMZN#' + mwsId + ' added/updated.');
  })
  .catch(function(err) {
    console.error('processOrder failed: ' + err);
  });
}

var fixDate = function fixDate(invoiceDate) {
  var start = invoiceDate.indexOf('(') + 1;
  var end = invoiceDate.indexOf('+');
  var sub = invoiceDate.substring(start, end);
  var fixedDate = new Date(parseInt(sub));
  return fixedDate;
}

getNewestOrder();