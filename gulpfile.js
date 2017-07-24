'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('rollup-plugin-babel');
const del = require('del');
const newer = require('gulp-newer');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync');
const gulpIf = require('gulp-if');
const uglify = require('gulp-uglify');
const notify = require('gulp-notify');
const rollup = require('gulp-better-rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const cleanCSS = require('gulp-clean-css');
const base64 = require('gulp-base64');

const path = require('path');
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';


gulp.task('styles', function () {
    return gulp.src('frontend/styles/style.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .on('error', notify.onError())
        .pipe(gulpIf(!isDevelopment, cleanCSS()))
        .pipe(sourcemaps.write(isDevelopment ? null : '.'))
        .pipe(gulp.dest(isDevelopment ? 'public/static/css' : 'build/static/css'));
});

gulp.task('scripts', function () {
    return gulp.src('frontend/js/index.js', {base: 'frontend'})
        .pipe(sourcemaps.init())
        .pipe(rollup({
            plugins: [
                nodeResolve(),
                babel({
                    exclude: 'node_modules/**',
                    runtimeHelpers: true,
                })
            ]
        }, {
            format: 'es',
        }))
        .on('error', notify.onError())
        .pipe(gulpIf(!isDevelopment, uglify()))
        .pipe(sourcemaps.write(isDevelopment ? null : '.'))
        .pipe(gulp.dest(isDevelopment ? 'public/static' : 'build/static'))
});

gulp.task('assets', function () {
    return gulp.src('frontend/assets/**', {since: gulp.lastRun('assets')})
        .pipe(newer('public'))
        .pipe(gulp.dest(isDevelopment ? 'public/static' : 'build/static'));
});

gulp.task('media', function () {
    return gulp.src('frontend/media/**', {since: gulp.lastRun('media')})
        .pipe(newer('public'))
        .pipe(gulp.dest(isDevelopment ? 'public/media' : 'build/media'));
});

gulp.task('html', function () {
    return gulp.src('frontend/html/**', {since: gulp.lastRun('html')})
        .pipe(newer('public'))
        .pipe(gulp.dest(isDevelopment ? 'public' : 'build'));
});

gulp.task('clean', function () {
    return del('public');
});

gulp.task('build',
    gulp.series(
        'clean',
        gulp.parallel(
            'styles',
            'scripts',
            'assets',
            'media',
            'html'
        )
    )
);

gulp.task('watch', function () {
    gulp.watch('frontend/styles/**/*.*', gulp.series('styles'));
    gulp.watch('frontend/js/**/*.*', gulp.series('scripts'));
    gulp.watch('frontend/assets/**/*.*', gulp.series('assets'));
    gulp.watch('frontend/media/**/*.*', gulp.series('media'));
    gulp.watch('frontend/html/**/*.*', gulp.series('html'));
});

gulp.task('server', function () {
    browserSync.init({
        server: 'public'
    });

    browserSync.watch('public/**/*.*').on('change', browserSync.reload);
});

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'server')));

gulp.task('prod', gulp.series('build'));
