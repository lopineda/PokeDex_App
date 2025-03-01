(function (global, factory) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      factory();
    } else if (typeof define === "function" && define.amd) {
      define(factory);
    } else {
      factory();
    }
  })(this, function () {
    "use strict";
  
    const setImmediateFunc = typeof setImmediate !== "undefined" ? setImmediate : null;
  
    function finallyConstructor(callback) {
      return this.then(
        value => Promise.resolve(callback()).then(() => value),
        reason =>
          Promise.resolve(callback()).then(() => Promise.reject(reason))
      );
    }
  
    function allSettled(arr) {
      return new Promise((resolve, reject) => {
        if (!Array.isArray(arr)) {
          return reject(new TypeError("Promise.allSettled expects an array"));
        }
  
        let remaining = arr.length;
        if (remaining === 0) return resolve([]);
  
        const results = arr.map(() => null);
  
        function handleResult(i, status, value) {
          results[i] = { status, [status === "fulfilled" ? "value" : "reason"]: value };
          if (--remaining === 0) resolve(results);
        }
  
        arr.forEach((item, i) => {
          Promise.resolve(item).then(
            value => handleResult(i, "fulfilled", value),
            reason => handleResult(i, "rejected", reason)
          );
        });
      });
    }
  
    function noop() {}
  
    function bind(fn, thisArg) {
      return fn.bind(thisArg);
    }
  
    class Promise {
      constructor(fn) {
        if (typeof fn !== "function") throw new TypeError("Promise resolver must be a function");
  
        this._state = 0;
        this._handled = false;
        this._value = undefined;
        this._deferreds = [];
  
        doResolve(fn, this);
      }
  
      then(onFulfilled, onRejected) {
        const prom = new Promise(noop);
        handle(this, new Handler(onFulfilled, onRejected, prom));
        return prom;
      }
  
      catch(onRejected) {
        return this.then(null, onRejected);
      }
  
      finally(callback) {
        return finallyConstructor.call(this, callback);
      }
  
      static resolve(value) {
        if (value instanceof Promise) return value;
        return new Promise(resolve => resolve(value));
      }
  
      static reject(reason) {
        return new Promise((_, reject) => reject(reason));
      }
  
      static all(arr) {
        return new Promise((resolve, reject) => {
          if (!Array.isArray(arr)) return reject(new TypeError("Promise.all expects an array"));
  
          let remaining = arr.length;
          if (remaining === 0) return resolve([]);
  
          const results = arr.map(() => null);
  
          arr.forEach((item, i) => {
            Promise.resolve(item).then(
              value => {
                results[i] = value;
                if (--remaining === 0) resolve(results);
              },
              reject
            );
          });
        });
      }
  
      static race(arr) {
        return new Promise((resolve, reject) => {
          if (!Array.isArray(arr)) return reject(new TypeError("Promise.race expects an array"));
          arr.forEach(promise => Promise.resolve(promise).then(resolve, reject));
        });
      }
  
      static allSettled = allSettled;
    }
  
    class Handler {
      constructor(onFulfilled, onRejected, promise) {
        this.onFulfilled = typeof onFulfilled === "function" ? onFulfilled : null;
        this.onRejected = typeof onRejected === "function" ? onRejected : null;
        this.promise = promise;
      }
    }
  
    function handle(self, deferred) {
      while (self._state === 3) self = self._value;
  
      if (self._state === 0) {
        self._deferreds.push(deferred);
        return;
      }
  
      self._handled = true;
      Promise._immediateFn(() => {
        const cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
        if (!cb) {
          (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
          return;
        }
  
        try {
          resolve(deferred.promise, cb(self._value));
        } catch (e) {
          reject(deferred.promise, e);
        }
      });
    }
  
    function resolve(self, newValue) {
      if (self === newValue) return reject(self, new TypeError("A promise cannot be resolved with itself."));
  
      if (newValue instanceof Promise) {
        self._state = 3;
        self._value = newValue;
        finale(self);
        return;
      }
  
      if (newValue && typeof newValue === "object" && typeof newValue.then === "function") {
        return doResolve(bind(newValue.then, newValue), self);
      }
  
      self._state = 1;
      self._value = newValue;
      finale(self);
    }
  
    function reject(self, newValue) {
      self._state = 2;
      self._value = newValue;
      finale(self);
    }
  
    function finale(self) {
      if (self._state === 2 && !self._handled) {
        Promise._immediateFn(() => Promise._unhandledRejectionFn(self._value));
      }
  
      self._deferreds.forEach(deferred => handle(self, deferred));
      self._deferreds = null;
    }
  
    function doResolve(fn, self) {
      let done = false;
      try {
        fn(
          value => {
            if (!done) {
              done = true;
              resolve(self, value);
            }
          },
          reason => {
            if (!done) {
              done = true;
              reject(self, reason);
            }
          }
        );
      } catch (ex) {
        if (!done) {
          done = true;
          reject(self, ex);
        }
      }
    }
  
    Promise._immediateFn =
      setImmediateFunc ||
      function (fn) {
        setTimeout(fn, 0);
      };
  
    Promise._unhandledRejectionFn = function (err) {
      if (console && typeof console.warn === "function") {
        console.warn("Possible Unhandled Promise Rejection:", err);
      }
    };
  
    const globalNS = (() => {
      if (typeof globalThis !== "undefined") return globalThis;
      if (typeof self !== "undefined") return self;
      if (typeof window !== "undefined") return window;
      if (typeof global !== "undefined") return global;
      throw new Error("Unable to locate global object");
    })();
  
    if (typeof globalNS.Promise !== "function") {
      globalNS.Promise = Promise;
    } else {
      if (!globalNS.Promise.prototype.finally) {
        globalNS.Promise.prototype.finally = finallyConstructor;
      }
      if (!globalNS.Promise.allSettled) {
        globalNS.Promise.allSettled = allSettled;
      }
    }
  });
  