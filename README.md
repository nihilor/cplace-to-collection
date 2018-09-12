# cplace-to-collection

Converts as XML exported cPlace wikis into collections based on markdown with YAML frontmatter.

# How to install?

Clone this repository or use npm to install the package.

```
npm install cplace-to-collection
```

# How to use?

Import the module, provide an XML export of cPlace and define an export destination.

```javascript
const cplace = require('cplace-to-collection');

cplace('cplaceexport.xml', 'export', {
    relink: true,
    collectionHook: function (collections) {
        console.log('Collections found: ', Object.keys(collections));
        return collections;
    }
});
```

It's possible to relink all internal links. Just set `relink: true`. This will replace all id based links to human- and SEO-friendly URLs.

If you want to perform changes on the collection structure, just provide a callback function as `collectionHook`. Return the restructured collection.

# What are collections?

A *collection* is a directory containing files that describe things of the same type. In most cases, these collections consists of one or more Markdown files with YAML frontmatter for structured data.

# What is cPlace?

cPlace is a solution for project management. For more detailed infomration visit [cPlace](https://www.collaboration-factory.de/de/home).

# License

Copyright (c) 2018 Mark Lubkowitz (http://mlu.io/)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.