import Database, {
  Database as DatabaseType,
  BackupOptions,
} from "better-sqlite3";

export class DB {
  static instance: DB;
  public db: DatabaseType;
  static dbPath: string;

  constructor(public dbPath: string = "") {
    if (DB.instance) {
      return DB.instance;
    } else {
      this.dbPath = dbPath;
      this.db = new Database(dbPath);
      DB.instance = this;
    }
  }

  static getInstance() {
    if (!DB.instance) {
      DB.instance = new DB(this.dbPath);
    }

    return DB.instance;
  }

  exec(sql: string): DatabaseType {
    return this.db.exec(sql);
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  transaction(fn: (...params: any[]) => unknown): Database.Transaction {
    return this.db.transaction(fn);
  }

  close(): DatabaseType {
    return this.db.close();
  }

  backup(
    destinationFile: string,
    options?: BackupOptions
  ): Promise<Database.BackupMetadata> {
    return this.db.backup(destinationFile, options);
  }
}
