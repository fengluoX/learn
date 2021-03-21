const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

// promise解析函数
function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    return reject(new TypeError("Chaining cycle detected for promise"));
  }
  // 标记x.then方法是否执行过
  let isUsed = false;

  if ((x != null && typeof x === "object") || typeof x === "function") {
    try {
      const then = x.then;
      if (typeof then === "function") {
        then.call(
          x,
          function (y) {
            if (isUsed) {
              return;
            }
            isUsed = true;
            resolvePromise(promise, y, resolve, reject);
          },
          function (r) {
            if (isUsed) {
              return;
            }
            isUsed = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch (err) {
      if (isUsed) {
        return;
      }
      isUsed = true;
      reject(err);
    }
  } else {
    resolve(x);
  }
}

class Promise {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError(`Promise resolver ${executor} is not a function`);
    }

    try {
      executor(this.resolve, this.reject);
    } catch (err) {
      this.reject(err);
    }
  }

  // 状态
  state = PENDING;

  // 值
  value;

  // 据因
  reason;

  // resolve 回调队列
  onFulfilled = [];

  // reject 回调队列
  onRejected = [];

  resolve = (value) => {
    if (this.state === PENDING) {
      this.state = FULFILLED;
      this.value = value;
      this.onFulfilled.forEach((fn) => fn());
    }
  };

  reject = (reason) => {
    if (this.state === PENDING) {
      this.state = REJECTED;
      this.reason = reason;
      this.onRejected.forEach((fn) => fn());
    }
  };

  then(onFulfilled, onRejected) {
    // onFulfilled/onRejected 非函数时，处理成函数
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (val) => val;

    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new Promise((resolve, reject) => {
      const asyncFunWrapper = (fun) => {
        // 异步方案，可以换成其他异步方案
        return () =>
          setTimeout(() => {
            try {
              const value = this.state === FULFILLED ? this.value : this.reason;
              const x = fun(value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (err) {
              reject(err);
            }
          }, 0);
      };

      switch (this.state) {
        case FULFILLED:
          asyncFunWrapper(onFulfilled)();
          break;
        case REJECTED:
          asyncFunWrapper(onRejected)();
          break;
        case PENDING:
          this.onFulfilled.push(asyncFunWrapper(onFulfilled));
          this.onRejected.push(asyncFunWrapper(onRejected));
      }
    });
    return promise2;
  }
}

Promise.defer = Promise.deferred = function () {
  let dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = Promise;
