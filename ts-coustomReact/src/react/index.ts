
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

const render = (element: HTMLElement, parentElement: HTMLElement) => {
    parentElement.appendChild(element);
}

export {
    Component,
    createElement,
    render
}

