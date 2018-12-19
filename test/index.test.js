var test = require('tap').test;
var fs = require('fs');

var gasEntryGenerator = require('../');

test('gas-entry-generator', function(t) {
  var source = fs.readFileSync(__dirname + '/fixtures/source.js', {encoding: 'utf8'});
  var expected = fs.readFileSync(__dirname + '/fixtures/expected.js', {encoding: 'utf8'});
  var entryFunctions = gasEntryGenerator(source, {comment: true});
  t.equal(entryFunctions.toString(), expected.toString(), 'actual output will match expected');
  t.end();
});
