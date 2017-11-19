'use strict'

// 成功
exports.SUCCESS = 0

// 失败
exports.FAILURE = 1

// 客户端通用错误
exports.CLIENT_ERROR = 400

// 参数非法
exports.PARAM_INVALID = 401

// 请求的接口需要登录态
exports.AUTH_UNSIGNIN = 402

// 用户名或密码错误
exports.AUTH_ERROR = 403

// 资源不存在
exports.RESOURCE_NOT_FOUND = 404

// 资源已存在
exports.RESOURCE_EXISTS = 405

// 资源冲突
exports.RESOURCE_CONFLICT = 406

// 无权限访问
exports.PERMISSION_DENIED = 407

// 客户端版本过低
exports.CLIENT_NOT_SUPPORTED = 408


// 内部调用错误
exports.INNER_ERROR = 500


// 数据库错误
exports.DB_ERROR = 510

// 数据库连接错误
exports.DB_CONNECT_ERROR = 511

// 数据库查询错误
exports.DB_SELECT_ERROR = 512

// 数据库插入错误
exports.DB_INSERT_ERROR = 513

// 数据库更新错误
exports.DB_UPDATE_ERROR = 514

// 数据库删除错误
exports.DB_DELETE_ERROR = 515


// 外部错误
exports.OUTER_ERROR = 600

// 6xx 第三方错误
exports.LEANCLOUD_MESSAGE_DELETE_ERROR = 610
