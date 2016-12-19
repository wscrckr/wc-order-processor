var xero = require('./xero.js');
var shopify = require('./shopify.js');

var wisecracker = {};

// Helper function sees if a customer is in Xero and adds if they're not there
wisecracker.lookupCustomerInXero = function lookupCustomerInXero(shopifyCustomer) {
  
  // Create the name and where filter for Xero API call
  var customerName = shopifyCustomer.first_name.trim();
  customerName += ' ' + shopifyCustomer.last_name.trim();
  var whereFilter = 'Name=="' + customerName + '"';
  
  // Lookup this contact in Xero and create if necessary
  return xero.getContacts(whereFilter);
}

// Helper function to create Xero contact from Shopify customer
wisecracker.addXeroContact = function addXeroContact(customerName, shopifyCustomer) {
  
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
  return xero.addContact(newContact, 'Contacts');
}

// Helper function to add an invoice in Xero
wisecracker.addXeroInvoice = function addXeroInvoice(shopifyOrder, xeroContact) {
  var orderNum = shopifyOrder.order_number;
  var jsonPayload = {
    Invoice: {
      Type: 'ACCREC',
      Contact: {
        ContactID: xeroContact.ContactID
      },
      Date: shopifyOrder.processed_at.substring(0, 10),
      DueDate: shopifyOrder.processed_at.substring(0, 10),
      InvoiceNumber: 'SHOP#' + orderNum,
      Reference: shopifyOrder.id.toString(),
      LineItems: []
    }
  }

  // Check if there was a discount code
  var discountPct = 0;
  if (shopifyOrder.discount_codes.length != 0) {
    var discount = parseFloat(shopifyOrder.total_discounts);
    var subtotal = parseFloat(shopifyOrder.subtotal_price);
    console.log('- #' + orderNum + ' has discount of: ' + discount);
    var code = shopifyOrder.discount_codes[0];
    if (code.type == 'percentage') {
      var discountPct = 100 * discount / (discount + subtotal);
      console.log('- #' + orderNum + ' percentage discount: ' + discountPct);
    }
  }

  // Add the line items to the invoice
  for(var i=0; i < shopifyOrder.line_items.length; i++) {
    var shopifyItem = shopifyOrder.line_items[i];
    var xeroLineItem = makeLineItem(shopifyItem, discountPct, orderNum);
    jsonPayload.Invoice.LineItems.push(xeroLineItem);
  }

  // Make a line item for shipping
  var xeroShipping = makeShipping(shopifyOrder.shipping_lines[0]);
  jsonPayload.Invoice.LineItems.push(xeroShipping);
  // console.log(jsonPayload.Invoice);
  return xero.addInvoice(jsonPayload, 'Invoices'); //, cb);
}


// Helper function to create the normal line item
var makeLineItem = function makeLineItem(item, discountPct, invoice) {
  var lineItem = {
    LineItem: {
      Description: item.name,
      Quantity: item.quantity,
      UnitAmount: item.price,
      DiscountRate: discountPct,
      ItemCode: item.sku,
      TaxType: getTaxType(item, invoice),
      AccountCode: '400'
    }
  }
  return lineItem;
}

// Helper function to create the shipping line item
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
      console.error('** Need to fix state tax for ' + orderNumber);
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

module.exports = wisecracker;