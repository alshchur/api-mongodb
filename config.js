const convict = require('convict')
const fs = require('fs')

const DATABASE_SCHEMA = {
  authDatabase: {
    doc: 'The database to authenticate against when supplying a username and password',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_AUTH_SOURCE'
  },
  authMechanism: {
    doc: 'If no authentication mechanism is specified or the mechanism DEFAULT is specified, the driver will attempt to authenticate using the SCRAM-SHA-1 authentication method if it is available on the MongoDB server. If the server does not support SCRAM-SHA-1 the driver will authenticate using MONGODB-CR.',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_AUTH_MECHANISM'
  },
  hosts: {
    default: '',
    doc: 'Database hosts',
    format: String,
    envTemplate: 'DB_{database}_HOSTS'
  },
  id: {
    default: '',
    doc: 'Database unique identifier',
    format: String
  },
  maxPoolSize: {
    doc: 'The maximum number of connections in the connection pool',
    format: Number,
    default: 0,
    envTemplate: 'DB_{database}_MAX_POOL'
  },
  password: {
    doc: '',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_PASSWORD'
  },
  readPreference: {
    doc: 'Choose how MongoDB routes read operations to the members of a replica set - see https://docs.mongodb.com/manual/reference/read-preference/',
    format: ['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest'],
    default: 'secondaryPreferred'
  },
  replicaSet: {
    doc: '',
    format: String,
    default: ''
  },
  ssl: {
    doc: '',
    format: Boolean,
    default: false
  },
  username: {
    doc: '',
    format: String,
    default: '',
    envTemplate: 'DB_{database}_USERNAME'
  }
}

const MAIN_SCHEMA = {
  database: {
    default: 'api',
    doc: 'The name of the default database to be used',
    env: 'DB_NAME',
    format: String
  },
  databases: {
    default: [],
    doc: 'Configuration block for each of the databases used throughout the application',
    format: Array
  },
  enableCollectionDatabases: {
    default: false,
    doc: 'Whether to use a database specified in the collection endpoint',
    format: Boolean
  },
  env: {
    arg: 'node_env',
    default: 'development',
    doc: 'The applicaton environment.',
    env: 'NODE_ENV',
    format: ['production', 'development', 'test', 'qa']
  }
}

function transformLegacyDatabaseBlock (name, block) {
  const hosts = block.hosts.map(({host, port}) => {
    return `${host}:${port || 27017}`
  }).join(',')

  let newBlock = {
    id: name
  }

  Object.keys(block).forEach(key => {
    if (block[key] !== undefined && block[key] !== '') {
      newBlock[key] = block[key]
    }
  })

  newBlock.hosts = hosts

  return newBlock
}

let mainConfig = convict(MAIN_SCHEMA)

const loadConfig = () => {
  // Load environment dependent configuration.
  const environment = mainConfig.get('env')
  const filePath = `./config/mongodb.${environment}.json`

  try {
    const configFile = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(configFile)

    // Checking for legacy database blocks, which consist of objects
    // where keys are database names.
    if (data.databases && !Array.isArray(data.databases)) {
      data.databases = Object.keys(data.databases).map(name => {
        return transformLegacyDatabaseBlock(name, data.databases[name])
      })

      const exampleConfig = JSON.stringify({
        databases: data.databases
      }, null, 2)

      console.warn(
        `The current MongoDB configuration uses a \`databases\` object. This syntax has been deprecated and will be removed in a future release. Please update your database configuration to:\n\n${exampleConfig}`
      )
    }

    data.databases = data.databases || []

    const defaultDatabaseBlock = data.databases.find(({id}) => {
      return id === data.database
    })

    // Checking for legacy syntax, where database details for the default
    // database are declared at the root level, instead of inside the
    // `databases` property.
    if (!defaultDatabaseBlock && Array.isArray(data.hosts)) {
      const legacyBlock = {
        authDatabase: data.authDatabase,
        authMechanism: data.authMechanism,
        hosts: data.hosts,
        maxPoolSize: data.maxPoolSize,
        password: data.password,
        readPreference: data.readPreference,
        replicaSet: data.replicaSet,
        ssl: data.ssl,
        username: data.username,
      }
      const newBlock = transformLegacyDatabaseBlock(data.database, legacyBlock)
      
      data.databases.push(newBlock)

      const exampleConfig = JSON.stringify({
        databases: [newBlock]
      }, null, 2)

      console.warn(
        `The current MongoDB configuration uses a \`hosts\` array at the root level. This syntax has been deprecated and will be removed in a future release. Please update your database configuration to:\n\n${exampleConfig}`
      )
    }

    mainConfig.load(data)
    mainConfig.validate()

    // Validating databases.
    const databases = mainConfig.get('databases')
    
    databases.forEach((database, databaseIndex) => {
      const databaseConfig = convict(DATABASE_SCHEMA)
    
      databaseConfig.load(database)
      databaseConfig.validate()
    
      const schema = databaseConfig.getSchema().properties
    
      // Listening for database-specific environment variables.
      // e.g. DB_testdb_USERNAME
      Object.keys(schema).forEach(key => {
        if (typeof schema[key].envTemplate === 'string') {
          const envVar = schema[key].envTemplate.replace(
            '{database}',
            databaseIndex
          )

          if (process.env[envVar]) {
            mainConfig.set(
              `databases[${databaseIndex}].${key}`,
              process.env[envVar]
            )
          }
        }
      })
    })

    return mainConfig
  } catch (error) {
    console.error(error)
  }
}

loadConfig()

module.exports = mainConfig
module.exports.loadConfig = loadConfig
