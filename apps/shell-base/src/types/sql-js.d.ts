declare module "sql.js" {
  type SqlParam = string | number | null | Uint8Array;

  interface QueryExecResult {
    columns: string[];
    values: SqlParam[][];
  }

  interface Database {
    run(sql: string, params?: SqlParam[]): this;
    exec(sql: string, params?: SqlParam[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface SqlJsConfig {
    locateFile?: (filename: string, prefix: string) => string;
    wasmBinary?: ArrayBuffer;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export default initSqlJs;
}
