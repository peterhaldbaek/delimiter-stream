var fs = require('fs');
var path = require('path');
var Readable = require('stream').Readable;
var Writable = require('stream').Writable;
var StringDecoder = require('string_decoder').StringDecoder;
var _ = require('lodash');
var expect = require('chai').expect;

var DelimiterStream = require('../delimiter-stream');


describe('delimiter-stream', function() {

  beforeEach(function() {
    this.decoder = new StringDecoder('utf8');
  });

  it('should use linebreak as default delimiter', function() {
    var linestream = new DelimiterStream();
    expect(linestream._delimiter).to.equal('\n');
  });

  it('should use utf8 as default encoding', function() {
    var linestream = new DelimiterStream();
    expect(linestream._encoding).to.equal('utf8');
  });

  it('should support piping', function(done) {
    var self = this;
    var input = createReadStream('first|second|third|');

    var delimiterstream = new DelimiterStream({
      delimiter: '|'
    });

    var expectedOutcome = [
      'first',
      'second',
      'third'
    ];
    var output = new Writable();
    output._write = function(chunk, encoding, callback) {
      var actual = self.decoder.write(chunk);
      var expected = expectedOutcome.shift();
      expect(actual).to.equal(expected);
      callback();
    };

    output.on('finish', function() {
      expect(expectedOutcome).to.have.length(0);
      done();
    });

    input
      .pipe(delimiterstream)
      .pipe(output);
  });

  it('should support data event', function(done) {
    var self = this;

    var delimiterstream = new DelimiterStream({
      delimiter: '|'
    });

    var expectedOutcome = [
      'first',
      'second',
      'third',
      'fourth',
      'fifth',
      'sixth'
    ];

    delimiterstream.on('data', function(chunk) {
      var actual = self.decoder.write(chunk);
      var expected = expectedOutcome.shift();
      expect(actual).to.equal(expected);
    });

    delimiterstream.on('finish', function() {
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

  it('should ignore empty lines', function(done) {
    var self = this;

    var delimiterstream = new DelimiterStream();

    var expectedOutcome = [
      'first',
      'second',
      'third'
    ];

    delimiterstream.on('data', function(chunk) {
      var actual = self.decoder.write(chunk);
      var expected = expectedOutcome.shift();
      expect(actual).to.equal(expected);
    });

    delimiterstream.on('finish', function() {
      expect(expectedOutcome).to.have.length(0);
      done();
    });

    delimiterstream.write('\nfirst\n\nsecond\n\n\nthird\n');
    delimiterstream.end();
  });

  it('should support streaming huge files', function(done) {
    this.timeout(30000);
    var self = this;
    var filename = createHugeFile();

    var input = fs.createReadStream(filename);
    var linestream = new DelimiterStream();
    var output = new Writable();
    var i = 1;
    output._write = function(chunk, encoding, callback) {
      var actual = self.decoder.write(chunk);
      var expected = _.padRight('', i, i++);
      expect(actual).to.equal(expected);
      callback();
    };

    output.on('finish', function() {
      done();
    });

    input
      .pipe(linestream)
      .pipe(output);
  });
});

function createReadStream(text) {
  var rs = new Readable();
  rs.push(text);
  rs.push(null);
  return rs;
}

function createHugeFile() {
  var filename = path.join(__dirname, 'tmp.txt');
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }
  // Create huge temporary file
  var delimiter = '\n';
  for (var i = 1; i < 15000; i++) {
    var text = _.padRight('', i, i);
    fs.appendFileSync(filename, text + delimiter);
  }

  return filename;
}
