const shopify = require('../lib/shopify.js');
const xero = require('../lib/xero.js');

// Initialize the libraries
xero.init();
shopify.init();

// Read the latest SHOP order from Xero
var whereFilter = 'Type=="ACCREC"';
var orderBy = 'Date DESC';
var pageNum = 1;
xero.getInvoices(whereFilter, orderBy, pageNum, function(err, response, body) {
  console.log('Xero got invoices');
  if (!err & response.statusCode == 200) {
    // Get the oldest invoice reference id
    var ref = body.Invoices[0].Reference;

    // Get the shopify orders since that reference
    shopify.getOrders(ref)
      .then(function(orders) {
        console.log('Holy cow we are behind by ' + orders.length + ' orders');
      });

  } else {
    if (err) {
      console.error('Xero API error');
      console.error(err);
    } else {
      console.error('Xero API bad status code: ' + response.statusCode);
      console.error(body);
    }
  }
});