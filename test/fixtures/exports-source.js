/**
 * This is foo.
 */
exports.foo = function() {}

exports.boo = void 0;
/**
 * This is boo.
 */
exports.boo = () => {};

function test() {
};
var X = 'x';
exports.test = test, exports.X = X;

exports.default = function noAssignmentToGlobal() {};
