# gas-entry-generator [![NPM version][npm-image]][npm-url] [![Build Status][github-actions-image]][github-actions-url] [![Dependency Status][daviddm-image]][daviddm-url]  [![Coverage percentage][coveralls-image]][coveralls-url]

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
const fs = require('fs');
const { generate } = require('gas-entry-generator');

const fooSource = fs.readFileSync('foo.js', {encoding: 'utf8'});
const options = {
  comment: true
};
const output = generate(fooSource, options);
console.log(output.entryPointFunctions);
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

## geranate global assignment expressions from exports.*

foo.ts:
```ts
/**
 * comment for foo function.
 */
exports.foo = () => 'bar';
```

generate.js:
```js
const fs = require('fs');
const { generate } = require('gas-entry-generator');

const fooSource = fs.readFileSync('foo.js', {encoding: 'utf8'});
const options = {
  comment: true,
  autoGlobalExports: true // Enable to detect exports.* to generate entry point functions.
};
const output = generate(fooSource, options);
console.log(output.entryPointFunctions);
console.log('-----');
console.log(output.globalAssignments);
```

Console output:
```
/**
 * comment for foo function.
 */
function foo() {
}
-----
global.foo = exports.foo;
```

[npm-image]: https://badge.fury.io/js/gas-entry-generator.svg
[npm-url]: https://npmjs.org/package/gas-entry-generator
[github-actions-image]: https://github.com/fossamagna/gas-entry-generator/actions/workflows/test.yml/badge.svg?branch=master
[github-actions-url]: https://github.com/fossamagna/gas-entry-generator/actions/workflows/test.yml?branch=master
[daviddm-image]: https://david-dm.org/fossamagna/gas-entry-generator.svg
[daviddm-url]: https://david-dm.org/fossamagna/gas-entry-generator
[coveralls-image]: https://coveralls.io/repos/github/fossamagna/gas-entry-generator/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/fossamagna/gas-entry-generator?branch=master
