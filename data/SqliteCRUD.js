// const sqlite3 = require('sqlite3')
import sqlite3 from 'sqlite3'
import { promisify } from 'util'

/**
 * A class to handle CRUD operations for SQLite.
 */
class SQLiteCRUD {
    /**
     * Create a SQLiteCRUD instance.
     * @param {string} databasePath - The path to the SQLite database file.
     */
    constructor(databasePath) {
        this.db = new sqlite3.Database(databasePath);
        this.db.run = promisify(this.db.run);
        this.db.get = promisify(this.db.get);
        this.db.all = promisify(this.db.all);
    }

    /**
     * Insert data into a table.
     * @async
     * @param {string} tableName - The name of the table.
     * @param {Object} data - The data to insert.
     */
    async insert(tableName, data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        await this.db.run(sql, values);
    }

    /**
     * Select data from a table.
     * @async
     * @param {string} tableName - The name of the table.
     * @param {Object} [conditions] - The conditions for the selection.
     * @returns {Promise<Object[]>} The selected rows.
     */
    async select(tableName, conditions = {}) {
        let sql = `SELECT * FROM ${tableName}`;
        if (Object.keys(conditions).length) {
            const conditionStr = Object.entries(conditions).map(([key, value]) => `${key}=?`).join(' AND ');
            sql += ` WHERE ${conditionStr}`;
        }
        return this.db.all(sql, Object.values(conditions));
    }

    /**
     * Update data in a table.
     * @async
     * @param {string} tableName - The name of the table.
     * @param {Object} data - The data to update.
     * @param {Object} conditions - The conditions for the update.
     */
    async update(tableName, data, conditions) {
        const updateStr = Object.entries(data).map(([key]) => `${key}=?`).join(', ');
        const conditionStr = Object.entries(conditions).map(([key]) => `${key}=?`).join(' AND ');
        const sql = `UPDATE ${tableName} SET ${updateStr} WHERE ${conditionStr}`;
        await this.db.run(sql, [...Object.values(data), ...Object.values(conditions)]);
    }

    /**
     * Delete data from a table.
     * @async
     * @param {string} tableName - The name of the table.
     * @param {Object} conditions - The conditions for the deletion.
     */
    async delete(tableName, conditions) {
        const conditionStr = Object.entries(conditions).map(([key]) => `${key}=?`).join(' AND ');
        const sql = `DELETE FROM ${tableName} WHERE ${conditionStr}`;
        await this.db.run(sql, Object.values(conditions));
    }

    /**
     * Create a table if it doesn't already exist.
     * @async
     * @param {string} tableName - The name of the table to create.
     * @param {Object} columns - An object where keys are column names and values are SQLite data types.
     */
    async createTable(tableName, columns) {
        const columnsStr = Object.entries(columns)
            .map(([columnName, dataType]) => `${columnName} ${dataType}`)
            .join(', ');
        const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsStr})`;
        await this.db.run(sql);
    }

    /**
     * Start a database transaction.
     * @async
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        await this.db.run('BEGIN');
    }

    /**
     * Commit the current transaction.
     * @async
     * @returns {Promise<void>}
     */
    async commitTransaction() {
        await this.db.run('COMMIT');
    }

    /**
     * Rollback the current transaction.
     * @async
     * @returns {Promise<void>}
     */
    async rollbackTransaction() {
        await this.db.run('ROLLBACK');
    }
    /**
     * Close the database connection.
     * @async
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

export default SQLiteCRUD