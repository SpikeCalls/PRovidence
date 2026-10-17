'use strict';
module.exports = {
  ...require('./crawl'),
  ...require('./hunt'),
  ...require('./fix'),
  ...require('./brain'),
  ...require('./report'),
  ...require('./safety'),
  art: require('./art'),
};
