const createElement = (tagName: string, props: Record<string, string>, ...children: Array<string | HTMLElement>): HTMLElement => {
    const root = document.createElement(tagName);
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

const render = (element: HTMLElement, parentElement: HTMLElement) => {
    parentElement.appendChild(element);
}

export {
    createElement,
    render
}

