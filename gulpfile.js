var gulp = require('gulp'),
$ = require('gulp-load-plugins')();

var runSequence = require('run-sequence');

gulp.task('css', function() {
    return gulp.src('./client/styles/main.scss')
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.cleanCss())
    .pipe(gulp.dest('./dist'));
});

gulp.task('css:watch', function() {
  gulp.watch('./client/styles/*.scss', ['css']);
});

gulp.task('service-worker', function(callback) {
    var swPrecache = require('sw-precache');

    swPrecache.write('./dist/service-worker.js', {
        staticFileGlobs: [
            'dist/*.js',
            'dist/*.css',
            'dist/*.html'
        ],
        runtimeCaching: [
            {
                urlPattern: /fonts\.googleapis\.com\//,
                handler: 'fastest'
            },
            {
                urlPattern: /fonts\.gstatic\.com\//,
                handler: 'fastest'
            }
        ],
        navigateFallback: 'dist/index.html',
        verbose: true
    }, callback);
});
