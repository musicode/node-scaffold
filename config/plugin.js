'use strict';

// had enabled by egg
// exports.static = true;

exports.mysql = {
  enable: false,
  package: 'egg-mysql',
}

exports.redis = {
  enable: false,
  package: 'egg-redis',
}

exports.validate = {
  enable: true,
  package: 'egg-validate',
}
