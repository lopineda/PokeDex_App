(function (global, factory) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      factory(exports);
    } else if (typeof define === "function" && define.amd) {
      define(["exports"], factory);
    } else {
      factory((global.WHATWGFetch = {}));
    }
  })(this, function (exports) {
    "use strict";
  
    const support = {
      searchParams: "URLSearchParams" in self,
      iterable: "Symbol" in self && "iterator" in Symbol,
      blob: "Blob" in self,
      formData: "FormData" in self,
      arrayBuffer: "ArrayBuffer" in self,
    };
  
    function isDataView(obj) {
      return obj instanceof DataView;
    }
  
    const isArrayBufferView =
      ArrayBuffer.isView ||
      function (obj) {
        return obj && Object.prototype.toString.call(obj).includes("Array");
      };
  
    function normalizeName(name) {
      if (typeof name !== "string") name = String(name);
      if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
        throw new TypeError("Invalid character in header field name");
      }
      return name.toLowerCase();
    }
  
    function normalizeValue(value) {
      return typeof value === "string" ? value : String(value);
    }
  
    function iteratorFor(items) {
      return {
        next() {
          const value = items.shift();
          return { done: value === undefined, value };
        },
        [Symbol.iterator]: function () {
          return this;
        },
      };
    }
  
    class Headers {
      constructor(headers) {
        this.map = {};
  
        if (headers instanceof Headers) {
          headers.forEach((value, name) => this.append(name, value));
        } else if (Array.isArray(headers)) {
          headers.forEach(([name, value]) => this.append(name, value));
        } else if (headers) {
          Object.entries(headers).forEach(([name, value]) => this.append(name, value));
        }
      }
  
      append(name, value) {
        name = normalizeName(name);
        value = normalizeValue(value);
        this.map[name] = this.map[name] ? this.map[name] + ", " + value : value;
      }
  
      delete(name) {
        delete this.map[normalizeName(name)];
      }
  
      get(name) {
        return this.has(name) ? this.map[normalizeName(name)] : null;
      }
  
      has(name) {
        return Object.prototype.hasOwnProperty.call(this.map, normalizeName(name));
      }
  
      set(name, value) {
        this.map[normalizeName(name)] = normalizeValue(value);
      }
  
      forEach(callback, thisArg) {
        Object.entries(this.map).forEach(([name, value]) => callback.call(thisArg, value, name, this));
      }
  
      keys() {
        return iteratorFor(Object.keys(this.map));
      }
  
      values() {
        return iteratorFor(Object.values(this.map));
      }
  
      entries() {
        return iteratorFor(Object.entries(this.map));
      }
  
      [Symbol.iterator]() {
        return this.entries();
      }
    }
  
    class Body {
      constructor() {
        this.bodyUsed = false;
      }
  
      _initBody(body) {
        this._bodyInit = body;
        if (!body) {
          this._bodyText = "";
        } else if (typeof body === "string") {
          this._bodyText = body;
        } else if (support.blob && body instanceof Blob) {
          this._bodyBlob = body;
        } else if (support.formData && body instanceof FormData) {
          this._bodyFormData = body;
        } else if (support.searchParams && body instanceof URLSearchParams) {
          this._bodyText = body.toString();
        } else if (support.arrayBuffer && (body instanceof ArrayBuffer || isArrayBufferView(body))) {
          this._bodyArrayBuffer = body.slice(0);
        } else {
          this._bodyText = Object.prototype.toString.call(body);
        }
  
        if (!this.headers.get("content-type")) {
          if (typeof body === "string") {
            this.headers.set("content-type", "text/plain;charset=UTF-8");
          } else if (this._bodyBlob && this._bodyBlob.type) {
            this.headers.set("content-type", this._bodyBlob.type);
          } else if (support.searchParams && body instanceof URLSearchParams) {
            this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
          }
        }
      }
  
      text() {
        return Promise.resolve(this._bodyText);
      }
  
      json() {
        return this.text().then(JSON.parse);
      }
    }
  
    class Request extends Body {
      constructor(input, options = {}) {
        super();
        this.url = input instanceof Request ? input.url : String(input);
        this.method = (options.method || "GET").toUpperCase();
        this.headers = new Headers(options.headers);
        this.credentials = options.credentials || "same-origin";
        this.signal = options.signal || null;
  
        if ((this.method === "GET" || this.method === "HEAD") && options.body) {
          throw new TypeError("Body not allowed for GET or HEAD requests");
        }
        this._initBody(options.body);
      }
  
      clone() {
        return new Request(this, { body: this._bodyInit });
      }
    }
  
    class Response extends Body {
      constructor(bodyInit, options = {}) {
        super();
        this.type = "default";
        this.status = options.status ?? 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = options.statusText || "OK";
        this.headers = new Headers(options.headers);
        this.url = options.url || "";
        this._initBody(bodyInit);
      }
  
      clone() {
        return new Response(this._bodyInit, {
          status: this.status,
          statusText: this.statusText,
          headers: new Headers(this.headers),
          url: this.url,
        });
      }
  
      static error() {
        return new Response(null, { status: 0, statusText: "" });
      }
  
      static redirect(url, status) {
        const validStatuses = new Set([301, 302, 303, 307, 308]);
        if (!validStatuses.has(status)) {
          throw new RangeError("Invalid status code");
        }
        return new Response(null, { status, headers: { location: url } });
      }
    }
  
    function fetch(input, init) {
      return new Promise((resolve, reject) => {
        const request = new Request(input, init);
        const xhr = new XMLHttpRequest();
  
        xhr.onload = () => {
          resolve(new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(xhr.getAllResponseHeaders()),
            url: xhr.responseURL,
          }));
        };
  
        xhr.onerror = () => reject(new TypeError("Network request failed"));
        xhr.open(request.method, request.url, true);
        request.headers.forEach((value, name) => xhr.setRequestHeader(name, value));
        xhr.send(request._bodyInit || null);
      });
    }
  
    fetch.polyfill = true;
    if (!self.fetch) {
      self.fetch = fetch;
      self.Headers = Headers;
      self.Request = Request;
      self.Response = Response;
    }
  
    exports.fetch = fetch;
  });
  