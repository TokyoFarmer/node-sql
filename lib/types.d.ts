
/**
 * This is an adaptation of https://github.com/doxout/anydb-sql/blob/4e4c0ff4a7f2efb7f820baaafea1f624f1ae0399/d.ts/anydb-sql.d.ts
 * Whole project is MIT licensed, so, we can use it. We also feed back any
 * improvements, questions, concerns.
 */

export type SQLDialects =
  | "mssql"
  | "mysql"
  | "oracle"
  | "postgres"
  | "sqlite"
  ;

export type DBBigInt = string;
export type DBDecimal = string;

export type CastMappings = {
  text: string;
  bigint: DBBigInt;
  int: number;
  date: Date;
  decimal: DBDecimal;
};


export interface OrderByValueNode { }

interface MaybeNamed<Name extends string> {
  name?: Name;
}

interface Named<Name extends string> {
  name: Name;
}

export interface ColumnDefinition<Name extends string, Type> extends MaybeNamed<Name> {
  jsType?: Type;
  dataType: string;
  primaryKey?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
    onUpdate?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
  };
  notNull?: boolean;
  unique?: boolean;
  defaultValue?: Type;
}

export interface TableDefinition<Name extends string, Row> {
  name: Name;
  schema: string;
  columns: { [CName in keyof Row]: CName extends string ? ColumnDefinition<CName, Row[CName]> : never };
  dialect?: SQLDialects;
  isTemporary?: boolean;
  foreignKeys?: {
    table: string,
    columns: (keyof Row)[],
    refColumns: string[],
    onDelete?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
    onUpdate?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
  }
}

export interface QueryLike {
  values: any[]
  text: string
}


export interface QueryExecutor {
  queryAsync<T>(query: QueryLike): Promise<{ rowCount: number, rows: T[] }>
}

export interface Executable<T> {
  execAsync(executor: QueryExecutor): Promise<void>
  /**
   * Get all the results from a query into an array
   * @param executor the executor (e.g. transaction) to fetch the results
   * @return a promise for the list of results
   */
  toArrayAsync(executor: QueryExecutor): Promise<T[]>
  /**
   * Get the first result row from the list, if any.
   * @param executor the executor (e.g. transaction) to fetch the result
   * @return a promise of the result, null if a row doesn't exist
   */
  getAsync(executor: QueryExecutor):Promise<T>
  /**
   * Get the first result row from the list, if any.
   * @param executor the executor (e.g. transaction) to fetch the result
   * @return a promise of the result, or throws an error if it doesn't exist
   */
  firstAsync(executor: QueryExecutor):Promise<T>
  /**
   * Get the first result row from the list, if any.
   * @param executor the executor (e.g. transaction) to fetch the result
   * @return a promise of the result, or throws an error if no results or more than one result.
   */
  singleAsync(executor: QueryExecutor):Promise<T>
  /**
   * Convert the query to a Query object with the SQL text and arguments
   * @return a QueryLike with text contianing argument placeholder, and an array of arguments
   */
  toQuery(): QueryLike;
}


type TupleUnion<C extends any[]> = C[keyof C & number];



type ColumnNames<C extends Column<string, any>[]> = TupleUnion<
  { [K in keyof C]: C[K] extends Column<infer Name, infer Value> ? Name : never }
>;

type FindColumnWithName<Name extends string, C extends Column<string, any>[]> = TupleUnion<
  { [K in keyof C]: C[K] extends Column<Name, infer Value> ? Value : never }
>;

//@ts-ignore
type RowOf<Cols extends any[]> = { [K in ColumnNames<Cols>]: FindColumnWithName<K, Cols> };

type WhereCondition<T> = BinaryNode | BinaryNode[] | Partial<T>;


interface Queryable<T> {
  /**
   * Change the resultset source. You may use a join of multiple tables
   *
   * Note that this method doesn't change the filtering (where) or projection (select) source, so
   * any results returned or filters applied will be of the original table or resultset
   */
  from(table: TableNode): Query<T>;
  from(statement: string): Query<T>;

  /**
   * Filter the results by the specified conditions. If multiple conditions are passed, they will
   * be joined with AND. A condition may either be a BinaryNode SQL expression, or an object that
   * contains the column names and their desired values e.g. `where({ email: "example@test.com" })`
   * @param nodes either boolean-evaluating conditional expressions or an object
   * @example
   * ```
   * users.where({email: "example@test.com"})
   * users.where(user.primaryEmail.equals(user.secondaryEmail))
   * ```
   */
  where(...nodes: WhereCondition<T>[]): Query<T>;
  /**
   * Create a delete query
   */
  delete(): ModifyingQuery<T>;
  /**
   * Get one or more specific columns from the result set.
   *
   * Only use this method only after `from` and `where`, otherwise you will be modifying the result
   * set shape.
   *
   * You may use multiple columns from several different tables as long as those tables have been
   * joined in a previous `from` call.
   *
   * In addition you may pass aggregate columns as well as rename columns to have different names
   * in the final result set.
   */
  select(): Query<T>;
  select<N1 extends string, T1>(n1: Column<N1, T1>): Query<{ [N in N1]: T1 }>;
  select<N1 extends string, T1, N2 extends string, T2>(
    n1: Column<N1, T1>,
    n2: Column<N2, T2>,
  ): Query<{ [N in N1]: T1 } & { [N in N2]: T2 }>;
  select<N1 extends string, T1, N2 extends string, T2, N3 extends string, T3>(
    n1: Column<N1, T1>,
    n2: Column<N2, T2>,
    n3: Column<N3, T3>,
  ): Query<{ [N in N1]: T1 } & { [N in N2]: T2 } & { [N in N3]: T3 }>;

  select<Cols extends Column<any, any>[]>(...cols: Cols): Query<RowOf<Cols>>;
  select<U>(...nodesOrTables: any[]): Query<U>;

  /**
   * Update columns of the table.
   * @params o - a partial row object matching the keys and values of the table row
   */
  update(o: Partial<T>): ModifyingQuery<T>;

  /**
   * Order results by the specified order criteria. You may obtain ordering criteria by accessing
   * the .asc or .desc properties of columns
   * @example
   * ```
   * users.where(...).order(user.dateRegistered.desc)
   * ```
   */
  order(...criteria: OrderByValueNode[]): Query<T>;

  /**
   * Limit number of results
   * @param l the limit
   */
  limit(l: number): Query<T>;
  /**
   * Getthe result starting the specified offset index
   * @param o the offset
   */
  offset(o: number): Query<T>;
}

export interface NonExecutableQuery<T> extends Queryable<T> {
  /**
   * Group by one or more columns
   * @example
   * ```
   * userPoints.where(userPoints.id.in(userIdList)).select(userPoints.point.sum()).group(userPoints.userId)
   * ```
   */
  group(...nodes: Column<any, any>[]): Query<T>;
  group(nodes: Column<any, any>[]): Query<T>;

  /**
   * Get distinct result based on one or more columns. Use after select()
   */
  distinctOn(...columns: Column<any, any>[]): Query<T>; // todo: Column<any, any> can be more specific
}


export interface Query<T> extends Queryable<T>, NonExecutableQuery<T> { }

export interface SubQuery<T> extends NonExecutableQuery<T> {
  /**
   * Convert the subquery into an exists (subquery)
   */
  exists(): BinaryNode;

  /**
   * Convert the subquery into an NOT EXISTS (subquery)
   */
  notExists(): BinaryNode;
  notExists(subQuery: SubQuery<any>): BinaryNode;
}


export interface ModifyingQuery<T> extends Executable<T> {
  /**
   * Pick columns to return from the modifying query, or use star to return all rows
   */
  returning<Cols extends Column<any, any>[]>(...cols: Cols): Query<RowOf<Cols>>;
  returning<U = T>(star: '*'): Query<U>;

  /**
   * Filter the modifications by the specified conditions. If multiple conditions are passed, they will
   * be joined with AND. A condition may either be a BinaryNode SQL expression, or an object that
   * contains the column names and their desired values e.g. `where({ email: "example@test.com" })`
   *
   * @param nodes either boolean-evaluating conditional expressions or an object
   *
   * @example
   * ```
   * users.where({email: "example@test.com"})
   * users.where(user.primaryEmail.equals(user.secondaryEmail))
   * ```
   */
  where(...nodes: WhereCondition<T>[]): ModifyingQuery<T>;
}

export interface TableNode {
  /**
   * Within a from condition, join this table node with another table node
   */
  join(table: TableNode): JoinTableNode;
  /**
   * Within a from condition, LEFT JOIN this table node with another table node
   */
  leftJoin(table: TableNode): JoinTableNode;
}


export interface JoinTableNode extends TableNode {
  /**
   * Specify the joining condition for a join table node
   *
   * @param filter a binary expression describing the join condition
   *
   * @example
   * users.from(users.join(posts).on(users.id.equals(posts.userId)))
   */
  on(filter: BinaryNode): TableNode;
  on(filter: string): TableNode;
}

interface CreateQuery extends Executable<void> {
  ifNotExists(): Executable<void>;
}
interface DropQuery extends Executable<void> {
  ifExists(): Executable<void>;
}

export type Columns<T> = {
  [Name in keyof T]: Column<Name, T[Name]>
}
export type Table<Name extends string, T> = TableNode & Queryable<T> & Named<Name> & Columns<T> & {
  getName(): string;
  getSchema(): string;

  literal(statement: string): any;

  create(): CreateQuery
  drop(): DropQuery
  as<OtherName extends string>(name: OtherName): Table<OtherName, T>
  update(o: Partial<T>): ModifyingQuery<T>
  insert(row: T): ModifyingQuery<T>;
  insert(rows: T[]): ModifyingQuery<T>;
  select(): Query<T>
  star(): Column<void, void>
  subQuery(): SubQuery<T>;
  columns: Column<any, any>[];
  sql: SQL;
  alter(): AlterQuery<T>;
  indexes(): IndexQuery;
  count(): Query<DBBigInt>;
}

export interface AlterQuery<T> extends Executable<void> {
  addColumn(column: Column<any, any>): AlterQuery<T>;
  addColumn(name: string, options: string): AlterQuery<T>;
  dropColumn(column: Column<any, any> | string): AlterQuery<T>;
  renameColumn(column: Column<any, any>, newColumn: Column<any, any>): AlterQuery<T>;
  renameColumn(column: Column<any, any>, newName: string): AlterQuery<T>;
  renameColumn(name: string, newName: string): AlterQuery<T>;
  rename(newName: string): AlterQuery<T>;
}

export interface IndexQuery {
  create(): IndexCreationQuery;
  create(indexName: string): IndexCreationQuery;
  drop(indexName: string): Executable<void>;
  drop(...columns: Column<any, any>[]): Executable<void>;
}

export interface IndexCreationQuery extends Executable<void> {
  unique(): IndexCreationQuery;
  using(name: string): IndexCreationQuery;
  on(...columns: (Column<any, any> | OrderByValueNode)[]): IndexCreationQuery;
  withParser(parserName: string): IndexCreationQuery;
  fulltext(): IndexCreationQuery;
  spatial(): IndexCreationQuery;
}

export interface SQL {
  functions: {
    LOWER<Name>(c: Column<Name, string>): Column<Name, string>
  }
}

export interface BinaryNode {
  and(node: BinaryNode): BinaryNode
  or(node: BinaryNode): BinaryNode
}

export interface Column<Name, T> {
  name: Name;

  /**
   * The column value can be found in a given array of items or in a subquery
   *
   * @param arr the Array
   * @returns a binary node that can be used in where expressions
   *
   * @example
   * ```
   * users.where(user.email.in(emailArray))
   * ```
   */
  in(arr: T[]): BinaryNode;
  in(subQuery: SubQuery<T>): BinaryNode;

  /**
   * The column value can NOT be found in a given array of items or in a subquery
   *
   * @param arr the Array
   * @returns a binary node that can be used in where expressions
   *
   * @example
   * ```
   * users.where(user.email.notIn(bannedUserEmails))
   * ```
   */
  notIn(arr: T[]): BinaryNode;

  /**
   * Check if the column value equals another (column) value
   */
  equals<U extends T>(node: U | Column<any, U>): BinaryNode;

  /**
   * Check if the column value does NOT equal another (column) value
   */
  notEquals<U extends T>(node: U | Column<any, U>): BinaryNode;

  /**
   * Check if the column value is greater than or equal to another column value
   */
  gte(node: T | Column<any, T> | number | Column<any, number>): BinaryNode;

  /**
   * Check if the column value is less than or equal to another column value
   */
  lte(node: T | Column<any, T> | number | Column<any, number>): BinaryNode;

  /**
   * Check if the column value is greater than another column value
   */
  gt(node: T | Column<any, T> | number | Column<any, number>): BinaryNode;

  /**
   * Check if the column value is less than another column value
   */
  lt(node: T | Column<any, T> | number | Column<any, number>): BinaryNode;

  /**
   * Check if the node matches a LIKE expression. See the database documentation for LIKE expression syntax
   */
  like(str: string): BinaryNode;

  /**
   * Check if the node does NOT match a LIKE expression. See the database documentation for LIKE expression syntax
   */
  notLike(str: string): BinaryNode;

  /**
   * Check if the node matches a case Insensitive LIKE expression.
   * See the database documentation for LIKE expression syntax
   */
  ilike(str: string): BinaryNode;

  /**
   * Check if the node does NOT match a case Insensitive LIKE expression.
   * See the database documentation for LIKE expression syntax
   */
  notILike(str: string): BinaryNode;

  /**
   * Multiply the node with another node or value
   */
  multiply(node: Column<any, T> | Column<any, number> | T | number): Column<any, T>;

  /**
   * Check if the column is null
   */
  isNull(): BinaryNode;

  /**
   * Check if the column is NOT null
   */
  isNotNull(): BinaryNode;

  /**
   * Compute a sum of the column.
   * @deprecated Please use the named variant!
   */
  sum(): Column<any, T>;

  /**
   * Compute a sum of the column and give it a name
   * @param name the new colum name
   */
  sum<Name extends string>(n: Name): Column<Name, T>;

  /**
   * Compute a count of the column or results
   * @deprecated Please use the named variant!
   */
  count(): Column<any, DBBigInt>;

  /**
   * Compute a count of the column or results and give it a name
   * @param name the new colum name
   */
  count<Name extends string>(name: Name): Column<Name, DBBigInt>;

  /**
   * Get the distinct values of this column (without repetition
   *
   * @example
   * ```
   * users.select(user.email.distinct())
   * ```
   */
  distinct(): Column<Name, T>;

  /**
   * Give this column another name in the result set
   *
   * @param name the new name
   *
   * @example
   * ```
   * users.select(user.email.as('electronicMail'))
   * ```
   */
  as<OtherName extends string>(name: OtherName): Column<OtherName, T>;

  /**
   * Get an ascending ordering direction for this column
   */
  ascending: OrderByValueNode;

  /**
   * Get an descending ordering direction for this column
   */
  descending: OrderByValueNode;

  /**
   * Get an ascending ordering direction for this column
   */
  asc: OrderByValueNode;

  /**
   * Get an descending ordering direction for this column
   */
  desc: OrderByValueNode;

  /**
   * Access a JSON key within the specified column
   */
  key<Key extends keyof T>(key: Key): Column<any, T[Key]>;

  /**
   * Access a JSON key within a specified column and convert it to string
   */
  keyText<Key extends keyof T>(key: Key): Column<any, string>;

  contains(key: any): Column<any, any>;
  cast<T extends keyof CastMappings>(type: T): Column<Name, CastMappings[T]>;
}

export function define<Name extends string, T>(map: TableDefinition<Name, T>): Table<Name, T>;
export function setDialect(dialect: SQLDialects): void;

export declare type SpecializeColumn<TType> = (def?: ColumnDefinition<any, any>) => ColumnDefinition<any, TType>;
export declare function specializeColumn<TType>(dataType: string): SpecializeColumn<TType>;
export declare let column: {
  text: SpecializeColumn<string>;
  varchar: SpecializeColumn<string>;
  uuid: SpecializeColumn<string>;
  boolean: SpecializeColumn<boolean>;
  timestamp: SpecializeColumn<Date>;
  json: <T>(def?: ColumnDefinition<any, any>) => ColumnDefinition<any, T>;
  jsonb: <T>(def?: ColumnDefinition<any, any>) => ColumnDefinition<any, T>;
  bytea: SpecializeColumn<Buffer>;
  integer: SpecializeColumn<number>;
  custom: <T>(def?: ColumnDefinition<any, any>) => ColumnDefinition<any, T>;
}

