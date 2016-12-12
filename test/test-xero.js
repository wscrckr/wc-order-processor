const assert = require('assert');
const xero = require('../lib/xero.js');

describe('Xero API', function() {
  this.timeout(30000);
  it('initializes xero library', function(done) {
    var initResult = xero.init();
    assert(initResult, 'Failed Xero Connection.');
    done();
  });

  it('gets some SHOP invoices', function(done) {
    var whereFilter = 'Type=="ACCREC" AND InvoiceNumber.StartsWith("SHOP")';
    var orderBy = 'Date DESC';
    var pageNum = 1;
    xero.getInvoices(whereFilter, orderBy, pageNum, function(error, response, body) {
      if (!error & response.statusCode == 200) {
        console.log('There are: ' + body.Invoices.length + ' invoices.');
        console.log('Most recent SHOP invoice: ' + body.Invoices[0].InvoiceNumber);
        console.log('Most recent SHOP id (ref): ' + body.Invoices[0].Reference);
      } else {
        if (error) {
          assert.fail(error);
        } else {
          console.log(body);
          assert.fail('Non-success status code: ' + response.statusCode);
        }
      }
      done();
    });
  })
});
