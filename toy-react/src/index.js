import { createElement, Component,render } from './toy-react';

class MyComponet extends Component {
    render(){
        return (
            <div>
                <h1>luoye</h1>
                {this.props.children}
            </div>
        )
    }
}

render(<MyComponet>
        <div>
            MyComponet
        </div>
     </MyComponet>,document.body);