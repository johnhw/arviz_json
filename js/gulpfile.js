var gulp = require('gulp');
var concat = require('gulp-concat');
 
// package all files for loading arviz data 
// into a single json file
gulp.task('pack-js', function () {    
    return gulp.src( [
    "./zip/zip.js",
    "./zip/zip-ext.js",
    "./zip/inflate.js",        
    "./npy.js",
    "./npz.js",
    "./arviz.js",    
    "./arviz_tf.js",    
  ])
        .pipe(concat('arviz_json.js'))
        .pipe(gulp.dest('dist/'));
});
 
gulp.task('default', gulp.series(['pack-js']));