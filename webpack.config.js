const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /src\/.*?js$/, // DONE: 默认会用define-loader去resolve所有的js, 所以在这里要指定使用define-loader的文件夹范围
        use: [
          'define-loader'
        ]
      }
    ]
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'loader')
    ]
  }
}