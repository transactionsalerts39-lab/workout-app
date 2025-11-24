const path = require('path')
const { getDefaultConfig } = require('@expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..', '..')

const config = getDefaultConfig(projectRoot)

// Allow importing workspace packages while forcing RN/React to resolve from the app.
config.watchFolders = [workspaceRoot]
config.resolver.disableHierarchicalLookup = true
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
}

module.exports = config
