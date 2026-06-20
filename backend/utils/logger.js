/* 
  Purpose: Abstract logging framework for Cliniq-OX.
  Responsibility: Provide standard INFO, WARN, and ERROR log streams with request ID tracking.
*/

const { AsyncLocalStorage } = require('async_hooks');

// Static store to propagate requestIds across call stacks
const asyncLocalStorage = new AsyncLocalStorage();

class Logger {
  static getStorage() {
    return asyncLocalStorage;
  }

  static getRequestId() {
    const store = asyncLocalStorage.getStore();
    return store ? store.requestId : 'SYSTEM';
  }

  static formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    const requestId = this.getRequestId();
    return `[${timestamp}] [${level}] [ReqID: ${requestId}] ${message}`;
  }

  static info(message, meta = '') {
    console.log(this.formatMessage('INFO', message), meta);
  }

  static warn(message, meta = '') {
    console.warn(this.formatMessage('WARN', message), meta);
  }

  static error(message, error = '') {
    console.error(this.formatMessage('ERROR', message), error ? error.stack || error : '');
  }
}

module.exports = Logger;
