import { foo } from './esm-exports';
export { bar } from './esm-exports';
/**
 * Leading Block Comment for foo.
 */
// leading line comment for foo
globalThis.foo = foo;
export function boo() { };