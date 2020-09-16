import { createElement as create, render } from './react/index'

const createElement = create;


const app = <div>
    123
<siv id="231">test</siv>
    {1 + 3}
    <div>test</div>
</div>

render(app, document.body);
