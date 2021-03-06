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
            <div id="231">test</div>
            {1 + 3}
            <div>test</div>
            </div>

            console.log(app);
        ```

        然后运行`npm run start`

        打开页面，你会发现页面报错了:`Uncaught ReferenceError: createElement is not defined`，点进错误看一下编译后的代码，是这样子的：

        ```js
            var createElement = _react_index__WEBPACK_IMPORTED_MODULE_0__["createElement"];
            var app = createElement("div", null, "123", createElement("div", {
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

2. 适配自定义组件

    + 我们知道，在react中，我们不仅仅会写普通标签，也会写自定义组件，接下来我们来将我们的自定义组件也渲染到页面上来

    1. 代码分析

        我们先来随便写一个自定义组件，看看babel是怎么编译的：

        源代码：

        ```ts
            class App {
                render() {
                    return (
                        <div>
                            123
                            <div id="231">test</div>
                            {1 + 3}
                            <div>test</div>
                        </div>
                    )
                }
            }
            render(<App name="app">
                <div>children</div>
            </App>, document.body);
        ```

        编译后代码:

        ```ts
            var App =
            /** @class */
            function () {
            function App() {}

            App.prototype.render = function () {
                return createElement("div", null, "123", createElement("div", {
                id: "231"
                }, "test"), 1 + 3, createElement("div", null, "test"));
            };

            return App;
            }();

            Object(_react_index__WEBPACK_IMPORTED_MODULE_0__["render"])(createElement(App, {
            name: "app"
            }, createElement("div", null, "children")), document.body);
        ```

        我们可以看到，babel同样调用了createElement，只不过，传入的第一个参数值改变了，由标签名改成了我们class类。

    2. 构思实现：

        1. 首先，在我们之前的基础上，如果遇到传入的参数是复杂类型的话，就代表传入的是我们的自定义class类，这时，我们需要实例化它，并调用它的`render`函数。

            ```ts
                class BaseComponet {
                    render: () => HTMLElement
                }
                const createElement = (
                    type: string | typeof BaseComponet,
                    props: Record<string, string>,
                    ...children: Array<string | HTMLElement>
                ): HTMLElement => {
                    let root: HTMLElement;
                    if (typeof type === 'string') {
                        root = document.createElement(type);
                    } else {
                        root = new type().render()
                    }
                    for (let p in props) {
                        root.setAttribute(p === 'className' ? 'class' : p, props[p]);
                    }

                    for (let child of children) {
                        if (typeof child !== 'object') {
                            let textNode = document.createTextNode(child);
                            root.appendChild(textNode);
                        } else {
                            root.appendChild(child);
                        }
                    }

                    return root;
                }
            ```

    3. 注入state&props

        对于目前我们的自定义组件，它只是个雏形，它并不是一个有状态的组件，按照`react`的惯例，我们为它写入的属性分别包括自有状态和传入状态：`state&props`

        1. state

            1. 我们先尝试写一个简单的state，并render出来

                ```ts
                    class App {
                        state = {
                            name: 'App'
                        }
                        render() {
                            return (
                                <div>
                                    <h1>{this.state.name}</h1>
                                    123
                                    <div id="231">test</div>
                                    <div>test</div>
                                </div>
                            )
                        }
                    }
                ```

            2. 好的，我们看到它被正常渲染处理了，接下来，让我们试着把它写的复杂一点

                ```tsx
                    interface List {
                        key: number;
                        children?: List[]
                    }
                    const insertState = (list: List[]) => {
                        return list.map(item => {
                            if (item.children) {
                                return insertState(item.children);
                            }
                            return (<div>{item.key}</div>)
                        })
                    }
                    class App {
                        state = {
                            name: 'App',
                            list: [
                                {
                                    key: 1,
                                    children: [
                                        {
                                            key: 1,
                                            children: [
                                                {
                                                    key: 1,
                                                },
                                                {
                                                    key: 2,
                                                }
                                            ]
                                        },
                                        {
                                            key: 2,
                                        }
                                    ]
                                },
                                {
                                    key: 2,
                                }
                            ]
                        }
                        render() {
                            return (
                                <div>
                                    <h1>{this.state.name}</h1>
                                    {insertState(this.state.list)}
                                    123
                                    <div id="231">test</div>
                                    <div>test</div>
                                </div>
                            )
                        }
                    }
                ```

                我们看到它报错了，点进错误可以发现错误是在这一行：`root.appendChild(child);`，也就是我们的children出问题了,我们打印一下它`console.logJSON.stringify(children, null, 2)`,发现有一次打印的类型是这样的：

                ```ts
                    [h1,[[div,div],div],"123",div,div]
                ```

                这里我们发现，我们的child并不再是一个Dom实例或字符串了，而是一个数组，而且这个数组内部还可能会嵌套数组，所以我们需要改写我们的`createElement`函数，递归的去处理children，当然，任何递归函数，都可以用循环来重新，不过我们一般只有在递归会造成栈溢出的情况下去改写它，有兴趣的可以改写一下试试，这里贴下递归改造后的代码

                ```ts
                    const createElement = (
                        type: string | typeof BaseComponet,
                        props: Record<string, string>,
                        ...children: Array<string | HTMLElement | Array<string | HTMLElement>>
                    ): HTMLElement => {
                        let root: HTMLElement;
                        if (typeof type === 'string') {
                            root = document.createElement(type);
                        } else {
                            root = new type().render()
                        }
                        for (let p in props) {
                            root.setAttribute(p === 'className' ? 'class' : p, props[p]);
                        }
                        const insertChild = (children: Array<string | HTMLElement | Array<string | HTMLElement>>) => {
                            for (let child of children) {
                                if (typeof child !== 'object') {
                                    let textNode = document.createTextNode(child);
                                    root.appendChild(textNode);
                                } else if (child instanceof Array) {
                                    insertChild(child)
                                } else {
                                    root.appendChild(child);
                                }
                            }
                        }
                        insertChild(children);
                        return root;
                    }
                ```

            3. props

                1. 对于props，我们改进一下旧的代码：

                    ```ts
                        class Itme {
                            props: {
                                key: number
                            }
                            render() {
                                return <div>{this.props.key}</div>
                            }
                        }

                        const insertState = (list: List[]) => {
                            return list.map(item => {
                                if (item.children) {
                                    return insertState(item.children);
                                }
                                return (<Itme key={item.key} />)
                            })
                        }
                    ```

                    我们发现页面报错了，因为它找不到`key`这个属性，我们需要分析一下

                2. 分析

                    1. 首先，我们的`createElement`函数是可以拿到props的，而我们为了控制所有的自定义组件的渲染的行为基本保持一致，所以我们需要所有的自定义组件都继承`Component`，就像`react`的所有类组件都继承`React.Component`一样

                    2. 分析`Component`类都需要什么

                        1. `_root`，用来保存我们的Dom实例

                        2. `props`,用来保存我们传入的属性

                        3. `setAttribute`,用来写入`props`属性

                        4. `appendChild`，按照`react`的行为，当其存在子元素时，我们需要将子元素存在`props.children`里，并根据需要进行渲染

                        5. `render`方法，这是一个抽象方法，它由其子类实现，并应当返回Dom实例

                        6. 取值器`get root`,我们并不希望实例直接访问`_root`，并且希望在获取`_root`时，如果不存在，则调用它的`render`方法，返回Dom实例

                    3. 改造`createElement`函数

                        + 由于我们实例自定义组件时，返回的并不是一个Dom实例了，所以我们需要进一步拿到它的Dom实例，也即`_root`，但是目前我们的返回也有可能是一个Dom实例，即传入参数是标签名时，我们希望在这里统一行为，所以我们需要对普通元素做一层包装，让其行为变得和`Component`一致，我们要定义一个`ElementWrapper`类，封装它的行为

                3. 代码实现：

                    ```ts
                        abstract class Component {
                            constructor() {
                                this.props = {
                                    children: []
                                };
                                this._root = null;
                            }
                            props: Record<string, any>;
                            protected _root: HTMLElement;
                            get root() {
                                if (!this._root) {
                                    this._root = this.render();
                                }
                                return this._root;
                            }
                            setAttribute(name: string, value: any) {
                                this.props[name] = value;
                            }
                            appendChild(node: HTMLElement | Text) {
                                this.props.children.push(node);
                            }
                            abstract render(): HTMLElement
                        }
                        class ElementWrapper {
                            constructor(type: string) {
                                this._root = document.createElement(type);
                            }
                            props: Record<string, any>;
                            protected _root: HTMLElement;
                            get root() {
                                return this._root;
                            }
                            setAttribute(name: string, value: string) {
                                this._root.setAttribute(name === 'className' ? 'class' : name, value)
                            }
                            appendChild(node: HTMLElement | Text) {
                                this._root.appendChild(node);
                            }
                        }
                        // 纯粹是为了得到一个继承于Component的类的类型，为createElement提供参数类型
                        class ExtendsComponent extends Component {
                            render = (): HTMLElement => document.createElement('div');
                        }
                        const createElement = (
                            type: string | typeof ExtendsComponent,
                            props: Record<string, string> | null,
                            ...children: Array<string | HTMLElement | Array<string | HTMLElement>>
                        ): HTMLElement => {
                            let root: ElementWrapper | Component;
                            if (typeof type === 'string') {
                                root = new ElementWrapper(type);
                            } else {
                                root = new type();
                            }
                            for (let p in props) {
                                root.setAttribute(p, props[p]);
                            }
                            const insertChild = (children: Array<string | HTMLElement | Array<string | HTMLElement>>) => {
                                for (let child of children) {
                                    if (typeof child !== 'object') {
                                        let textNode = document.createTextNode(child);
                                        root.appendChild(textNode);
                                    } else if (child instanceof Array) {
                                        insertChild(child)
                                    } else {
                                        root.appendChild(child);
                                    }
                                }
                            }
                            insertChild(children);
                            return root.root;
                        }
                    ```

                    这里的ExtendsComponent类纯粹是为了得到一个继承抽象类的类的类型，如果你有更好的方法，可以告诉我

3. 增加setState以及事件处理

    + 目前我们的ts-react只能展示，而没有任何交互的作用，所以，我们需要为它添加事件支持，以及数据更新视图的能力

    1. 增加事件处理

        + 事件处理是比较好做的，我们只需要将`/^on`开头的属性进行小写转化，并用`addEventListener`来挂载监听就好，我们对`ElementWrapper`做一些处理就好，代码如下：

        ```ts
            class ElementWrapper {
                // ...
                setAttribute(name: string, value: any) {
                    if (name.match(/^on([\s\S]+)$/)) {
                        console.log(RegExp.$1)
                        this._root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLocaleLowerCase()), value);
                    } else {
                        this._root.setAttribute(name === 'className' ? 'class' : name, value)
                    }
                }
            }
        ```

    2. 增加数据更新试图的能力，即`setState`

        1. 分析&实现

            首先，我们的所有数据改变，都需要通过`setState`来进行修改，同时，`setState`会在每个自定义子类里都存在，所以我们应当将其放在`Component`里来实现，同时，我们需要在每次更新数据后，更新我们的视图

            ```ts
                abstract class Component {
                    // ...
                    state?: Record<string, any>;
                    setState(newState: Record<string, any>) {
                        if (!this.state || typeof this.state !== 'object') {
                            this.state = newState;
                        } else {
                            let merge = (oldState: Record<string, any>, newState: Record<string, any>) => {
                                for (let p in newState) {
                                    if (oldState[p] === null || typeof oldState[p] !== 'object') {
                                        oldState[p] = newState[p];
                                    } else {
                                        merge(oldState[p], newState[p]);
                                    }
                                }
                            }
                            merge(this.state, newState);
                        }
                        this.rerender();
                    }
                    rerender() {
                        const { parentNode } = this._root;
                        parentNode.removeChild(this._root);
                        this._root = this.render();
                        parentNode.appendChild(this._root);
                    }
                }
            ```

        2. 完善

            我们可以看到目前已经可以渲染了，让我们把React的官网demo放进来试一下，另外，我们的`ts-react`不支持函数组件，所以需要将函数组件改成类组件

            ```ts
                // ...
                import './index.css';
                class Square extends Component {
                    render(){
                        return (
                            <button className="square" onClick={this.props.onClick}>
                                {this.props.value}
                            </button>
                        );
                    }
                }
                // ...
                render(<Game />, document.body);
            ```

            创建我们的index.css，将官网样式copy一份进来

            我们发现，页面报错了，错误出在`root.appendChild(child);`这一行，也就是，我们的child出问题了，打印发现，我们的child可能会是`null`,所以我们需要这样处理一下：

            ```ts
                // function createElement ->inserChild
                for (let child of children) {
                    if(!child){
                        continue;
                    }
                    if (typeof child !== 'object') {
                        let textNode = document.createTextNode(child);
                        root.appendChild(textNode);
                    } else if (child instanceof Array) {
                        insertChild(child)
                    } else {
                        root.appendChild(child);
                    }
                }
            ```

            好了，我们可以看到react官网的demo已经成功跑起来了，近乎完美，不是么

4. 增加Vdom

    + 通过上面的步骤，我们的ts-react成功的跑起来了官网的demo，近乎完美，但是，也代表不完美，我们应当看到我们每次更新，都绘了整个Dom树，但我们所想要的并不是这样的，我们需要vdom来进行对比，只更新对应的区域。整个流程应该分为以下几步：

    1. 存储vdom

        + 分析：要实现vdom，我们需要在创建时记录我们的Dom节点，并且在更新视图的时候，优先更新我们的vdom，然后通过vdom，去更新我们的Dom树，我们vdom是一个树形结构，每个节点代表我们的一个基于`Component`的类，`ElementWrapper`也不例外。

        1. 通过之前的代码我们知道，我们的render函数返回的内容，其实是`createElement`的返回值来决定的。而我们要统一的话，首要就是要改造`createElement`函数，让它返回一个`Component`类，而不是一个dom节点，同时还要改造render的返回类型，返回`Component`实例，同时达到`Component`是所有节点的父类型，我们需要新增`TextWrapper`类，来继承Component，它用来代表文本节点，代码如下：

            ```ts
                abstract class Component {
                    constructor() {
                        this.props = {
                            children: []
                        };
                        this._root = null;
                    }
                    props: Record<string, any>;
                    state?: Record<string, any>;
                    protected _root: Component;
                    get root() {
                        if (!this._root) {
                            this._root = this.render();
                        }
                        return this._root;
                    }
                    setAttribute(name: string, value: any) {
                        if (name !== 'children') {
                            this.props[name] = value;
                        }
                    }
                    appendChild(node: Component) {
                        this.props.children.push(node);
                    }
                    setState(newState: Record<string, any>) {
                        if (!this.state || typeof this.state !== 'object') {
                            this.state = newState;
                        } else {
                            let merge = (oldState: Record<string, any>, newState: Record<string, any>) => {
                                for (let p in newState) {
                                    if (oldState[p] === null || typeof oldState[p] !== 'object') {
                                        oldState[p] = newState[p];
                                    } else {
                                        merge(oldState[p], newState[p]);
                                    }
                                }
                            }
                            merge(this.state, newState);
                        }
                    }
                    abstract render(): Component
                }

                class ElementWrapper extends Component {
                    constructor(type: string) {
                        super();
                        this.type = type;
                    }
                    type: string;
                    render() {
                        return new ElementWrapper(this.type);
                    }
                }

                class TextWrapper extends Component {
                    constructor(content: string) {
                        super();
                        this.content = content;
                    }
                    content: string;
                    render() {
                        return new TextWrapper(this.content);
                    }
                }

                // 纯粹是为了得到一个继承于Component的类的类型，为createElement提供参数类型
                class ExtendsComponent extends Component {
                    render: () => Component;
                }

                const createElement = (
                    type: string | typeof ExtendsComponent,
                    props: Record<string, string> | null,
                    ...children: Array<string | Component | Array<string | Component>>
                ): Component => {
                    let root: ElementWrapper | Component;
                    if (typeof type === 'string') {
                        root = new ElementWrapper(type);
                    } else {
                        root = new type();
                    }
                    for (let p in props) {
                        root.setAttribute(p, props[p]);
                    }
                    const insertChild = (children: Array<string | Component | Array<string | Component>>) => {
                        for (let child of children) {
                            if (!child) {
                                continue;
                            }
                            if (typeof child !== 'object') {
                                let textNode = new TextWrapper(child);
                                root.appendChild(textNode);
                            } else if (child instanceof Array) {
                                insertChild(child)
                            } else {
                                root.appendChild(child);
                            }
                        }
                    }
                    insertChild(children);
                    return root;
                }

                const render = (element: Component, parentElement: HTMLElement) => {
                    parentElement.appendChild(element);
                }

                export {
                    Component,
                    createElement,
                    render
                }


            ```

        2. 经过这一番改造，我们惊喜的发现，项目挂了。不过，不要急，这是因为我们干掉了之前的render逻辑，接下来我们来为`Component`,`ElementWrapper`,`TextWrapper`实现`renderToDom`方法,代码如下：

            ```ts
                abstract class Component {
                    // ...
                    private root: HTMLElement;
                    // ...
                    setState(newState: Record<string, any>) {
                        // ...
                        this.renderToDom(this.root);
                    }
                    public renderToDom(parentElement: HTMLElement) {
                        this.root = parentElement;
                        this.render().renderToDom(parentElement);
                    }
                    abstract render(): Component
                }

                class ElementWrapper extends Component {
                    constructor(type: string) {
                        super();
                        this.type = type;
                    }
                    type: string;
                    render() {
                        return new ElementWrapper(this.type);
                    }
                    public renderToDom(parentElement: HTMLElement) {
                        const node = document.createElement(this.type);
                        for (let p in this.props) {
                            if (p !== 'children') {
                                if (p.startsWith('on')) {
                                    parentElement.addEventListener(p.toLocaleLowerCase().slice(2), this.props[p]);
                                } else {
                                    node.setAttribute(p === 'className' ? 'class' : p, this.props[p]);
                                }
                            }
                        }
                        this.props.children.forEach(item => {
                            item.renderToDom(node);
                        })
                        parentElement.appendChild(node);
                    }
                }

                class TextWrapper extends Component {
                    constructor(content: string) {
                        super();
                        this.content = content;
                    }
                    content: string;
                    render() {
                        return new TextWrapper(this.content);
                    }
                    public renderToDom(parentElement: HTMLElement) {
                        const node = document.createTextNode(this.content);
                        parentElement.appendChild(node);
                    }
                }

                // 纯粹是为了得到一个继承于Component的类的类型，为createElement提供参数类型
                class ExtendsComponent extends Component {
                    render: () => Component;
                }

                const createElement = (
                    type: string | typeof ExtendsComponent,
                    props: Record<string, string> | null,
                    ...children: Array<string | Component | Array<string | Component>>
                ): Component => {
                    let root: ElementWrapper | Component;
                    // ...
                    const insertChild = (children: Array<string | Component | Array<string | Component>>) => {
                        for (let child of children) {
                            // ...
                            if (typeof child !== 'object') {
                                let textNode = new TextWrapper(child);
                                root.appendChild(textNode);
                            }
                            // ...
                        }
                    }
                    insertChild(children);
                    return root;
                }
                const render = (element: Component, parentElement: HTMLElement) => {
                    element.renderToDom(parentElement);
                }
            ```

        3. 引入range来实现更新

            经过改造后，我们发现页面重新渲染出来了，但是我们每次点击，都是在下方渲染出一个新的Dom树，原因是我们在appendChild是未能删掉之前的元素，而如果要删掉之前的元素，则我们需要精确的知道我们之前元素的位置。首先我们想到的可能是外部增加一个元素，来作为当前组件的根源是，但是这样实现会有问题，元素会有自带布局，不适用，那么fragment呢，也不行，它在appendChild后，就丢失引用了。最终，我们发现了`range`系列的api，它可以实现我们的需求，有关`range`系列的api，请参考[MDN文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Range);具体实现代码如下：

            ```ts
                abstract class Component {
                    // ...
                    protected range : Range;
                    // ...
                    setState(newState: Record<string, any>) {
                        // ...
                        this.renderToDom(this.range);
                    }
                    public renderToDom(range: Range) {
                        this.range = range;
                        this.render().renderToDom(range);
                    }
                }

                function replaceRange(range:Range,node:HTMLElement|Text){
                    range.insertNode(node);
                    range.setStartAfter(node);
                    range.deleteContents();
                    range.setStartBefore(node);
                    range.setEndAfter(node);
                }

                class ElementWrapper extends Component {
                    // ...
                    public renderToDom(range: Range) {
                        // ...
                        this.props.children.forEach(item => {
                            const childRange = document.createRange();
                            childRange.setStart(node,node.childNodes.length);
                            childRange.setEnd(node,node.childNodes.length);
                            childRange.deleteContents();
                            item.renderToDom(childRange);
                        })
                        this.range = range;
                        replaceRange(range,node);
                    }
                }

                class TextWrapper extends Component {
                    // ...
                    public renderToDom(range: Range) {
                        this.range = range;
                        const node = document.createTextNode(this.content);
                        replaceRange(range,node);
                    }
                }
                // ...
                const render = (element: Component, parentElement: HTMLElement) => {
                    const range = document.createRange();
                    range.setStart(parentElement,0);
                    range.setEnd(parentElement,parentElement.childNodes.length);
                    range.deleteContents();
                    element.renderToDom(range);
                }
            ```

        4. 增加vdom来记录dom树

            + 经过了上面这么多的改造，我们的代码已经具备了实现vdom的基础，接下来，我们需要实现vdom的存储了。代码很简单，如下：

            ```ts
                abstract class Component {
                    // ...
                    private oldVDom: HTMLElement;
                    // ...
                    get vdom() {
                        return this.render().vdom;
                    }
                    public renderToDom(range: Range) {
                        this.oldVDom = this.vdom;
                        // ...
                    }
                }

                class ElementWrapper extends Component {
                    // ...
                    get vdom() {
                        return this;
                    }
                }

                class TextWrapper extends Component {
                    // ...
                    get vdom() {
                        return this;
                    }
                }

                // 纯粹是为了得到一个继承于Component的类的类型，为createElement提供参数类型
                class ExtendsComponent extends Component {
                    render: () => Component;
                }
                // ...
            ```

    2. 到了现在，我们的vdom也存储好了，接下来就需要我们去对比新旧vdom，并去更新他们了,代码如下：

        ```ts
            abstract class Component {
                constructor() {
                    // ...
                    this.range = null;
                }
                // ...
                protected range: Range;
                private oldVDom: Component;
                // ...
                setState(newState: Record<string, any>) {
                    // ...
                    this.update();
                }
                update(){
                    let isSameNode = (oldNode,newNode)=>{
                        if(oldNode.type!==newNode.type){
                            return false;
                        }
                        for(let name in newNode.props){
                            if(name==='children'){
                                continue;
                            }
                            if(oldNode.props[name]!==newNode.props[name]){
                                return false;
                            }
                        }
                        if(Object.keys(oldNode).length>Object.keys(newNode).length){
                            return false;
                        }
                        return true;
                    }
                    let update = (oldNode:Component,newNode:Component)=>{
                        if(!isSameNode(oldNode,newNode)){
                            newNode.renderToDom(oldNode.range);
                            return;
                        }
                        newNode.range = oldNode.range;
                        let newChildren = newNode.props.children;
                        let oldChildren = oldNode.props.children;

                        if(!newChildren||!newChildren.length){
                            return;
                        }
                        let tailRange = oldChildren[oldChildren.length-1].range;
                        for(let i=0;i<newChildren.length;i++){
                            let newChild = newChildren[i];
                            let oldChild = oldChildren[i];
                            if(i<oldChildren.length){
                                update(oldChild,newChild);
                            }else{
                                let range = document.createRange();
                                range.setStart(tailRange.endContainer,tailRange.endOffset);
                                range.setEnd(tailRange.endContainer,tailRange.endOffset);
                                newChild.renderToDom(range);
                                tailRange = range;
                            }
                        }
                    }
                    let vdom = this.vdom;
                    update(this.oldVDom,vdom);
                    this.oldVDom = vdom;
                }
                get vdom() {
                    return this.render().vdom;
                }
                public renderToDom(range: Range) {
                    this.oldVDom = this.vdom;
                    this.range = range;
                    this.oldVDom.renderToDom(range);
                }
            }
            // ...
        ```

5. 总结

    + 到此为止，我们已经完全模拟了react的实现，当然，真正的react肯定比这要复杂n倍。但万变不离其宗，其根本是不会变化的。

    + 最后，吹一波ts。熟练使用类型系统，可以使我们在实现功能时从全局的角度考虑问题，养成更好的习惯。

    + [源码地址](https://github.com/fengluoX/learn/tree/master/ts-coustomReact)。
