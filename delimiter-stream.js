'use strict';

const Transform = require('stream').Transform;
const util = require('util');
const defaults = {
  delimiter: '\n',
  encoding: 'utf8'
};

util.inherits(DelimiterStream, Transform);

function DelimiterStream (options) {
  Transform.call(this, options);

  options = options || {};
  this._delimiter = options.delimiter ? options.delimiter : defaults.delimiter;
  this._encoding = options.encoding ? options.encoding : defaults.encoding;
  this._stub = Buffer.from('', this._encoding);
}

DelimiterStream.prototype._transform = function (chunk, chunkEncoding, done) {
  const self = this;
  const encoding = this._encoding;
  const delimiter = this._delimiter;
  const chunkText = chunk.toString(encoding);
  const lines = chunkText.split(delimiter);

  if (lines.length > 1) {
    lines.forEach(function (line, index) {
      // In case it's the first line combine with the previous stub
      if (index === 0) {
        self._stub = Buffer.concat([self._stub, Buffer.from(line, encoding)]);

        const chunk = self._stub.toString(encoding);

        if (chunk.indexOf(delimiter) === -1) {
          self.push(chunk, encoding);
        } else {
          chunk
              .split(delimiter)
              .forEach((subChunk) => self.push(subChunk, encoding));
        }

        self._stub = Buffer.from('', encoding);
      } else if (index === lines.length - 1) {
        // Last part of the chunk, this will be the new stub and the beginning
        // of the next chunk (until delimiter) will be appended to this
        self._stub = Buffer.from(line, encoding);
      } else {
        // This must be a part cleanly separated by the delimiter within the
        // same chunk, push it
        self.push(line, encoding);
      }
    });
  } else {
    // No delimiter found, append the chunk to the stub
    this._stub = Buffer.concat([this._stub, Buffer.from(lines[0], encoding)]);
  }

  done();
};

DelimiterStream.prototype._flush = function (done) {
  this.push(this._stub.toString(this._encoding), this._encoding);
  done();
};

module.exports = DelimiterStream;
