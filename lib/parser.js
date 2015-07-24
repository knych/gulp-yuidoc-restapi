/**
 * This is the document parser
 * Should be fed an options object, a list of files and dirs
 */

(function(){
  'use strict';

  var Y = require('yuidocjs');

  var Parser = function(options){
    options = options || {};
    // Be sure NOT to write the resulting JSON file to disk
    options.writeJSON = false;
    // Shut it
    options.lint = false;
    // Shut it, really
    options.quiet = true;

    options.syntaxtype = options.syntaxtype || 'js';

    // Set file list up
    var filemap = {};
    var dirmap = {};

    // Init yui
    var ydoc = new Y.YUIDoc(options);

    Y.DocParser.DIGESTERS['apiclass'] = function(tagname, value, target, block) {
      target[tagname] = value;
    };

    Y.DocParser.DIGESTERS['apiversion'] = function(tagname, value, target, block) {
      target[tagname] = value;
    };

    Y.DocParser.DIGESTERS['apibasepath'] = function(tagname, value, target, block) {
      target[tagname] = value;
    };

    Y.DocParser.DIGESTERS['apimethod'] = function(tagname, value, target, block) {
      var token = value.trim().replace(/  +/g, ' ').split(' ');
      target[tagname] = {
        name: token[0],
        method: token[1].split(/[{}]/)[1],
        path: token[2]
      };
    };

    Y.DocParser.DIGESTERS['apiparam'] = function(tagname, value, target, block) {
      var token = value.trim().replace(/  +/g, ' ').split(' ');
      target[tagname] = target[tagname] || [];
      target[tagname].push({
        type: token[0].split(/[{}]/)[1],
        name: token[1],
        description: value.split(token[1]).slice(1).join(token[1]).trim().replace(/\n/g, '  \n')
      });
    };

    Y.DocParser.DIGESTERS['apipostdata'] = Y.DocParser.DIGESTERS['apiparam'];
    Y.DocParser.DIGESTERS['apioption'] = Y.DocParser.DIGESTERS['apiparam'];

    Y.DocParser.DIGESTERS['apireturn'] = function(tagname, value, target, block) {
      value = value.trim().replace(/  +/g, ' ');
      var status = value.split(' ')[0];
      var statustext = value.split(' ')[1].indexOf('(') === 0 ? value.split(/[()]/)[1] : '';
      var type = value.split(/[{}]/)[1];
      var name = type ? value.split(/[{}]/)[2].trim().split(' ')[0] : undefined;
      var description = type ? value.split(name).slice(1).join(name).trim()
                             : (statustext ? value.split(/[()]/)[2].trim()
                                           : value.split(' ').slice(1).join(' '));

      target[tagname] = target[tagname] || [];
      target[tagname].push({
        status: status,
        statustext: statustext,
        type: type,
        name: name,
        description: description.replace(/\n/g, '  \n')
      });
    };

    // Accumulate files
    this.parse = function(vinyl){
      var data = vinyl.contents.toString('utf8');
      // Don't treat empty files
      if (data.length){
        filemap[vinyl.path] = data;
        dirmap[vinyl.path] = vinyl.cwd;
      }
    };

    // Finally parse them up
    this.complete = function(){
      // Return the generated json
      var data = ydoc.writeJSON(new Y.DocParser({
        syntaxtype: ydoc.options.syntaxtype,
        filemap: filemap,
        dirmap: dirmap
      }).parse());

      delete data.project;
      delete data.files;
      delete data.modules;
      delete data.classes;
      delete data.warnings;

      var api = [], dict = [];

      for (var i in data.classitems) {
        var item = data.classitems[i];
        item.file = item.file.split('/').pop();
        if (item.apiclass) {
          delete item.line;
          delete item.class;
          item.apimethods = item.apimethods || [];
          dict[item.file] = item;
          api.push(item);
        }
        else if (item.apimethod) {
          if (dict[item.file]) {
            dict[item.file].apimethods.push(item);
            delete item.file;
            delete item.class;
          }
        }
        item.description = item.description.replace(/\n/g, '  \n');
      }

      return api;
    };
  };

  module.exports = Parser;

}());
