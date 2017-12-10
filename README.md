# www-rd

eventEmitter 发出的事件，无法正常使用 async/await

array.forEach 无法正常使用 async/await

## QuickStart

see [egg docs][egg] for more detail.

### 开发

```bash
$ npm install
$ npm run dev
$ open http://localhost:8989/
```

### 部署


#### 构建

```bash
$ npm install --production
$ tar -zcvf ../release.tgz .
```

#### 发布

```bash
$ npm install egg-scripts --save
$ npm start
$ npm stop
```

#### 参数

```bash
--port=7001 --daemon --env=prod --title=egg-server
```

### 运维

#### 查看进程

```bash
ps -ef | grep node
```

### npm scripts

- Use `npm run lint` to check code style.
- Use `npm test` to run unit test.
- Use `npm run autod` to auto detect dependencies upgrade, see [autod](https://www.npmjs.com/package/autod) for more detail.


[egg]: https://eggjs.org