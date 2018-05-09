const shopify = require('../lib/shopify.js');
const xero = require('../lib/xero.js');
const wisecracker = require('../lib/wisecracker.js');

var program = require('commander');

// Initialize the libraries
xero.init();
shopify.init();

// Get the latest / newest SHOP order from Xero
var checkForNewOrders = function checkForNewOrders() {
  var whereFilter = 'Type=="ACCREC" AND InvoiceNumber.StartsWith("SHOP")';
  var orderBy = 'InvoiceNumber DESC';
  var pageNum = 1;
  xero.getInvoices(whereFilter, orderBy, pageNum)
  .then(function(body) {

    // Get the newest invoice reference i
    var invoice = body.Invoices[0];
    var reference = body.Invoices[0].Reference;
    console.log('Xero newest invoice: ' + invoice.InvoiceNumber);

    // Get the Shopify orders since that reference
    return shopify.getOrdersSince(reference);
  })
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
  })
  .catch(function(err) {
    console.error('checkForNewOrders failed: ' + err);
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
  })
  .catch(function(err) {
    console.error('checkOrder failed: ' + err);
  });
}

// Helper function adds the order to Xero as a draft invoice
var processOrder = function(shopifyOrder) {
  
  var shopifyCustomer = shopifyOrder.customer;
  var customerName = '';
  
  // Null checks
  if (shopifyCustomer.first_name != null) {
    customerName = shopifyCustomer.first_name.trim();
  }
  if (shopifyCustomer.last_name != null) {
    customerName += ' ' + shopifyCustomer.last_name.trim();
  }
  
  // If they only have a last name we'll trim the leading space
  customerName = customerName.trim();
  console.log('Processing Order: ' + shopifyOrder.order_number + ' (' + customerName + ')');
  
  wisecracker.lookupCustomerInXero(customerName)
  .then(function(xeroResponse) {

    // If the customer is not found, add them to Xero
    if (xeroResponse.Contacts.length == 0) {
      var whereFilter = 'Name=="' + customerName + '"';
      return wisecracker.addXeroContact(customerName, shopifyCustomer)
    } else {
      return xeroResponse;
    }
  })
  .then(function(xeroResponse) {
    console.log('Getting contact id for ' + customerName + ' from Xero');
    var whereFilter = 'Name=="' + customerName + '"';
    return xero.getContacts(whereFilter);
  })
  .then(function(xeroContactResponse) {
    var xeroContact = xeroContactResponse.Contacts[0];
    console.log('Contact id for ' + customerName + ' is ' + xeroContact.ContactID);
    return wisecracker.addShopifyOrder2Xero(shopifyOrder, xeroContact)
  })
  .then(function(xeroInvoice) {
     console.log('Xero Invoice ' + shopifyOrder.order_number + ' added/updated.');
   })
  .catch(function(err) {
    console.error('processOrder failed: ' + err);
   });
}

program
  .option('--order [id]', 'Load a specific order')
  .parse(process.argv);

if (program.order) {
  // Check just for this specific order
  console.log('Checking just for order', program.order);
  checkOrder(program.order);
} else {
  // Default to trying all orders
  console.log(program);
  console.log('Checking for all new orders');
  checkForNewOrders();
}
