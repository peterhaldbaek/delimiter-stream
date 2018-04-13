'use strict';

const fs = require('fs');
const path = require('path');
const Readable = require('stream').Readable;
const Writable = require('stream').Writable;
const StringDecoder = require('string_decoder').StringDecoder;
const expect = require('chai').expect;

const DelimiterStream = require('../delimiter-stream');

describe('delimiter-stream', function () {

  beforeEach(function () {
    this.decoder = new StringDecoder('utf8');
  });

  it('should use linebreak as default delimiter', function () {
    const linestream = new DelimiterStream();
    expect(linestream._delimiter).to.equal('\n');
  });

  it('should use utf8 as default encoding', function () {
    const linestream = new DelimiterStream();
    expect(linestream._encoding).to.equal('utf8');
  });

  it('should support piping', function (done) {
    const self = this;
    const input = createReadStream('first|second|third|');

    const delimiterstream = new DelimiterStream({
      delimiter: '|'
    });

    const expectedOutcome = [
      'first',
      'second',
      'third'
    ];
    const output = new Writable();
    output._write = function (chunk, encoding, callback) {
      const actual = self.decoder.write(chunk);
      const expected = expectedOutcome.shift();
      expect(actual).to.equal(expected);
      callback();
    };

    output.on('finish', function () {
      expect(expectedOutcome).to.have.length(0);
      done();
    });

    input
        .pipe(delimiterstream)
        .pipe(output);
  });

  it('should support data event', function (done) {
    const self = this;

    const delimiterstream = new DelimiterStream({
      delimiter: '|'
    });

    const expectedOutcome = [
      'first',
      'second',
      'third',
      'fourth',
      'fifth',
      'sixth'
    ];

    delimiterstream.on('data', function (chunk) {
      const actual = self.decoder.write(chunk);
      const expected = expectedOutcome.shift();
      expect(actual).to.equal(expected);
    });

    delimiterstream.on('finish', function () {
      expect(expectedOutcome).to.have.length(0);
      done();
    });

    delimiterstream.write('first|second|third');
    delimiterstream.write('|fourt');
    delimiterstream.write('h|fifth|');
    delimiterstream.write('six');
    delimiterstream.write('th');
    delimiterstream.end();
  });

  it('should ignore empty lines', function (done) {
    const self = this;

    const delimiterstream = new DelimiterStream();

    const expectedOutcome = [
      'first',
      'second',
      'third'
    ];

    delimiterstream.on('data', function (chunk) {
      const actual = self.decoder.write(chunk);
      const expected = expectedOutcome.shift();
      expect(actual).to.equal(expected);
    });

    delimiterstream.on('finish', function () {
      expect(expectedOutcome).to.have.length(0);
      done();
    });

    delimiterstream.write('\nfirst\n\nsecond\n\n\nthird\n');
    delimiterstream.end();
  });

  it('should support streaming huge files', function (done) {
    this.timeout(30000);

    const encoding = 'utf8';
    const delimiter = '▌▌▌▌';
    const filename = createHugeFile(delimiter, encoding);
    const linestream = new DelimiterStream({delimiter, encoding});

    const input = fs.createReadStream(filename, {encoding});
    const output = new Writable();
    let index = 1;

    output._write = function (chunk, encoding, callback) {
      const actual = JSON.parse(chunk);
      const expected = {idx: index++};

      expect(actual.idx).to.equal(expected.idx);
      callback();
    };

    output.on('finish', function () {
      done();
    });

    input
        .pipe(linestream)
        .pipe(output);
  });

  it('should be able to deal with irregularly transmitted messages with multi-character delimiters', function (done) {
    this.timeout(10000);

    const encoding = 'utf8';
    const delimiter = '▌▌▌▌';
    const linestream = new DelimiterStream({delimiter, encoding});

    const filename = createHugeFile(delimiter, encoding, 2000);
    let fileContent = Buffer.from(fs.readFileSync(filename, {encoding}), encoding);

    const output = new Writable();
    const input = new Readable();
    let chunkSize = 50;
    let index = 1;

    output._write = function (chunk, encoding, callback) {
      const actual = JSON.parse(chunk);
      const expected = {idx: index++};

      expect(actual.idx).to.equal(expected.idx);
      callback();
    };

    output.on('finish', function () {
      done();
    });

    input
        .pipe(linestream)
        .pipe(output);

    transmitFileChunked(fileContent, chunkSize, input);
  });
});

function transmitFileChunked (fileContent, chunkSize, input) {
  if (!fileContent || !fileContent.length) {
    input.push(null);
    return null;
  }

  const chunk = fileContent.slice(0, chunkSize);

  input.push(chunk);
  fileContent = fileContent.slice(chunkSize);

  return transmitFileChunked(fileContent, chunkSize, input);
}

function createReadStream (text) {
  const rs = new Readable();

  rs.push(text);
  rs.push(null);

  return rs;
}

function createHugeFile (delimiter, encoding, length) {
  length = length || 7500;

  const filename = path.join(__dirname, 'tmp.txt');

  removeHugeFile(filename);

  for (let idx = 1; idx < length; idx++) {
    const newText = JSON.stringify({idx});

    fs.appendFileSync(filename, newText + delimiter, {encoding});
  }

  return filename;
}

function removeHugeFile (passedFilename) {
  const filename = passedFilename || path.join(__dirname, 'tmp.txt');

  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }
}
