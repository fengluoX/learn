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
    resolve:{
        extensions:['.js','.tsx','.ts']
    }
}