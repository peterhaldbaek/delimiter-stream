# delimiter-stream

[![Build Status](https://travis-ci.org/peterhaldbaek/delimiter-stream.svg?branch=master)](https://travis-ci.org/peterhaldbaek/delimiter-stream)

Takes a stream and transforms it into chunks matching the content between
delimiters. Useful for analyzing big data sets and file streams on the fly.


## Installation

```sh
$ npm install delimiter-stream
```


## Usage

Use the stream to split chunks into chunks separated by the delimter either by
using the `data` event or by piping the stream into other streams.

The stream constructor accepts these parameters

  - _delimiter_ delimiter used to split stream (default is `\n`)
  - _encoding_ encoding of the stream (default is `utf8`)


### Using the `data` event

```javascript
var DelimiterStream = require('delimiter-stream');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var delimiterstream = new DelimiterStream({
  delimiter: '|'
});

delimiterstream.on('data', function(chunk) {
  console.log(decoder.write(chunk));
});

delimiterstream.write('one|tw');
delimiterstream.write('o|three');
delimiterstream.write('|four|fiv');
delimiterstream.write('e');
```

This results in

```
one
two
three
four
five
```


### Piping

```javascript
var fs = require('fs');
var DelimiterStream = require('delimiter-stream');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

var linestream = new DelimiterStream();

var input = fs.createReadStream('somefile.txt');

linestream.on('data', function(chunk) {
  console.log(decoder.write(chunk));
});

input.pipe(linestream);
```

This will print the contents of `somefile.txt` line by line.

The test suite also shows examples on how to use the stream.


## Limitations

Currently the stream only supports one-character delimiters. I will happily
accept pull requests adding support for mulitple characters.

Empty chunks will be ignored since it is not possible to push an empty string
in Node unless the stream is in _object mode_
(<https://nodejs.org/api/stream.html#stream_object_mode>). This stream only
operates on Strings and Buffers so support for this will likely not be added in
the future.