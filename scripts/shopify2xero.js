const shopify = require('../lib/shopify.js');
const xero = require('../lib/xero.js');

// Initialize the libraries
xero.init();
shopify.init();

// Read the latest SHOP order from Xero
var whereFilter = 'Type=="ACCREC" AND InvoiceNumber.StartsWith("SHOP")';
var orderBy = 'Date DESC';
var pageNum = 1;
xero.getInvoices(whereFilter, orderBy, pageNum, function(body) {

  // Get the oldest invoice reference id
  var ref = body.Invoices[0].Reference;
  console.log('Xero got invoices, oldest ref = ' + ref);

  // Get the shopify orders since that reference
  shopify.getOrders(ref)
    .then(function(orders) {
      console.log('Holy cow we are behind by ' + orders.length + ' orders');
      for (var i=0; i < orders.length; i++) {
        var order = orders[i];
        processOrder(order);
        // break;
      }
    });
});

// Helper function adds the order to Xero as a draft invoice
var processOrder = function(shopifyOrder) {
  console.log('Starting to process order: ' + shopifyOrder.order_number);
  checkShopifyCustomer(shopifyOrder.customer, function(xeroContact) {

    // Now create the Xero Invoice
    addXeroInvoice(shopifyOrder, xeroContact, function(xeroInvoice) {
      console.log('Xero Invoice ' + shopifyOrder.order_number + ' added.');
    });
  });
}

// Helper function sees if a customer is in Xero and adds if they're not there
var checkShopifyCustomer = function(shopifyCustomer, cb) {
  
  // Create the name and where filter for Xero API call
  var customerName = shopifyCustomer.first_name.trim();
  customerName += ' ' + shopifyCustomer.last_name.trim();
  var whereFilter = 'Name=="' + customerName + '"';
  
  // Lookup this contact in Xero and create if necessary
  xero.getContacts(whereFilter, function(apiGetBody) {
    if (apiGetBody.Contacts.length == 0) {
      console.log(customerName + ' does not exist in Xero, adding.');
      addXeroContact(customerName, shopifyCustomer, cb);
    } else {
      console.log(customerName + ' is in Xero already.');
      cb(apiGetBody.Contacts[0]);
    }
  });
}

// Helper function to create Xero contact from Shopify customer
var addXeroContact = function addContact(customerName, shopifyCustomer, cb) {
  
  // Create the contact details
  var newContact = {
    Contact: {
      Name: customerName,
      FirstName: shopifyCustomer.first_name.trim(),
      LastName: shopifyCustomer.last_name.trim(),
      EmailAddress: shopifyCustomer.email
    }
  }

  // Add the contact to Xero
  xero.addContact(newContact, 'Contacts', function(apiPostBody) {

    // Lookup the contact we just added and return it
    var whereFilter = 'Name=="' + customerName + '"';
    xero.getContacts(whereFilter, function(apiGetBody) {
      cb(apiGetBody.Contacts[0]);
    });
  });
}

// Helper function to add an invoice in Xero
var addXeroInvoice = function addXeroInvoice(shopifyOrder, xeroContact, cb) {
  var jsonPayload = {
    Invoice: {
      Type: 'ACCREC',
      Contact: {
        ContactID: xeroContact.ContactID
      },
      Date: shopifyOrder.processed_at.substring(0, 10),
      DueDate: shopifyOrder.processed_at.substring(0, 10),
      InvoiceNumber: 'SHOP#' + shopifyOrder.order_number,
      Reference: shopifyOrder.id.toString(),
      LineItems: []
    }
  }

  // Add the line items to the invoice
  for(var i=0; i < shopifyOrder.line_items.length; i++) {
    var item = shopifyOrder.line_items[i];
    jsonPayload.Invoice.LineItems.push(makeLineItem(item, shopifyOrder.order_number));
  }

  // Make a line item for shipping
  jsonPayload.Invoice.LineItems.push(makeShipping(shopifyOrder.shipping_lines[0]));
  // console.log(jsonPayload.Invoice);
  xero.addInvoice(jsonPayload, 'Invoices', cb);
}

var makeLineItem = function makeLineItem(item, invoice) {
  var lineItem = {
    LineItem: {
      Description: item.name,
      Quantity: item.quantity,
      UnitAmount: item.price,
      ItemCode: item.sku,
      TaxType: getTaxType(item, invoice),
      AccountCode: '400'
    }
  }
  return lineItem;
}

var makeShipping = function makeShipping(ship) {
  var lineItem = {
    LineItem: {
      Description: ship.code,
      Quantity: 1,
      UnitAmount: ship.price,
      ItemCode: 'SHUSPSDOM',
      TaxType: 'NONE',
      AccountCode: '400'
    }
  }
  return lineItem;
}

// Helper function to figure out the correct TAX code
// TAX002 (8.75% State + County)
// TAX003 (6.00% State + County)
// TAX004 (7.00% State + County)
// TAX005 (7.50% State only)
// TAX006 (8.00% State + County)
var getTaxType = function getTaxType(item, orderNumber) {
  var taxType = 'NONE';

  // No tax on these
  if (item.sku.substring(0,3) == 'ADG') {
    return 'NONE';
  }

  // Figure out the correct taxType
  // 1 line = state only, 2 lines = state + county
  if (item.tax_lines.count == 1) {
    if (item.tax_lines[0].title == 'CA State Tax') {
      taxType = 'TAX005';
    } else {
      console.err('** Need to fix state tax for ' + orderNumber);
    }
  } else if (item.tax_lines.count == 2) {
    var taxRate = item.tax_lines[0].rate + item.tax_lines[1].rate;
    if (taxRate == 0.06) {
      taxType = 'TAX003';
    } else if (taxRate == 0.07) {
      taxType = 'TAX004';
    } else if (taxRate == 0.08) {
      taxType = 'TAX006'
    } else if (taxRate == 0.0875) {
      taxType = 'TAX002';
    } else {
      console.error('*** Need to fix state + county tax for ' + orderNumber);
    }
  }
  return taxType;
}