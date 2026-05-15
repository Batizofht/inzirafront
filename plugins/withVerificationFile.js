const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // This identifies the native android assets folder during the EAS build process
      const assetsPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');
      
      // Ensure the directory exists
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }

      // Copy the file from your root to the native assets folder
      const srcFile = path.join(config.modRequest.projectRoot, 'adi-registration.properties');
      const destFile = path.join(assetsPath, 'adi-registration.properties');

      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
      }
      return config;
    },
  ]);
};