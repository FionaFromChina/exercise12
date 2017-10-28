# Exercise12

> 通过测试

* [How to write a loader?](https://webpack.js.org/development/how-to-write-a-loader/)

> 写一个loader

一个loader就是一个能够输出函数的node模块，当一个资源需要被这个loader进行转换时，会调用该模块输出的函数。在这个函数中可以使用提供的Loader API和webpack提供的this 上下文。

### 开始
当我们想要深入了解loader的不同类型、使用方法和具体案例之前，首先让我们来看一下你可以本地开发和测试loader的三种方式。

想要测试一个单独的loader,你可以简单地在rule对象中使用path来指定本地文件。

webpack.config.js

``` js
{
    test: /\.js$/,
    use: [
        {
            loader: path.resolve('path/to/loader.js'),
            options: {/* ... */}
        }
    ]
}
```
想要测试多个loader,你可以利用resolveLoader.modules来进行配置Webpack使用loader的路径。例如，你有一个本地的loader目录

webpack.config.js

``` js
    resolveLoader: {
    	modules: [ // 这里是webpack会去找loader的地方，是个数组，如果node_modules找不到，会去指定的第二个值->loaders目录寻找
    		'node_modules',
    		path.resolve(__dirname, 'loaders')
    	]
    }
```
最后，如果你已经为自己的loader创建了一个隔离的repo和package,你可以使用npm link, 使自己的项目和创建的项目之间进行关联从而进行测试。

### 简单的使用
当资源只使用了一个loader时，这个loader被调用时，只有一个string类型的参数，该参数是资源文件的内容。

异步的loader可以简单返回一个值，代表被转换以后的module。在更复杂的情况下，loader可以通过 this.callback(err, values...) 方法返回任意个数的值。错误会在异步调用的this.callback中传递，或者在同步调用中被抛出。

一个loader需要返回一到两个返回值，第一个返回值可以是string 或者buffet 类型的JavaScript代码。 第二个可选值是一个JavasSript 对象类型的SourceMap。


### 复杂情况的使用
当有很多loader被调用时，比较重要的一点是需要知道调用顺序是相反的。一般是从右到左，如果数组的写法是从上到下，则调用顺序是由下至上。

所以，在后面的例子中，foo-loader的传入参数是原始资源内容，而bar-loader会接受foo-loader处理完之后的返回值。bar-loader会返回最终被转换以后的module，如果必要的话，还可以会返回source map。

webpack.config.js

```
  {
      test: /\.js$/,
      use: [
          'bar-loader',
          'foo-loader'
      ]
  }
    
```

### 指导原则
下面所列出的是写一个loader时，需要遵循的一些指导原则。它们依照重要性进行排序，有些可能只有在特定场景下才有指导意义，请阅读以下详细的部分以获取更多的信息。

* 保持简洁 Keep them simple
* 保持链式调用 Utilize chaining
* 有模块化的输出 Emit modular output
* 确保loader是无状态的 Make sure they're stateless
* Employ loader utilities.[不知道改如何翻译]（使用loader工具类）
* 标记loader的依赖 Mark loader dependencies
* 解决模块依赖 Resolve module dependencies 
* 公共代码抽离 Extract common code
* 避免绝对路径 Avoid absolute paths
* 使用同类依赖 Use peer dependencies

#### 保持简洁
Loader应该只做一件事情，这不仅使维护各个loader变得更加容易，也可以使得在更多场景下可以通过链式调用进行更方便的复用。

#### 链式
Loader可以串连调用有诸多好处。比起写一个需要处理5个任务的独立Loader，写5个更简单的loader可以将工作进行细分。将这5个任务进行细分，不仅可以使每个loader更加简单，而且可以用他们去实现你当初没有考虑到的一些需求。

考虑一个例子，我们需要把一个模板文件通过loader转换成html文件。可以写一个单独的loader，将模板源文件编辑，执行并转换成html代码。然而依据上述指导原则，可以利用一个已经存在的的apply-loader和其他开源的loader进行链式调用。

* jade-loader: 转换模板代码
* apply-loader: 用loader执行函数，返回原生的html
* html-loader: 接收html，返回JavaScript模块

【事实上，loaders之间可以链式调用也意味着，一个loader不需要一定返回javascript代码，只要下一个被调用loader能接收，任何输出都是可以的。】

#### Modular  模块化
保证输出是模块化的，Loader生成的模块应该遵循普通模块的设置原则。

#### 无状态
确保loader是无状态的，每次运行都应当是独立的。

#### Loader Utilities
利用loader-utils(https://github.com/webpack/loader-utils)包的优势。它提供了非常多有用的工具，其中最常用的是获取传给loader的option。schema-utils通常会和loader-util一起使用，来对传入的options进行校验。下面是一个简单的例子:
loader.js

```
import { getOptions } from 'loader-utils';
import { validateOptions } from 'schema-utils';

const schema = {
  type: object,
  properties: {
    test: {
      type: string
    }
  }
}

export default function(source) {
  const options = getOptions(this);

  validateOptions(schema, options, 'Example Loader');

  // Apply some transformations to the source...

  return `export default ${ JSON.stringify(source) }`;
};
```
#### loader 依赖
如果loader使用了外部依赖，一定要显示指明依赖的包。这个信息会用于在watch模式下清除缓存的loader并重新编译。下面是个简短的例子：

```
import path from 'path';

export default function(source) {
    var callback = this.async();
    var headerPath = path.resolve('header.js');

    this.addDependency(headerPath);

    fs.readFile(headerPath, 'utf-8', function(err, header) {
        if(err) return callback(err);
        callback(null, header + '\n' + source);
    });
}
```
#### 模块依赖
根据模块的不同，需要有不同的指定依赖的方式。在CSS里面，使用@import 和url()。这些依赖需要被模块系统识别。

有两种方式可以进行解析：
* 把他们转化成require
* 使用this.resolve函数来解析路径

css-loader是使用第一种方式的一个很好的例子，它把依赖都变成了require语句。做法是将@import语句转换成了require其他css的申明，url(...)被替换成了require对应的文件。

对于less-loader, 不能简单的对import进行require转化，因为它需要一次性解决变量和mixin的引用，因此less-loader使用了自定义的路径解析模块，使用了第二种方式来解析依赖关系。

如果语言只支持相对路径，你可以使用 ~ 约定来指定对模块的引用。如：
```
url('~some-lib/image.jpg')
```

#### 公共代码
避免在每个loader生成同样的代码，而是在loader里面能生成一个运行时文件，并通过require进行引用。

#### 绝对路径
不要在loader里面引用绝对路径，否则当工程地址改变时，绝对地址的hash也会改变。在Loader-util中有stringifyRequest方法，可以将绝对路径转换为相对路径。

#### 同类依赖
如果你的loader只是在其他package的基础上进行了封装，那你应该将这个package加为同类依赖。这个方法可帮助开发应用的人在package.json中指定需要依赖的版本。

如：sass-loader将node-sass指定为同类依赖。

```
"peerDependencies:" {
    "node-sass": "^4.0.0"
}
```

### 测试
如果你按照上面的指导原则写出了一个loader并且在本地通过了成功运行了，接下来，我们应该写一个简单的单元测试来确保loader的正确输出。我们将会使用Jest测试框架，同时需要使用babel-jest来帮助我们使用import/export和async/await。

首先安装依赖。

```
npm i --save-dev jest babel-jest babel-preset-env
```
.babelrc
```
{
  "presets": [[
    "env",
    {
      "targets": {
        "node": "4"
      }
    }
  ]]
}
```
我们的loader会将.txt文件里面的[name]字段替换成loader的options里面的name项，output的输出是一个转化后的有效模块。
src/loader.js
```
import { getOptions } from 'loader-utils';
export default source => {
    const options = getOptions(this);

    source = source.replace(/\[name\]/g, options.name);

    return `export default ${ JSON.stringify(source) }`;
}
```
源文件:

test/example.txt
```
Hey [name]!
```
接下来我们会使用nodejs的API和memory-fs来执行webpack, 能够避免触发输出到硬盘的过程，我们可以从stats里面的data里拿到转换后的模块。

```
npm i --save-dev webpack memory-fs
```
test/compiler.js

```
import path from 'path';
import webpack from 'webpack';
import memoryfs from 'memory-fs';

export default (fixture, options = {}) => {
    const compiler = webpack({
        context: __dirname,
        entry: `./${fixture}`,
        output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js'
        },
        module: {
            rules: [{
                test: /\.txt$/,
                use: {
                    loader: path.resolve(__dirname, '../src/loader.js'),
                    options: {
                        name: 'Alice'
                    }
                }
            }]
        }
    });

    compiler.outputFileSystem = new memoryfs();

    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if(err) reject(err);

            resolve(status);
        });
    });
}

```
在这个例子中，我们在compiler里面设置了webpack，你也可以使用options去初始化webpack设置，这样就可以使用同一个compile测试不同的启动项。

现在，我们对上述的loader进行测试。

test/loader.test.js
```
import compiler from './compiler.js';

test('Insert name and  outputs Javascript', async () => {
    const stats = await compiler('example.txt');
    const output = stats.toJson().modules[0].source;

    expect (output) .toBe(`export default "Hey Alice! \\n"`);
})
```
package.json
```
"scripts": {
  "test": "jest"
}
```
现在就可以测试这个新loader了。测试通过后，就可以开发、调试、部署loader啦，和社区的其他伙伴们分享你的创作！



> 知识点和需要注意的地方

1. const object
    
    被定义为const的对象，不能再被赋值，但它的key和value都是可变的。
    
    ```
        const obj = {a: 1}
        obj = {b:2} // TypeError: Assignment to constant variable.
        obj.a = 2 // 2, 可以改变obj对应key的value
        obj.b = bar // bar, 可以为obj添加key
        
        // 如果想要锁定对象可以用freeze方法
        Object.freeze(obj) // 无论obj后面如何赋值都不再生效
        
    ```
2. 在webpack的loader的test方法中，最好能够清晰的指明需要使用loader的文件夹，否则global.js也会被loader处理，可能会被loader误处理。
3. webpack loader的写法。
4. 在test.js中，定义了一个define方法，当require了被loader处理的index.js时，调用了define函数，然后在define函数中，执行了function。从而改变了module的值。


