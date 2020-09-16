# 简易react的ts版本，及思路

+ 首先，无中生有：

```bash
    npm init -y
    npm install typescript -D
    npx tsc --init
    mkdir src
    mkdir public
    touch src/index.tsx
    touch public/index.html
```

```html
<!--index.html-->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
</body>
</html>
```

+ 安装webpack及配置

```bash
    npm install @babel/core @babel/plugin-transform-react-jsx @babel/preset-env babel-loader html-webpack-plugin ts-loader webpack webpack-cli webpack-dev-server -D
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "outDir": "./dist/",
    "noImplicitAny": false,
    "module": "es6",
    "target": "es5",
    "jsx": "preserve",
    "sourceMap": true,
    "allowJs": true
  },
  "include": [
    "./src/**/*"
  ]
}
// package.json
{
  // ...
  "scripts": {
    "start": "webpack-dev-server",
    "build":"webpack"
  },
  // ...
}
```

```js
// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: "development",
    entry: [
        './src/index.tsx'
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [['@babel/plugin-transform-react-jsx', {
                            pragma: 'createElement'
                        }]]
                    }
                }, 'ts-loader']
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
        ]
    },
    optimization: {
        minimize: false
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            filename: 'index.html', //打包后文件名
            minify: {
                removeAttributeQuotes: false, //是否删除属性的双引号
                collapseWhitespace: false //是否折叠空白
            },
            hash: true //是否加上hash，默认是false,html引入是加入hash可以阻止浏览器的缓存策略
        })
    ],
}
```

好了，到现在为止，一切准备就绪，我们可以开始了

1. 首先，我们先试着将真实dom渲染到页面上去

    1. 分析tsx

        ```tsx
            // index.tsx
            const app = <div>
            123
            <siv id="231">test</siv>
            {1 + 3}
            <div>test</div>
            </div>

            console.log(app);
        ```

        然后运行`npm run start`

        打开页面，你会发现页面报错了:`Uncaught ReferenceError: createElement is not defined`，点进错误看一下编译后的代码，是这样子的：

        ```js
            var createElement = _react_index__WEBPACK_IMPORTED_MODULE_0__["createElement"];
            var app = createElement("div", null, "123", createElement("siv", {
            id: "231"
            }, "test"), 1 + 3, createElement("div", null, "test"));
            console.log(app);
        ```

        我们发现，babel在遇到标签时，它做了以下处理：

        1. 调用createElement函数（这里的createElement是我们在webpack的配置里定义的，默认会调用`React.createElement`）

            ```js
                options: {
                    presets: ['@babel/preset-env'],
                        plugins: [['@babel/plugin-transform-react-jsx', {
                            pragma: 'createElement'
                        }]]
                }
            ```

        2. 为createElement传入参数，它会固定传入几个参数：

            1. element，传入标签名

            2. props 元素的属性，它会以一个对象的形式传递给createElement函数，其中，`key`代表属性名，`value`代表值，如果没有属性，会传入null

            3. ...children 子元素，如果子元素是标签的会，会调用createElement，如果是其他值的话，会将该值直接传入

    2. 编写createElement来生成dom实例

        1. 对于标签，我们可以使用`document.createElement`来创建

        2. 对于属性，我们可以使用`for in`来遍历，并且使用`setAttribute`来为标签赋值，这里需要注意的是，我们的`class`属性在`JSX`中是`className`，所以我们需要转换以下，如果是`className`,则将它改为`class`;

        3. 对于...children,我们则可以通过`for of`来遍历它，如果它是一个复杂类型的话，则代表其实它是一个Dom元素，直接`appendChild`就好，如果它是其他值，则我们需要调用`document.createTextNode`来生成要给node节点

        4. 最后，我们将这个Dom节点返回，具体实现代码如下：

            ```ts
                const createElement = (tagName: string, props: Record<string, string>, ...children: Array<string | HTMLElement>): HTMLElement => {
                    const root = document.createElement(tagName);
                    for (let p in props) {
                        root.setAttribute(p === 'className' ? 'class' : p, props[p]);
                    }

                    for(let child of children){
                        if(typeof child !== 'object'){
                            let textNode = document.createTextNode(child);
                            root.appendChild(textNode);
                        }else{
                            root.appendChild(child);
                        }
                    }
                    return root;
                }
            ```

        5. 打印一下变量`app`，会发现`app`已经变成了一个dom树

    3. 编写render函数将`app`挂载到真实Dom树上

        + 通过查看`react`代码，我们发现它的`render`是接收一个dom节点，以及其要挂载的节点，这个实现就比较简单了，代码如下：

        ```ts
            // react.ts
            const render = (element: HTMLElement, parentElement: HTMLElement) => {
                parentElement.appendChild(element);
            }
            // index.ts
            render(app, document.body);
        ```

        + 这时，我们就可以看到我们写的`tsx`已经被成功渲染到Dom节点上了
