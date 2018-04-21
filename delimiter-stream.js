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

  this._stub = Buffer.from([], this._encoding);
  this._delimiterBuffer = Buffer.from(this._delimiter, this._encoding);
}

DelimiterStream.prototype._transform = function (chunk, chunkEncoding, done) {
  let lines = this.getLines(chunk);

  this.dispatchLines(lines);
  done();
};

/**
 * Retrieves the lines from a given buffer chunk.
 * Detects the delimiter buffer and chunks the lines accordingly, concatenates the previous left over stub to the lines chunk.
 *
 * @param {Buffer}  linesChunk
 * @return {Array}
 */
DelimiterStream.prototype.getLines = function (linesChunk) {
  const delimiterLength = this._delimiterBuffer.length;
  const encoding = this._encoding;

  const lines = [];
  let delimiterHits = 0;
  let lastSplitIndex = 0;

  if (this._stub.length) {
    linesChunk = Buffer.concat([this._stub, linesChunk]);
    this._stub = Buffer.from('', encoding);
  }

  linesChunk.forEach((bufferChar, charIndex) => {
    let delimiterChar = this._delimiterBuffer[delimiterHits];

    if (bufferChar === delimiterChar) {
      delimiterHits++;

      const hasFoundDelimiter = delimiterHits === delimiterLength;

      if (hasFoundDelimiter) {
        const messageEnd = charIndex + 1 - delimiterLength;
        let chunk = linesChunk.slice(lastSplitIndex, messageEnd);

        lines.push(chunk);
        lastSplitIndex = charIndex + 1;
        delimiterHits = 0;
      }
    } else {
      delimiterHits = 0;
    }
  });

  if (lastSplitIndex !== linesChunk.length) {
    this._stub = Buffer.concat([this._stub, linesChunk.slice(lastSplitIndex)]);
  }

  return lines;
};

/**
 * Dispatches the retrieved lines to the next stream.
 *
 * @param {Buffer[]}  lines           a list of line buffers
 * @param {Number}    [lineIndex=0]   the current line index which is being iterated
 * @return {*}
 */
DelimiterStream.prototype.dispatchLines = function (lines, lineIndex = 0) {
  const encoding = this._encoding;
  const line = lines[lineIndex];

  // Check if the line is a delimiter line => do not add it to the previous chunk!
  this.push(line, encoding);

  lineIndex++;

  if (lineIndex < lines.length) {
    return this.dispatchLines(lines, lineIndex);
  }
};

DelimiterStream.prototype._flush = function (done) {
  this.push(this._stub.toString(this._encoding), this._encoding);
  done();
};

module.exports = DelimiterStream;
