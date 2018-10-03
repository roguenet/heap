/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const prod = process.env.NODE_ENV === 'production';
const mode = prod ? 'production' : 'development';

module.exports = {
  mode,
  entry: './src/js/index.js',

  module: {
    rules: [{ test: /.js$/, exclude: /node_modules/, use: 'babel-loader', }]
  },

  resolve: {
    extensions: ['.js']
  },

  plugins: [
    new CleanWebpackPlugin(['dist']),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: `"${process.env.NODE_ENV || 'development'}"`,
      }
    }),
  ],

  externals: {
    'styled-components': {
      commonjs: 'styled-components',
      commonjs2: 'styled-components',
      amd: 'styled-components',
    }
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'heap.js',
    library: 'heap',
    libraryTarget: 'umd',
  },
};
