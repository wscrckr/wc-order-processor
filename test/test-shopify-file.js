const assert = require('assert');
const fs = require('fs');

const testFile = 'test/shopify-order.txt';
var content = '';

describe('Shopify File', function() {
  it('reads the data test file: ' + testFile, function(done) {
    fs.readFile(testFile, 'utf-8', function(err, data) {
      assert.ifError(err);
      content = data;
      done();
    });
  });

  it('parses the Shopify test file', function(done) {
    var jcontent = JSON.parse(content);
    assert.equal(jcontent.id, 123456, 'Expect the id to be 123456');
    assert.equal(jcontent.email, 'jon@doe.ca', 'Expect the email to be \'jon@doe.ca\'');
    done();
  });
});
