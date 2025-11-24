const { getDefaultConfig } = require('@expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..', '..')

const config = getDefaultConfig(projectRoot)

// Ensure Metro resolves modules from the app and the workspace root when needed.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = config
