# 手写 Promise

## 前置准备

1. 初始化：

   ```bash
       mkdir promise
       npm init -y
       npm install promises-aplus-tests -D
       touch index.js
   ```

2. 测试准备:

   ```js
   // index.js
   Promise.defer = Promise.deferred = function () {
     let dfd = {};
     dfd.promise = new Promise((resolve, reject) => {
       dfd.resolve = resolve;
       dfd.reject = reject;
     });
     return dfd;
   };
   module.exports = Promise;
   ```

   ```json
   {
     // package.json
     // ...
     "scripts": {
       "test": "promises-aplus-tests index.js"
     }
   }
   ```

## Promise A+ 规范

- Promise 是一种新的异步解决方案，而 Promise A+ 规范则描述了 Promise 算法实现的纲领。目前现行的实现里，都遵循了该规范

  规范地址：[英文地址](https://promisesaplus.com)、[中文翻译地址](https://segmentfault.com/a/1190000015914967)

  当然，对于中文翻译，其实网上非常之多，也可自行搜索

## 实现

- Promise 的实现要符合 Promise A+ 规范，即规范的 2.x 章节

### Promise States

- Promise A+ 规范专注于提供一个通用的 then 方法，因为对于 promise 本身的创建/解决/拒绝并未详细描述，2.1 的 Promise States 章节规定了 Promise 的状态值只有三种：`pending`、`fulfilled`、`rejected`，且其状态值仅有这两种流向：
  pending-->fulfilled
  pending-->rejected
  这里，我们先将 promise 的部分实现

  ```js
  const PENDING = "pending";
  const FULFILLED = "fulfilled";
  const REJECTED = "rejected";

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

    resolve = (value) => {
      if (this.state === PENDING) {
        this.state = FULFILLED;
        this.value = value;
      }
    };

    reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED;
        this.reason = reason;
      }
    };
  }
  ```

### The `then` Method

`promise.then(onFulfilled, onRejected)`

对于 then 方法的实现，标准有以下要求：

1. then 方法接受两个参数：`onFulfilled`、`onRejected`

2. 如果`onFulfilled`或`onRejected`不是函数，则忽略参数

3. 如果`onFulfilled`是函数，

   1. 此函数必须在 promise 完成(fulfilled)后被调用,并把 promise 的值作为它的第一个参数

   2. 此函数在 promise 完成(fulfilled)之前绝对不能被调用

   3. 此函数绝对不能被调用超过一次

4. 如果`onRejected`是函数：

   1. 此函数必须在 promise rejected 后被调用,并把 promise 的 reason 作为它的第一个参数

   2. 此函数在 promise rejected 之前绝对不能被调用

   3. 此函数绝对不能被调用超过一次

5. 在执行上下文堆栈（execution context）仅包含平台代码之前，不得调用 onFulfilled 和 onRejected
   平台代码指的是引擎，环境和 promise 执行代码。在实践中，此要求确保 onFulfilled 和 onRejected 能够异步执行，在 then 被调用之后传入事件环，并使用新的栈。这可以使用诸如 setTimeout 或 setImmediate 之类的“宏任务”机制，或者使用诸如 MutationObserver 或 process.nextTick 之类的“微任务”机制来实现。由于 promise 实现被认为是平台代码，因此它本身可能包含一个任务调度队列或调用处理程序的“trampoline”。

6. `onFulfilled` 和 `onRejected` 必须以函数的形式被调用(即没有 this 值)。

7. `then`可以在同一个`promise`里被多次调用

   1. 当 promise 完成执行（fulfilled）时,各个相应的 onFulfilled 回调必须根据最原始的 then 顺序来调用。
   2. 当 promise 被拒绝（rejected）时,各个相应的 onRejected 回调必须根据最原始的 then 顺序来调用。

8. then 方法必须返回一个新的 promise。但对于新的 promise 的值的解析。规范对其作了详细的规定，这里我们暂时先不实现。放到下一个章节来实现。

   ```js
   const PENDING = "pending";
   const FULFILLED = "fulfilled";
   const REJECTED = "rejected";

   // promise解析函数
   function resolvePromise(promise, x, resolve, reject) {}

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
                 const value =
                   this.state === FULFILLED ? this.value : this.reason;
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
   ```

### Promise 解析函数细节

注：这里的 Promise 解析函数，即 resolvePromise 函数

1. 如果 promise 和 x 引用同一个对象，则用 TypeError 作为原因拒绝（reject）promise。

2. 如果 x 是一个 promise,采用 promise 的状态

   1. 如果 x 是`pending`,promise 必须保持 pending 直到 x 到达 fulfilled 或 rejected

   2. 如果 x 是`fulfilled`，用相同的值完成;

   3. 如果 x 是`rejected`，用相同的原因拒绝;

3. 如果 x 是个对象或者方法（这里主要是兼容一些之前的 promise 实现）

   1. 保存 x.then 的引用;

   2. 如果取回的 x.then 属性的结果为一个异常 e,用 e 作为原因 reject

   3. 如果 then 是一个方法，把 x 当作 this 来调用它， 第一个参数为 resolvePromise，第二个参数为 rejectPromise,其中:

      1. 如果当 resolvePromise 被一个值 y 调用，运行 promise 解析函数

      2. 如果当 rejectPromise 被一个原因 r 调用，用 r 拒绝

      3. 如果 resolvePromise 和 rejectPromise 都被调用，或者对同一个参数进行多次调用，第一次调用执行，任何进一步的调用都被忽略

      4. 如果调用 then 抛出一个异常 e

         1. 如果 resolvePromise 或 rejectPromise 已被调用，忽略。否则，以 e 作为据因拒绝

   4. 如果 x.then 不是一个函数，则以 x 来完成 promise

4. 其他情况以 x 来完成 promise

#### 代码实现

```js
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
```
