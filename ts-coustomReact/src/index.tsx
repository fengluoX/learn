import { createElement as create, render, Component } from './react/index'

const createElement = create;

interface List {
    key: number;
    children?: List[]
}

class Itme extends Component {
    constructor() {
        super();
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



class App extends Component {
    constructor() {
        super();
    }
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
                {this.props.children}
                123
                <div id="231">test</div>
                <div>test</div>
            </div>
        )
    }
}



render(<App name="app">
    <div>
        children
    </div>
</App>, document.body);
