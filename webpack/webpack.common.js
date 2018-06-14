const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './pearl-src/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../dist'),
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        LOBBY_SERVER: JSON.stringify(
          process.env.LOBBY_SERVER || 'localhost:3000'
        ),
      },
    }),
  ],
};
