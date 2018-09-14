const fs = require("fs");
const path = require("path");
const util = require("util");
var xml2json = require("xml2json");
var json2yaml = require("json2yaml");
var turndown = require("turndown");

CPlaceToCollection.prototype.createPath = function (targetDir) {
    console.log(targetDir);
    targetDir = path.normalize(targetDir);
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(parentDir, childDir);
        if (!fs.existsSync(curDir)) fs.mkdirSync(curDir);
        return curDir;
    }, initDir);
}

CPlaceToCollection.prototype.parseValue = function (value) {
    // has a value equivalent to empty?
    if (value == null) return '';
    if (typeof value == 'object' && Object.keys(value).length == 0) return '';
    if (value === "{}" || value === '' || value === "[]") return '';

    // check if boolean
    var boolValue = typeof value == 'string' ? value.trim().toLowerCase() : value;
    if (boolValue == 'true' || boolValue == 'false') return boolValue == 'true';

    // check if json
    var isJson = false;
    var jsonValue = typeof value !== "string" ? JSON.stringify(value) : value;
    try {
        jsonValue = JSON.parse(jsonValue);
    } catch (e) {
        isJson = false;
    }
    if (typeof jsonValue === "object" && jsonValue !== null) {
        isJson = true;
    }
    if (isJson) return jsonValue;

    // simply return all other values
    return value;
}

CPlaceToCollection.prototype.explodeAttributes = function (attributes) {
    attributes = !util.isArray(attributes) ? [attributes] : attributes;
    
    var explodedAttributes = [];
    
    for(var i = 0; i < attributes.length; i++) {
        var explodedAttribute = {};
        for(var property in attributes[i]) {
            explodedAttribute[property] = this.parseValue(attributes[i][property]);
        }
        explodedAttributes.push(explodedAttribute);
    }

    return explodedAttributes;
}

CPlaceToCollection.prototype.saveToYAML = function (filename, data) {
    fs.writeFileSync(
        filename + '.yaml',
        json2yaml.stringify(data)
    );
}

CPlaceToCollection.prototype.saveToMarkdown = function (filename, content, frontmatter) {
    fs.writeFileSync(
        filename + '.md',
        json2yaml.stringify(frontmatter) + "---" + "\r\n\r\n" + turndown().turndown(content)
    );
}

CPlaceToCollection.prototype.titleToFilename = function (title) {
    // fixme:
    // remove html tags (NOT YET IMPLEMENTED)
    
    // preserve escaped octets.
    title = title.replace(/%([a-fA-F0-9][a-fA-F0-9])/g, "---$1---");
    
    // remove percent signs
    title = title.replace("%", "");
    
    // restore octets
    title = title.replace(/\-\-\-([a-fA-F0-9][a-fA-F0-9])\-\-\-/g, "$1");
    
    // convert to lower case
    title = title.toLowerCase();
    
    // convert spaces and dashes to hypens
    title = title.replace(
        /(\%c2\%a0|\%e2\%80\%93|\%e2\%80\%94|\&nbsp\|\&\#160\;|\&ndash\;|\&\#8211\;|\&mdash\;|\&\#8212)/gi,
        "-"
    );
    
    // slashes to hyphens
    title = title.replace("/", "-");
    
    // strip characters
    var stripThem = [
        "%c2%a1",
        "%c2%bf",
        "%c2%ab",
        "%c2%bb",
        "%e2%80%b9",
        "%e2%80%ba",
        "%e2%80%98",
        "%e2%80%99",
        "%e2%80%9c",
        "%e2%80%9d",
        "%e2%80%9a",
        "%e2%80%9b",
        "%e2%80%9e",
        "%e2%80%9f",
        "%c2%a9",
        "%c2%ae",
        "%c2%b0",
        "%e2%80%a6",
        "%e2%84%a2",
        "%c2%b4",
        "%cb%8a",
        "%cc%81",
        "%cd%81",
        "%cc%80",
        "%cc%84",
        "%cc%8c"
    ];
    stripThem.forEach(character => {
        title = title.replace(character, "");
    });
    
    // convert times to x
    title = title.replace("%c3%97", "x");
    
    // kill entities
    title = title.replace(/&.+?;/g, "");
    
    // replace characters
    title = title.replace(/[^%a-z0-9 _-]/g, "");
    title = title.replace(/\s+/g, "-");
    title = title.replace(/\-\+/, "-");
    title = title.replace(/^\-|\-$/g, "-");
    
    return title;
}

function CPlaceToCollection() {}

module.exports = function (source, destination, _options) {
    // optimize merging and default options
    _options = _options || {};
    destination = destination.substring(destination.length - 1) != '/' ? destination + '/' : destination;
    var cplace = new CPlaceToCollection;

    if (!fs.existsSync(source)) return false;

    /*
    retrieve and parse source file to json
    sc = source file content
    sp = source file content parsed
    */
    var sc = fs.readFileSync(source);
    var sp = xml2json.toJson(sc, {
        object:         true,
        coerce:         true,
        sanitize:       true,
        trim:           true
    });

    // iterate through data structure
    let idToFilenameIndex = {};

    // data types
    let dataTypes = [];
    if (sp.hasOwnProperty('export') && sp.export.hasOwnProperty('workspace') && sp.export.workspace.hasOwnProperty('types') && sp.export.workspace.types.hasOwnProperty('type')) {
        var spDataTypes = util.isArray(sp.export.workspace.types.type) ? sp.export.workspace.types.type : [sp.export.workspace.types.type];
        spDataTypes.forEach(dataType => {
            dataTypes.push({
                id:             cplace.parseValue(dataType.id),
                name:           cplace.parseValue(dataType.name),
                nameSingular:   cplace.parseValue(dataType.localizedNameSingular),
                namePlural:     cplace.parseValue(dataType.localizedNamePlural),
                description:    cplace.parseValue(dataType.description),
                appliesTo:      cplace.parseValue(dataType.appliesTo),
                iconName:       cplace.parseValue(dataType.iconName),
                attributeDef:   dataType.attributeDefinitions.hasOwnProperty('attributeDefinition') ? cplace.explodeAttributes(dataType.attributeDefinitions.attributeDefinition) : ''
            });
        });
    }
    let dataPath = destination + '_data/';
    if (!fs.existsSync(dataPath)) cplace.createPath(dataPath);
    cplace.saveToYAML(dataPath + 'datatypes', dataTypes);

    // rootpage
    let rootPages = [];
    if (sp.hasOwnProperty('export') && sp.export.hasOwnProperty('workspace') && sp.export.workspace.hasOwnProperty('rootPage') && sp.export.workspace.rootPage.hasOwnProperty('page')) {
        var spRootPages = util.isArray(sp.export.workspace.rootPage.page) ? sp.export.workspace.rootPage.page : [sp.export.workspace.rootPage.page];
        spRootPages.forEach(rootPage => {
            let newRootPage = {
                data: {
                    id:             cplace.parseValue(rootPage.id),
                    name:           cplace.parseValue(rootPage.name),
                    type:           cplace.parseValue(rootPage.custom.type)
                },
                content:            cplace.parseValue(rootPage.content),
                filename:           cplace.titleToFilename(rootPage.name)
            };
            // add page
            rootPages.push(newRootPage);

            // add link details zu map
            idToFilenameIndex[newRootPage.data.id] = {
                title: newRootPage.data.name,
                url: '_pages/' + newRootPage.filename
            };
        });
    }
    let pagesPath = destination + '_pages/';
    if (!fs.existsSync(pagesPath)) cplace.createPath(pagesPath);
    rootPages.forEach(rootPage => cplace.saveToMarkdown(pagesPath + rootPage.filename, rootPage.content, rootPage.data));

    // collections
    let collections = [];
    if (sp.hasOwnProperty('export') && sp.export.hasOwnProperty('workspace') && sp.export.workspace.hasOwnProperty('pages') && sp.export.workspace.pages.hasOwnProperty('page')) {
        var spPages = util.isArray(sp.export.workspace.pages.page) ? sp.export.workspace.pages.page : [sp.export.workspace.page.page];
        spPages.forEach(page => {
            let collectionId = page.hasOwnProperty('custom') && page.custom.hasOwnProperty('type') ? page.custom.type : 'data';
            collectionId = collectionId.trim().toLowerCase() == 'default.page' ? 'pages' : collectionId;
            collectionId = cplace.titleToFilename(collectionId);

            let newPage = {
                data: {
                    id:             cplace.parseValue(page.id),
                    name:           cplace.parseValue(page.name),
                    title:          cplace.parseValue(page.name),
                    category:       cplace.parseValue(page.custom.type),
                    layout:         cplace.titleToFilename(page.custom.type),
                    excerpt:        '',
                    attributes:     []
                },
                content:            cplace.parseValue(page.content),
                filename:           cplace.titleToFilename(page.name)
            };

            // get attributes
            var spAttributes = util.isArray(page.custom.attributes.attribute) ? page.custom.attributes.attribute : [page.custom.attributes.attribute];
            spAttributes.forEach(attribute => {
                // create a new structure
                var newAttribute = {};
                newAttribute.name = attribute.name;
    
                // some attributes have multiple values
                var spValue = util.isArray(attribute.values.value) ? attribute.values.value : [attribute.values.value];
                newAttribute.value = [];
                spValue.forEach(subAttribute => {
                    var valueType = subAttribute.substring(0,1) !== '' ? subAttribute.substring(0,1) : 's';
                    var valueCleaned = subAttribute.substring(1)
                    switch (valueType.trim().toLowerCase()) {
                        // link
                        case 'l':
                            newAttribute.value.push({
                                type: 'link',
                                data: valueCleaned
                            });
                            break;
                        // rich text
                        case 'r':
                            // decode escaped html
                            newAttribute.value.push({
                                type: 'rich',
                                data: valueCleaned,
                                plain: turndown().turndown(valueCleaned)
                            });
                            break;
                        // string
                        case 's':
                        default:
                            newAttribute.value.push({
                                type: 'string',
                                data: valueCleaned
                            });
                            break;
                    }
                });
    
                // add attribute
                newPage.data.attributes.push(newAttribute);
              });
    
            // add entry
            if (!collections.hasOwnProperty(collectionId)) collections[collectionId] = [];
            collections[collectionId].push(newPage);

            // add link details zu map
            idToFilenameIndex[newPage.data.id] = {
                title: newPage.data.name,
                url: collectionId + '/' + newPage.filename
            };
        });
    }

    // callback function via options. the callback retrieves the collections as an array, modifies and returns them
    if (_options.hasOwnProperty('collectionHook') && typeof _options.collectionHook == 'function') {
        collections = _options.collectionHook(collections);
    }
    
    // resolve and prettify internal links, replace IDs with names
    // condition: relink == true
    if (_options.hasOwnProperty('relink') && _options.relink == true) {
        for (var collectionId in collections) {
            for (var i = 0; i < collections[collectionId].length; i++) {
                // prettify links in content
                collections[collectionId][i].content = collections[collectionId][i].content.replace(
                    /href=\"\/pages\/([a-z0-9]+)\/[\w-]+\"/gim,
                    function(match, p1) {
                        return idToFilenameIndex.hasOwnProperty(p1)
                            ? `href="/${idToFilenameIndex[p1].url}.html"`
                            : "";
                    }
                );

                // prettify links in attributes
                for (var ii = 0; ii < collections[collectionId][i].data.attributes.length; ii++) {
                    for (var iii = 0; iii < collections[collectionId][i].data.attributes[ii].value.length; iii++) {
                        if (collections[collectionId][i].data.attributes[ii].value[iii].type == 'link') {
                            match = collections[collectionId][i].data.attributes[ii].value[iii].data.match(/page\/([a-z0-9]+)/i);
                            if (match) {
                                if (idToFilenameIndex.hasOwnProperty(match[1])) {
                                    collections[collectionId][i].data.attributes[ii].value[iii] = {
                                        type: 'link',
                                        data: collections[collectionId][i].data.attributes[ii].value[iii].data,
                                        id: match[1],
                                        title: idToFilenameIndex[match[1]].title,
                                        url: idToFilenameIndex[match[1]].url
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // store collections
    for (var collectionId in collections) {
        let collectionPath = destination + '_' + collectionId;
        if (!fs.existsSync(collectionPath)) cplace.createPath(collectionPath);
        collections[collectionId].forEach(page => {
            cplace.saveToMarkdown(collectionPath + '/' + page.filename, page.content, page.data)
        })
     }
            
    // idToFilenameIndex
    cplace.saveToYAML(dataPath + 'idToFilenameIndex', idToFilenameIndex);

    // todo: refactor code to a function, that creates a new collection
    // todo: refactor code to a function, that increases the collection count and maps the collection name to the collection directory name
}