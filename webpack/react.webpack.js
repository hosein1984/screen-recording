const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const rootPath = path.resolve(__dirname, '..');

const IGNORES = ['fluent-ffmpeg'];

module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    mainFields: ['main', 'module', 'browser'],
  },
  entry: path.resolve(rootPath, 'src', 'App.tsx'),
  target: 'electron-renderer',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  devServer: {
    contentBase: path.join(rootPath, 'dist/renderer'),
    historyApiFallback: true,
    compress: true,
    hot: true,
    host: '0.0.0.0',
    port: 4000,
    publicPath: '/',
  },
  output: {
    path: path.resolve(rootPath, 'dist/renderer'),
    filename: 'js/[name].js',
    publicPath: './',
  },
  plugins: [
    new HtmlWebpackPlugin(),

    // Note: fluent-ffmpeg has a problem while it is being loaded by webpack.
    // You can read more about that here: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573#issuecomment-305408048
    // This just sets a global variable to circumvent that issue
    new webpack.DefinePlugin({
      'process.env.FLUENTFFMPEG_COV': false,
    }),
  ],
  externals: [
    // Note: This is used to prevent a warning from fluent-ffmpeg dependency. Please see
    // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/862 for more info.
    function (context, request, callback) {
      if (IGNORES.includes(request)) {
        return callback(null, `require('${request}')`);
      }
      return callback();
    },
  ],
};
