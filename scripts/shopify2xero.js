const shopify = require('../lib/shopify.js');
const xero = require('../lib/xero.js');
const wisecracker = require('../lib/wisecracker.js');

// Initialize the libraries
xero.init();
shopify.init();

// Get the latest / newest SHOP order from Xero
var checkForNewOrders = function checkForNewOrders() {
  var whereFilter = 'Type=="ACCREC" AND InvoiceNumber.StartsWith("SHOP")';
  var orderBy = 'InvoiceNumber DESC';
  var pageNum = 1;
  xero.getInvoices(whereFilter, orderBy, pageNum, function(body) {

    // Get the newest invoice reference i
    var invoice = body.Invoices[0];
    var reference = body.Invoices[0].Reference;
    console.log('Xero newest invoice: ' + invoice.InvoiceNumber);

    // Get the Shopify orders since that reference
    shopify.getOrdersSince(reference)
      .then(function(orders) {
        if (orders.length > 0) {
          console.log('Holy cow we are behind by ' + orders.length + ' orders');
          for (var i=0; i < orders.length; i++) {
            var order = orders[i];
            processOrder(order);
          }
        } else {
          console.log('We are all caught up');
        }
      });
  });
}

// Re-run for a particular orderNum from Shopify
var checkOrder = function checkOrders(orderNum) {
  shopify.getOrders(orderNum)
    .then(function(orderList) {
      console.log('Going to re-run ' + orderList.length + ' orders.');
      for (var i=0; i < orderList.length; i++) {
        var shopifyOrder = orderList[i];
        console.log('Shopify Order #' + orderNum + ' id=' + shopifyOrder.id);
        processOrder(shopifyOrder);
      }
    });
}

// Helper function adds the order to Xero as a draft invoice
var processOrder = function(shopifyOrder) {
  console.log('Starting to process order: ' + shopifyOrder.order_number);
  wisecracker.checkShopifyCustomer(shopifyOrder.customer, function(xeroContact) {

    // Now create the Xero Invoice
    wisecracker.addXeroInvoice(shopifyOrder, xeroContact, function(xeroInvoice) {
      console.log('Xero Invoice ' + shopifyOrder.order_number + ' added/updated.');
    });
  });
}

checkForNewOrders();
// checkOrder(-1);