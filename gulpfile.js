/* eslint-env node */

const autoprefix = require('autoprefixer')
const del = require('del')
const { src, dest, lastRun, series, parallel } = require('gulp')
const cleanCss = require('gulp-clean-css')
const eslint = require('gulp-eslint-new')
const gulpIf = require('gulp-if')
const postcss = require('gulp-postcss')
const rename = require('gulp-rename')
const sass = require('gulp-sass')(require('sass'))
const gulpStylelint = require('gulp-stylelint')
const terser = require('gulp-terser')
const rollup = require('rollup')
const rollupTypescript = require('@rollup/plugin-typescript')
const rtlcss = require('rtlcss')

const pkg = require('./package')
const year = new Date().getFullYear()
const banner = `/*!
 * AdminLTE v${pkg.version} (${pkg.homepage})
 * Copyright 2014-${year} ${pkg.author}
 * Licensed under MIT (https://github.com/TechnoBureau/AdminLTE/blob/master/LICENSE)
 */`

// Define paths

const paths = {
  dist: {
    base: './dist/',
    css: './dist/css',
    js: './dist/js',
   // html: './dist/pages',
    assets: './dist/assets'
  },
  src: {
    base: './src/',
   // html: './src/pages/**/*.html',
    assets: './src/assets/**/*.*',
  //  partials: './src/partials/**/*.html',
    scss: './src/scss',
    ts: './src/ts'
  },
  temp: {
    base: './.temp/',
    css: './.temp/css',
    js: './.temp/js',
    //html: './.temp/pages',
    assets: './.temp/assets'
  }
}

const sassOptions = {
  outputStyle: 'expanded',
  includePaths: ['./node_modules/']
}

const postcssOptions = [
  autoprefix({ cascade: false })
]

const postcssRtlOptions = [
  autoprefix({ cascade: false }),
  rtlcss({})
]

// From here Dev mode will Start

// Lint SCSS
const lintScss = () => src([paths.src.scss + '/**/*.scss'], { since: lastRun(lintScss) })
    .pipe(gulpStylelint({
      failAfterError: false,
      reporters: [
        { formatter: 'string', console: true }
      ]
    }))

// Lint TS
function isFixed(file) {
  // Has ESLint fixed the file contents?
  return file.eslint !== null && file.eslint.fixed
}

const lintTs = () => src([paths.src.ts + '/**/*.ts'], { since: lastRun(lintTs) })
    .pipe(eslint({ fix: true }))
    .pipe(eslint.format())
    .pipe(gulpIf(isFixed, dest(paths.src.ts)))
    .pipe(eslint.failAfterError())


// From here Dist will Start

// Clean
const cleanDist = () => del([paths.dist.base])

const lintDistScss = () => src([paths.src.scss + '/**/*.scss'])
    .pipe(gulpStylelint({
      failAfterError: false,
      reporters: [
        { formatter: 'string', console: true }
      ]
    }))

// Compile and copy all scss/css
const copyDistCssAll = () => src([paths.src.scss + '/**/*.scss'], {
  base: paths.src.scss,
  sourcemaps: false
})
    .pipe(sass(sassOptions).on('error', sass.logError))
    .pipe(postcss(postcssOptions))
    .pipe(dest(paths.dist.css, { sourcemaps: '.' }))

const copyDistCssRtl = () => src(paths.dist.css + '/*.css', { sourcemaps: false })
    .pipe(postcss(postcssRtlOptions))
    .pipe(rename({ suffix: '.rtl' }))
    .pipe(dest(paths.dist.css + '/rtl', { sourcemaps: '.' }))

// Minify CSS
const minifyDistCss = () => src([
  paths.dist.css + '/**/*.css'
], {
  base: paths.dist.css,
  sourcemaps: false
})
    .pipe(cleanCss({ format: { breakWith: 'lf' } }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.dist.css, { sourcemaps: '.' }))

const lintDistTs = () => src([paths.src.ts + '/**/*.ts'])
    .pipe(eslint())
    .pipe(eslint.failAfterError())

// Compile and copy ts/js
const copyDistJs = () =>
  rollup.rollup({
    input: paths.src.ts + '/adminlte.ts',
    output: {
      banner
    },
    plugins: [
      rollupTypescript()
    ]
  }).then(bundle => bundle.write({
    file: paths.dist.js + '/tb-admin-lte.js',
    format: 'umd',
    name: 'tb-admin-lte',
    sourcemap: false
  }))

// Minify JS
const minifyDistJs = () => src(paths.dist.js + '/tb-admin-lte.js', { sourcemaps: false })
    .pipe(terser({ compress: { passes: 2 } }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.dist.js, { sourcemaps: '.' }))

// Copy assets
const copyDistAssets = () => src(paths.src.assets)
    .pipe(dest(paths.dist.assets))




const lint = parallel(
  lintDistScss,
  lintDistTs,
)
exports.lint = lint

const compile = series(
  cleanDist,
  parallel(
    series(copyDistCssAll, copyDistCssRtl, minifyDistCss),
    series(copyDistJs, minifyDistJs),
    copyDistAssets
  )
)
exports.compile = compile

// For Production Release
exports.production = series(lint, compile)
exports.default = series(lint, compile)

