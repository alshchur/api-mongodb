module.exports.getModelSchema = function () {
  return {
    fieldName: {
      'type': 'String',
      'label': 'Title',
      'comments': 'The title of the entry',
      'placement': 'Main content',
      'validation': {},
      'required': false,
      'message': '',
      'display': {
        'index': true,
        'edit': true
      }
    }
  }
}

module.exports.getExtendedModelSchema = function () {
  return {
    field1: {
      'type': 'String',
      'label': 'field1',
      'comments': '',
      'validation': {},
      'required': false,
      'message': ''
    },
    field2: {
      'type': 'Number',
      'label': 'field2',
      'comments': '',
      'validation': {},
      'required': false,
      'message': ''
    }
  }
}

/**
 * Return the template for the "words" collection schema, used to create the database collection
 * @return {Object} - the collection schema for the "words" collection
 */
module.exports.getWordSchema = function () {
  return {
    fields: {
      word: {
        type: 'String',
        required: true
      }
    },
    settings: {
      cache: true,
      index: [{
        keys: { word: 1 },
        options: { unique: true }
      }]
    }
  }
}

/**
 * Return the template for the current collection's "search" collection schema, used to create the database collection
 * @return {Object} - the collection schema for the "search" collection
 */
module.exports.getSearchSchema = function () {
  return {
    fields: {
      word: {
        type: 'String',
        required: true
      },
      document: {
        type: 'String',
        required: true
      },
      weight: {
        type: 'Number',
        required: true
      }
    },
    settings: {
      cache: true,
      index: [
        {
          keys: { word: 1 }
        },
        {
          keys: { document: 1 }
        },
        {
          keys: { weight: 1 }
        }
      ]
    }
  }
}
