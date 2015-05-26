var Transform = require('stream').Transform;
var util = require('util');


util.inherits(DelimiterStream, Transform);

function DelimiterStream(options) {
  Transform.call(this, options);

  var defaults = {
    delimiter: '\n',
    encoding: 'utf8'
  };

  options = options || {};
  this._delimiter = options.delimiter ? options.delimiter : defaults.delimiter;
  this._encoding = options.encoding ? options.encoding : defaults.encoding;
  this._stub = '';
};

DelimiterStream.prototype._transform = function(chunk, encoding, done) {
  var self = this;
  var s = chunk.toString(this._encoding);

  var lines = s.split(this._delimiter);
  if (lines.length > 1) {
    lines.forEach(function(l, index) {
      if (index === 0) {
        // First part, append it to the stub and push it
        self.push(self._stub + l);
        self._stub = '';
      } else if (index === lines.length - 1) {
        // Last part of the chunk, this will be the new stub and the beginning
        // of the next chunk (until delimiter) will be appended to this
        self._stub = l;
      } else {
        // This must be a part cleanly separated by the delimiter within the
        // same chunk, push it
        self.push(l);
      }
    });
  } else {
    // No delimiter found, append the chunk to the stub
    this._stub = this._stub + lines[0];
  }

  done();
};

DelimiterStream.prototype._flush = function(done) {
  this.push(this._stub);
  done();
};

module.exports = DelimiterStream;
