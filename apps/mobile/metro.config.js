const path = require('path')
const { getDefaultConfig } = require('@expo/metro-config')

const projectRoot = __dirname

const config = getDefaultConfig(projectRoot)

// Force React/React Native to resolve from the app to avoid workspace version clashes.
config.resolver.disableHierarchicalLookup = true
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
}

module.exports = config
