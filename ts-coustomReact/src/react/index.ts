abstract class Component {
    constructor() {
        this.props = {
            children: []
        };
        this.range = null;
    }
    props: Record<string, any>;
    state?: Record<string, any>;
    protected range: Range;
    private oldVDom: Component;
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
    abstract render(): Component
}

function replaceRange(range: Range, node: HTMLElement | Text) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();
    range.setStartBefore(node);
    range.setEndAfter(node);
}

class ElementWrapper extends Component {
    constructor(type: string) {
        super();
        this.type = type;
    }
    type: string;
    get vdom() {
        return this;
    }
    render() {
        return new ElementWrapper(this.type);
    }
    public renderToDom(range: Range) {
        const node = document.createElement(this.type);
        for (let p in this.props) {
            if (p !== 'children') {
                if (p.startsWith('on')) {
                    node.addEventListener(p.toLocaleLowerCase().slice(2), this.props[p]);
                } else {
                    node.setAttribute(p === 'className' ? 'class' : p, this.props[p]);
                }
            }
        }

        this.props.children.forEach(item => {
            const childRange = document.createRange();
            childRange.setStart(node, node.childNodes.length);
            childRange.setEnd(node, node.childNodes.length);
            childRange.deleteContents();
            item.renderToDom(childRange);
        })
        this.range = range;
        replaceRange(range, node);
    }
}

class TextWrapper extends Component {
    constructor(content: string) {
        super();
        this.content = content;
    }
    content: string;
    get vdom() {
        return this;
    }
    render() {
        return new TextWrapper(this.content);
    }
    public renderToDom(range: Range) {
        this.range = range;
        const node = document.createTextNode(this.content);
        replaceRange(range, node);
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
    const range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    element.renderToDom(range);
}

export {
    Component,
    createElement,
    render
}

