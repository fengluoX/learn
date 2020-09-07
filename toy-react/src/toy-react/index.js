// 元素类，用于实例化Dom元素
class ElementWapper {
    constructor(type){
        this.root = document.createElement(type);
    };

    setAttribute(name,value){
        this.root.setAttribute(name,value);
    };  

    appendChild(component){
        this.root.appendChild(component.root);
    }
}
// 文本类，用于实例化文本
class TextWapper {
    constructor(content){
        this.root = document.createTextNode(content);
    };
}

// toy-react 基类，所有自定义组件需要继承它
export class Component {
    constructor(){
        this.props = Object.create({
            children:[]
        });
        this._root = null;
    }
    setAttribute(name,value){
        this.props[name]=value;
    }
    appendChild(component){
        this.props.children.push(component);
    }
    // render函数会获取root属性，从而触发递归调用，构建完整的Dom树。深度搜索优先
    get root(){
        if(!this._root){
            this._root = this.render().root;
        }
        return this._root;
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
                if(typeof child==='string'){
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
    parentComponent.appendChild(component.root);
}
