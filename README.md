# gas-entry-generator [![NPM version][npm-image]][npm-url]  [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]  [![Coverage percentage][coveralls-image]][coveralls-url] [![Greenkeeper badge](https://badges.greenkeeper.io/fossamagna/gas-entry-generator.svg)](https://greenkeeper.io/)

Top level function generator for Google Apps Script.

## About

In Google Apps Script, it must be top level function declaration that entry point called from [google.script.run](https://developers.google.com/apps-script/guides/html/reference/run).
`gas-entry-generator` generate a top level function declaration statement, when it detect a function assignment expression to `global` object.

## Installation

```sh
$ npm install gas-entry-generator --save-dev
```

## example

foo.js:
```js
/**
 * comment for foo function.
 */
global.foo = function () {
};
```

generate.js:
```js
var fs = require('fs');
var gasEntryGenerator = require('gas-entry-generator');

var fooSource = fs.readFileSync('foo.js', {encoding: 'utf8'});
var options = {
  comment: true
};
var entryFunction = gasEntryGenerator(fooSource, options);
console.log(entryFunction);
```

Console output:
```js
/**
 * comment for foo function.
 */
function foo() {
}
```

Execute to generate function as entry point.
```sh
$ node generate.js
```

[npm-image]: https://badge.fury.io/js/gas-entry-generator.svg
[npm-url]: https://npmjs.org/package/gas-entry-generator
[travis-image]: https://travis-ci.org/fossamagna/gas-entry-generator.svg?branch=master
[travis-url]: https://travis-ci.org/fossamagna/gas-entry-generator
[daviddm-image]: https://david-dm.org/fossamagna/gas-entry-generator.svg
[daviddm-url]: https://david-dm.org/fossamagna/gas-entry-generator
[coveralls-image]: https://coveralls.io/repos/github/fossamagna/gas-entry-generator/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/fossamagna/gas-entry-generator?branch=master
