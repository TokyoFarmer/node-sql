var sql = require(__dirname + '/../lib');
var assert = require('assert');

suite('execution', function() {
  var table = sql.define({
    name: 'user',
    columns: ['id', 'created', 'alias']
  });

  let mkExecutor = (results) => ({
    queryAsync(q) {
      return Promise.resolve(results);
    }
  });

  test('execAsync', async () => {
    return table.where({id: 1}).execAsync(mkExecutor([1]));
  });

  test('getAsync single', async () => {
    assert.equal(await table.where({id: 1}).getAsync(mkExecutor([1])), 1);
  });

  test('getAsync no results', async () => {
    assert.equal(await table.where({id: 1}).getAsync(mkExecutor([])), undefined);
  });

  test('singleAsync single', async () => {
    assert.equal(await table.where({id: 1}).singleAsync(mkExecutor([1])), 1);
  });

  test('singleAsync no results', async () => {
    try {
      await table.where({id: 1}).singleAsync(mkExecutor([]));
    } catch (e) {
      assert.equal(e.message, 'No result found');
    }
  });

  test('singleAsync more results', async () => {
    try {
      await table.where({id: 1}).singleAsync(mkExecutor([1,2]));
    } catch (e) {
      assert.equal(e.message, 'More than one result found');
    }
  });

  test('toArrayAsync', async () => {
    assert.deepEqual(await table.where({id: 1}).toArrayAsync(mkExecutor([1,2,3])), [1,2,3]);
  });
});