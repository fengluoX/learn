const RENDER_TO_DOM = Symbol("render to dom");

// 元素类，用于实例化Dom元素
class ElementWapper {
    constructor(type){
        this.root = document.createElement(type);
    };

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
    }
    [RENDER_TO_DOM](range){
        range.deleteContents();
        range.insertNode(this.root);
    }
}
// 文本类，用于实例化文本
class TextWapper {
    constructor(content){
        this.root = document.createTextNode(content);
    };
    [RENDER_TO_DOM](range){
        range.deleteContents();
        range.insertNode(this.root);
    }
}

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
    [RENDER_TO_DOM](range){
        this._range = range;
        this.render()[RENDER_TO_DOM](range);
    }
    rerender(){
        let oldRange = this._range;
        let range = document.createRange();
        range.setStart(oldRange.startContainer,oldRange.startOffset);
        range.setEnd(oldRange.startContainer,oldRange.startOffset)
        this[RENDER_TO_DOM](range);
        oldRange.setStart(range.endContainer,range.endOffset);
        oldRange.deleteContents(range);
    }
    setState(newState){
        if(this.state ===null || typeof this.state !=='object' ){
            this.state = newState;
            this.rerender();
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
        this.rerender();
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
