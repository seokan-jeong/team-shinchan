// node --test port of sindresorhus/leven's upstream test.js (@ 235e775), MIT.
// Same assertions as the upstream AVA suite, rewritten to node:test + node:assert
// so the fixture grades via `node --test` with zero npm install (DEC-2 zero-toolchain).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import leven, {closestMatch} from './index.js';

test('main', () => {
	assert.equal(leven('a', 'b'), 1);
	assert.equal(leven('ab', 'ac'), 1);
	assert.equal(leven('ac', 'bc'), 1);
	assert.equal(leven('abc', 'axc'), 1);
	assert.equal(leven('kitten', 'sitting'), 3);
	assert.equal(leven('xabxcdxxefxgx', '1ab2cd34ef5g6'), 6);
	assert.equal(leven('cat', 'cow'), 2);
	assert.equal(leven('xabxcdxxefxgx', 'abcdefg'), 6);
	assert.equal(leven('javawasneat', 'scalaisgreat'), 7);
	assert.equal(leven('example', 'samples'), 3);
	assert.equal(leven('sturgeon', 'urgently'), 6);
	assert.equal(leven('levenshtein', 'frankenstein'), 6);
	assert.equal(leven('distance', 'difference'), 5);
	assert.equal(leven('因為我是中國人所以我會說中文', '因為我是英國人所以我會說英文'), 2);
});

test('maxDistance option', () => {
	assert.equal(leven('abcdef', '123456'), 6);
	assert.equal(leven('abcdef', 'abcdefg'), 1);

	assert.equal(leven('abcdef', '123456', {maxDistance: 3}), 3);
	assert.equal(leven('abcdef', 'abcdefg', {maxDistance: 3}), 1);

	assert.equal(leven('kitten', 'sitting', {maxDistance: 2}), 2);
	assert.equal(leven('cat', 'cow', {maxDistance: 5}), 2);
	assert.equal(leven('same', 'same', {maxDistance: 1}), 0);

	assert.equal(leven('a', 'abcdefgh', {maxDistance: 3}), 3);
	assert.equal(leven('short', 'muchlongerstringhere', {maxDistance: 5}), 5);

	assert.equal(leven('', 'abc', {maxDistance: 2}), 2);
	assert.equal(leven('', 'abc', {maxDistance: 10}), 3);
	assert.equal(leven('abc', '', {maxDistance: 2}), 2);
	assert.equal(leven('abc', 'abc', {maxDistance: 0}), 0);
	assert.equal(leven('abc', 'abd', {maxDistance: 0}), 0);

	assert.equal(leven('abcdefghijklmnopqrstuvwxyz', '1234567890', {maxDistance: 3}), 3);
	assert.equal(leven('verylongstringhere', 'completelydifferent', {maxDistance: 1}), 1);

	assert.equal(leven('foo', 'bar'), 3);
	assert.equal(leven('foo', 'bar', undefined), 3);
	assert.equal(leven('foo', 'bar', null), 3);
});

test('closestMatch', () => {
	const result = closestMatch('kitten', ['sitting', 'kitchen', 'mittens']);
	assert.ok(['kitchen', 'mittens'].includes(result));
	assert.equal(closestMatch('hello', ['jello', 'yellow', 'bellow']), 'jello');

	assert.equal(closestMatch('foo', ['bar', 'foo', 'baz']), 'foo');

	assert.equal(closestMatch('test', ['testing']), 'testing');

	assert.equal(closestMatch('test', []), undefined);
	assert.equal(closestMatch('test', undefined), undefined);
	assert.equal(closestMatch('test', null), undefined);

	assert.equal(closestMatch('a', ['b', 'c', 'd']), 'b');

	assert.equal(closestMatch('kitten', ['sitting', 'kitchen', 'mittens'], {maxDistance: 2}), 'kitchen');
	assert.equal(closestMatch('kitten', ['sitting', 'kitchen', 'mittens'], {maxDistance: 1}), undefined);
	assert.equal(closestMatch('abcdef', ['123456', 'abcdefg', '1234567890'], {maxDistance: 2}), 'abcdefg');

	assert.equal(closestMatch('abcdef', ['123456', '1234567890'], {maxDistance: 2}), undefined);

	assert.equal(closestMatch('', ['a', 'ab', 'abc']), 'a');
	assert.equal(closestMatch('abc', ['', 'a', 'ab']), 'ab');

	assert.equal(closestMatch('Hello', ['hello', 'HELLO', 'hELLo']), 'hello');

	assert.equal(closestMatch('café', ['cafe', 'caffè', 'café']), 'café');
	assert.equal(closestMatch('你好', ['您好', '你们好', '大家好']), '您好');

	assert.equal(closestMatch('abc', ['ab', 'bc', 'ac']), 'ab');

	const longCandidates = [
		'verylongstringwithlotsofcharacters',
		'anotherlongstringcompletlydifferent',
		'shortstr',
		'test',
	];
	assert.equal(closestMatch('test', longCandidates), 'test');
	assert.equal(closestMatch('testing', longCandidates), 'test');

	assert.equal(closestMatch('test', ['a', 'b', 'c', 'test', 'd', 'e']), 'test');

	assert.equal(closestMatch('test', ['test', 'tests', 'testing'], {maxDistance: 0}), 'test');
	assert.equal(closestMatch('test', ['tests', 'testing'], {maxDistance: 0}), undefined);

	assert.equal(closestMatch('abc', ['ab', 'ab', 'ab', 'abcd', 'abcd']), 'ab');

	assert.equal(closestMatch('ab', ['a', 'abc']), 'a');

	const largeArray = Array.from({length: 50}, (_, index) => 'x'.repeat(index));
	largeArray.push('test');
	assert.equal(closestMatch('test', largeArray), 'test');

	assert.equal(closestMatch('abc', ['ab', 'abcd', 'xyz'], {maxDistance: 2}), 'ab');

	const largeTieArray = Array.from({length: 50}, (_, i) => `z${i}`);
	largeTieArray.push('ab', 'ac', 'ad');
	assert.equal(closestMatch('a', largeTieArray), 'ab');

	assert.equal(closestMatch('test', ['testing', 'tests'], {maxDistance: 2}), 'tests');
	assert.equal(closestMatch('test', ['testing', 'tests']), 'tests');

	assert.equal(closestMatch('test', ['testing'], {maxDistance: 0}), undefined);
});
