const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withAsyncStorageMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const repoLine =
      "maven { url = uri(project(':react-native-async-storage_async-storage').file('local_repo')) }";

    if (config.modResults.contents.includes("react-native-async-storage_async-storage').file('local_repo'")) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      (match) => `${match}\n        ${repoLine}`
    );

    return config;
  });
};