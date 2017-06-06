var xero = require('./xero.js');
var shopify = require('./shopify.js');

var wisecracker = {};

// Helper function sees if a customer is in Xero and adds if they're not there
// wisecracker.lookupCustomerInXero = function lookupCustomerInXero(shopifyCustomer) {
wisecracker.lookupCustomerInXero = function lookupCustomerInXero(customerName) {
  
  // Create the name and where filter for Xero API call
  // var customerName = shopifyCustomer.first_name.trim();
  // customerName += ' ' + shopifyCustomer.last_name.trim();
  var whereFilter = 'Name=="' + customerName + '"';
  
  // Lookup this contact in Xero and create if necessary
  return xero.getContacts(whereFilter);
}

// Helper function to create Xero contact from Shopify customer
wisecracker.addXeroContact = function addXeroContact(customerName, shopifyCustomer) {
  
  // More null checks
  var fname = shopifyCustomer.first_name;
  if (fname != null) { fname.trim(); }
  var lname = shopifyCustomer.last_name;
  if (lname != null) { lname.trim(); }

  // Create the contact details
  var newContact = {
    Contact: {
      Name: customerName,
      FirstName: fname,
      LastName: lname,
      EmailAddress: shopifyCustomer.email
    }
  }

  // Add the contact to Xero
  return xero.addContact(newContact, 'Contacts');
}

// Helper function to convert Amazon order to invoice in Xero
wisecracker.addAmazonOrder2Xero = function addAmazonOrder2Xero(mwsOrder, lineItems, xeroContact) {
  var mwsId = mwsOrder.AmazonOrderId;
  var jsonPayload = {
    Invoice: {
      Type: 'ACCREC',
      Contact: {
        ContactID: xeroContact.ContactID
      },
      Date: mwsOrder.PurchaseDate.substring(0, 10),
      DueDate: mwsOrder.PurchaseDate.substring(0, 10),
      InvoiceNumber: 'AMZN#' + mwsId,
      Reference: mwsId,
      LineItems: []
    }
  }

  // Add the line items to the invoice
  for(var i=0; i < lineItems.length; i++) {
    var amazonItem = lineItems[i];
    var xeroLineItem = makeAmazonLineItem(amazonItem);
    jsonPayload.Invoice.LineItems.push(xeroLineItem);
  }

  // Make a line item for shipping
  var xeroShipping = makeShipping('SHUSPSDOM', 5);
  jsonPayload.Invoice.LineItems.push(xeroShipping);
  // console.log(jsonPayload.Invoice);
  // console.log(jsonPayload.Invoice.LineItems);
  return xero.addInvoice(jsonPayload, 'Invoices');
}

// Helper function to convert Shopify order to invoice in Xero
wisecracker.addShopifyOrder2Xero = function addShopifyOrder2Xero(shopifyOrder, xeroContact) {
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
    var xeroLineItem = makeShopifyLineItem(shopifyItem, discountPct, orderNum);
    jsonPayload.Invoice.LineItems.push(xeroLineItem);
  }

  // Make a line item for shipping
  var ship = shopifyOrder.shipping_lines[0];
  var xeroShipping = makeShipping(ship.code, ship.price);
  jsonPayload.Invoice.LineItems.push(xeroShipping);
  // console.log(jsonPayload.Invoice);
  // console.log(jsonPayload.Invoice.LineItems);
  return xero.addInvoice(jsonPayload, 'Invoices');
}

var makeShopifyLineItem = function makeShopifyLineItem(item, discountPct, invoice) {
  if (item.sku.startsWith('WCCUST')) {
    var orderQty = item.quantity;
    var skuQty = item.sku.substring(item.sku.indexOf('-') + 1);
    var newQty = orderQty * skuQty;
    var newSku = item.sku.substring(0, item.sku.indexOf('-'));
    var newPrice = item.price / newQty;
    console.log('- Old sku: ' + item.sku + ' and qty: ' + item.quantity + ' and price: ' + item.price);
    item.sku = newSku;
    item.quantity = newQty;
    item.price = newPrice;
    console.log('- New sku: ' + item.sku + ' and qty: ' + item.quantity + ' and price: ' + item.price);
  }
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

// Helper function to create the normal line item
var makeAmazonLineItem = function makeAmazonLineItem(item) {
  var lineItem = {
    LineItem: {
      Description: item.Title,
      Quantity: item.QuantityOrdered,
      UnitAmount: item.ItemPrice.Amount,
      ItemCode: item.SellerSKU,
      TaxType: 'NONE',
      AccountCode: '400'
    }
  }
  return lineItem;
}

// Helper function to create the shipping line item
var makeShipping = function makeShipping(code, price) {
  var lineItem = {
    LineItem: {
      Description: code,
      Quantity: 1,
      UnitAmount: price,
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