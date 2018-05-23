# node-sql
_sql string builder for node_ - supports PostgreSQL, mysql, Microsoft SQL Server, Oracle and sqlite dialects.

[![Build Status](https://secure.travis-ci.org/brianc/node-sql.png)](http://travis-ci.org/TokyoFarmer/node-sql-2)

## install

```sh
$ npm install sql
```

## use

```js
//require the module
var sql = require('sql');

//(optionally) set the SQL dialect
sql.setDialect('postgres');
//possible dialects: mssql, mysql, postgres (default), sqlite

//first we define our tables
var user = sql.define({
  name: 'user',
  columns: ['id', 'name', 'email', 'lastLogin']
});

var post = sql.define({
  name: 'post',
  columns: ['id', 'userId', 'date', 'title', 'body']
});

//now let's make a simple query
var query = user.select(user.star()).from(user).toQuery();
console.log(query.text); //SELECT "user".* FROM "user"

//something more interesting
var query = user
    .select(user.id)
    .from(user)
    .where(
      user.name.equals('boom').and(user.id.equals(1))
    ).or(
      user.name.equals('bang').and(user.id.equals(2))
    ).toQuery();

//query is parameterized by default
console.log(query.text); //SELECT "user"."id" FROM "user" WHERE ((("user"."name" = $1) AND ("user"."id" = $2)) OR (("user"."name" = $3) AND ("user"."id" = $4)))

console.log(query.values); //['boom', 1, 'bang', 2]

//queries can be named
var query = user.select(user.star()).from(user).toNamedQuery('user.all');
console.log(query.name); //'user.all'

//how about a join?
var query = user.select(user.name, post.body)
  .from(user.join(post).on(user.id.equals(post.userId))).toQuery();

console.log(query.text); //'SELECT "user"."name", "post"."body" FROM "user" INNER JOIN "post" ON ("user"."id" = "post"."userId")'

//this also makes parts of your queries composable, which is handy

var friendship = sql.define({
  name: 'friendship',
  columns: ['userId', 'friendId']
});

var friends = user.as('friends');
var userToFriends = user
  .leftJoin(friendship).on(user.id.equals(friendship.userId))
  .leftJoin(friends).on(friendship.friendId.equals(friends.id));

//and now...compose...
var friendsWhoHaveLoggedInQuery = user.from(userToFriends).where(friends.lastLogin.isNotNull());
//SELECT * FROM "user"
//LEFT JOIN "friendship" ON ("user"."id" = "friendship"."userId")
//LEFT JOIN "user" AS "friends" ON ("friendship"."friendId" = "friends"."id")
//WHERE "friends"."lastLogin" IS NOT NULL

var friendsWhoUseGmailQuery = user.from(userToFriends).where(friends.email.like('%@gmail.com'));
//SELECT * FROM "user"
//LEFT JOIN "friendship" ON ("user"."id" = "friendship"."userId")
//LEFT JOIN "user" AS "friends" ON ("friendship"."friendId" = "friends"."id")
//WHERE "friends"."email" LIKE %1

//Using different property names for columns
//helpful if your column name is long or not camelCase
var user = sql.define({
  name: 'user',
  columns: [{
      name: 'id'
    }, {
      name: 'state_or_province',
      property: 'state'
    }
  ]
});

//now, instead of user.state_or_province, you can just use user.state
console.log(user.select().where(user.state.equals('WA')).toQuery().text);
// "SELECT "user".* FROM "user" WHERE ("user"."state_or_province" = $1)"
```

For more examples, check out [node-sql-examples](https://node-sql-examples.github.io/)

## from the command line
You can use the [sql-generate module](https://github.com/tmont/node-sql-generate)
to automatically generate definition files from a database instance. For example,
running `node-sql-generate --dsn "mysql://user:password@host/database"` will generate
something similar to:

```javascript
// autogenerated by node-sql-generate v0.0.1 on Tue May 21 2013 01:04:12 GMT-0700 (PDT)
var sql = require('sql');

/**
 * SQL definition for database.bar
 */
exports.bar = sql.define({
    name: 'bar',
    columns: [
        'id',
        'foo_id'
    ]
});

/**
 * SQL definition for database.foo
 */
exports.foo = sql.define({
    name: 'foo',
    columns: [
        'id',
        'field_1',
        'foo_bar_baz'
    ]
});

/**
 * Adding a column to an existing table:
 */
var model = sql.define({ name: 'foo', columns: [] });
model.addColumn('id');

// If you try to add another column "id", node-sql will throw an error.
// You can suppress that error via:
model.addColumn('id', { noisy: false });
```

Read the module's documentation for more details.

## contributing

We __love__ contributions.

node-sql wouldn't be anything without all the contributors and collaborators who've worked on it.
If you'd like to become a collaborator here's how it's done:

1. fork the repo
2. `git pull https://github.com/(your_username)/node-sql`
3. `cd node-sql`
4. `npm install`
5. `npm test`

At this point the tests should pass for you.  If they don't pass please open an issue with the output or you can even send me an email directly.
My email address is on my github profile and also on every commit I contributed in the repo.

Once the tests are passing, modify as you see fit.  _Please_ make sure you write tests to cover your modifications.  Once you're ready, commit your changes and submit a pull request.

__As long as your pull request doesn't have completely off-the-wall changes and it does have tests we will almost always merge it and push it to npm__

If you think your changes are too off-the-wall, open an issue or a pull-request without code so we can discuss them before you begin.

Usually after a few high-quality pull requests and friendly interactions we will gladly share collaboration rights with you.

After all, open source belongs to everyone.


## license
MIT
