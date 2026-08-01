// The newer autolinking tooling (RN 0.81's Gradle plugin) can't infer the
// Android package name automatically here, since AndroidManifest.xml has no
// package="..." attribute - this project declares it via build.gradle's
// namespace instead (the modern AGP 7+ approach), which the older detection
// logic doesn't look at.
module.exports = {
  project: {
    android: {
      packageName: 'com.ghanatalksradio',
    },
  },
};
