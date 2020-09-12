const RENDER_TO_DOM = Symbol("render to dom");

// toy-react 基类，所有自定义组件需要继承它
export class Component {
    constructor(){
        this.props = Object.create({
            children:[]
        });
        this._root = null;
        this._range = null;
    }
    setAttribute(name,value){
        this.props[name]=value;
    }
    appendChild(component){
        this.props.children.push(component);
    }
    get vdom(){
        return this.render().vdom;
    }
    [RENDER_TO_DOM](range){
        this._range = range;
        this._vdom = this.vdom;
        this._vdom[RENDER_TO_DOM](range);
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
            if(newNode.type==='#text'){
                if(newNode.content!== oldNode.content){
                    return false;
                }
            }
            return true;
        }
        let update = (oldNode,newNode)=>{
            // type，props，children
            // #text content
            if(!isSameNode(oldNode,newNode)){
                newNode[RENDER_TO_DOM](oldNode._range);
                return;
            }
            newNode._range = oldNode._range;
            let newChildren = newNode.vchildren;
            let oldChildren = oldNode.vchildren;

            if(!newChildren||!newChildren.length){
                return;
            }
            
            let tailRange = oldChildren[oldChildren.length-1]._range;

            for(let i=0;i<newChildren.length;i++){
                let newChild = newChildren[i];
                let oldChild = oldChildren[i];
                if(i<oldChildren.length){
                    update(oldChild,newChild);
                }else{
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer,tailRange.endOffset);
                    range.setEnd(tailRange.endContainer,tailRange.endOffset);
                    newChild[RENDER_TO_DOM](range);
                    tailRange = range;
                }
            }
        }
        let vdom = this.vdom;
        update(this._vdom,vdom);
        this._vdom = vdom;

    }
    /*
    rerender(){
        let oldRange = this._range;
        let range = document.createRange();
        range.setStart(oldRange.startContainer,oldRange.startOffset);
        range.setEnd(oldRange.startContainer,oldRange.startOffset)
        this[RENDER_TO_DOM](range);
        oldRange.setStart(range.endContainer,range.endOffset);
        oldRange.deleteContents(range);
    }
    */
    setState(newState){
        if(this.state ===null || typeof this.state !=='object' ){
            this.state = newState;
            this.update();
            return;
        }
        let merge = (oldState,newState)=>{
            for(let p in newState){
                if(oldState[p]===null || typeof oldState[p] !=='object'){
                    oldState[p]=newState[p];
                }else{
                    merge(oldState[p],newState[p]);
                }
            }
        }
        merge(this.state,newState);
        this.update();
    }
}

function replaceContent (range,node){
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();
    range.setStartBefore(node);
    range.setEndAfter(node);
}

// 元素类，用于实例化Dom元素
class ElementWapper extends Component {
    constructor(type){
        super(type);
        this.type = type;
    };
    /*
    setAttribute(name,value){
        if(name.match(/^on([\s\S]+)$/)){
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/,c=>c.toLowerCase()),value)
        }else{
            if(name==="className"){
                name = 'class';
            }
            this.root.setAttribute(name,value);
        }
    };
    
    appendChild(component){
        let range = document.createRange();
        range.setStart(this.root,this.root.childNodes.length);
        range.setEnd(this.root,this.root.childNodes.length);
        range.deleteContents();
        component[RENDER_TO_DOM](range);
    }*/
    
    get vdom(){
        this.vchildren = this.props.children.map(child=>child.vdom);
        return this;
    }

    
    [RENDER_TO_DOM](range){
        this._range = range;
        let root = document.createElement(this.type);
        for(let name in this.props){
            if(name ==='children'){
                continue;
            }
            let value = this.props[name];
            if(name.match(/^on([\s\S]+)$/)){
                root.addEventListener(RegExp.$1.replace(/^[\s\S]/,c=>c.toLowerCase()),value)
            }else{
                if(name==="className"){
                    name = 'class';
                }
                root.setAttribute(name,value);
            }
        }

        if(!this.vchildren){
            this.vchildren = this.props.children.map(child=>child.vdom);
        }

        for(let child of this.vchildren){
            let childRange = document.createRange();
            childRange.setStart(root,root.childNodes.length);
            childRange.setEnd(root,root.childNodes.length);
            childRange.deleteContents();
            child[RENDER_TO_DOM](childRange);
        }
        replaceContent(range,root)
    }
}
// 文本类，用于实例化文本
class TextWapper extends Component {
    constructor(content){
        super(content);
        this.type = '#text'
        this.content = content;                
    };
    get vdom (){
        this.vchildren = this.props.children.map(child=>child.vdom);
        return this;
    }
    [RENDER_TO_DOM](range){
        this._range = range;
        let root = document.createTextNode(this.content);

        replaceContent(range,root);
    }
}



// 创建元素，每当遇到元素时会 自动调用它
/**
 * 
 * @param {string|Component} type 
 * @param {object} attributes 
 * @param  {Array<string|Component>} children 
 */
export function createElement(type,attributes,...children){
    let e;
    // 判断是否为Dom元素，是则直接调用，否则实例化对应的typ
    if(typeof type ==='string'){
        e = new ElementWapper(type);
    }else{
        e = new type();
    }
    // 设置属性
    for(let p in attributes){
        e.setAttribute(p,attributes[p])
    }
    // 通过递归的调用，构建完整的Dom树
    const insterChildren = (children)=>{
        for(let child of children){
            if(typeof child ==='object' && child instanceof Array){
                insterChildren(child);
            }else{
                if(child === null){
                    continue;
                }
                if(typeof child==='string'||typeof child==='number'){
                    child = new TextWapper(child);
                }
                e.appendChild(child);
            }
        }
    }
    insterChildren(children);
    return e;
}

export function render(component,parentComponent){
    let range = document.createRange();
    range.setStart(parentComponent,0);
    range.setEnd(parentComponent,parentComponent.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}
