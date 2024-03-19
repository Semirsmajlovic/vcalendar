const path = require('path');

module.exports = {
  // Use a function for publicPath to include error handling
  publicPath: (() => {
    try {
      const envPath = process.env.NODE_ENV === 'production' ? '/' : '/';
      return envPath;
    } catch (error) {
      console.error(`Error setting publicPath: ${error}`);
      return '/';
    }
  })(),

  transpileDependencies: [
    'vuetify'
  ],

  // Example of adding more configurations for clean architecture
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/'),
      }
    }
  },

  // Plugin options can go here
  pluginOptions: {},

  // Example of how to modify webpack-dev-server settings
  devServer: {
    port: 8080,
    open: true,
    overlay: {
      warnings: true,
      errors: true
    }
  }
};

// Logging the final configuration for debugging purposes
console.log('vue.config.js is configured successfully.');