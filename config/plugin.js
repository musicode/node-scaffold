'use strict';

// had enabled by egg
// exports.static = true;

exports.mysql = {
  enable: true,
  package: 'egg-mysql',
}

exports.redis = {
  enable: true,
  package: 'egg-redis',
}

exports.filter = {
  enable: true,
  package: 'egg-filter',
}

exports.etpl = {
  enable: true,
  package: 'egg-view-etpl',
}