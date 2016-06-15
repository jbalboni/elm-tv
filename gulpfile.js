var gulp = require('gulp'),
  $ = require('gulp-load-plugins')();

var runSequence = require('run-sequence');

gulp.task('css', function() {
  return gulp.src('./client/styles.scss')
           .pipe($.sass().on('error', $.sass.logError))
           .pipe($.cleanCss())
           .pipe(gulp.dest('./dist'));
})

gulp.task('css:watch', function() {
  gulp.watch('client/styles.scss', ['css']);
});
