const dotenv = require("dotenv")
const path = require("path")
const webpack = require("webpack")
const TerserPlugin = require("terser-webpack-plugin")
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin")
const postCSSSafeParser = require("postcss-safe-parser")
const MiniCSSExtractPlugin = require("mini-css-extract-plugin")
const PostCSSFlexBugsFixes = require("postcss-flexbugs-fixes")
const PostCSSPresetEnv = require("postcss-preset-env")
const postCSSNormalize = require("postcss-normalize")
const HTMLWebpackPlugin = require("html-webpack-plugin")
const InterpolateHtmlPlugin = require("interpolate-html-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const ESLintWebpackPlugin = require("eslint-webpack-plugin")

const BABEL_CONFIG_FILE = path.resolve(__dirname, "./babel.config.json")
const SOURCE_ROOT = path.resolve(__dirname, "../src")
const HTML_TEMPLATE_FILE = path.resolve(__dirname, "../public/index.html")
const ENTRY_FILE = `${SOURCE_ROOT}/index.tsx`
const OUT_DIR = path.resolve(__dirname, "../build")
const ENV_DIR_PATH = path.resolve(__dirname, "../../../env")
const PUBLIC_URL = ""
const INLINE_IMAGE_SIZE_LIMIT = 10000

module.exports = function configFactory(env) {
  const isProduction = env.profile === "production"
  dotenv.config({ path: `${ENV_DIR_PATH}/.env.${env.profile}` })

  return {
    mode: env.profile,
    devtool: isProduction ? false : "eval-source-map",
    entry: ENTRY_FILE,
    output: {
      path: OUT_DIR,
      filename: isProduction ? "static/js/[name].[contenthash:8].js" : "static/js/[name].bundle.js",
      chunkFilename: isProduction
        ? "static/js/[name].chunk.js"
        : "static/js/[name].[contenthash:8].chunk.js",
      assetModuleFilename: "static/media/[name].[hash:8].[ext]",
      publicPath: PUBLIC_URL
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx", ".jpg", ".jpeg", ".png", ".svg", ".json"]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            parse: { ecma: 8 },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2
            },
            mangle: { safari10: true },
            keep_classnames: !isProduction,
            keep_fnames: !isProduction,
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true
            }
          }
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: postCSSSafeParser,
            map: isProduction ? false : { inline: false, annotation: true }
          },
          cssProcessorPluginOptions: {
            preset: ["default", { minifyFontValues: { removeQuotes: false } }]
          }
        })
      ],
      splitChunks: {
        chunks: "all",
        name: false
      },
      runtimeChunk: {
        name: (entry) => `runtime-${entry.name}`
      }
    },
    module: {
      strictExportPresence: true,
      rules: [
        {
          oneOf: [
            {
              test: /\.(gif|jpe?g|png)$/,
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: INLINE_IMAGE_SIZE_LIMIT
                }
              }
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: "@svgr/webpack",
                  options: {
                    prettier: false,
                    svgo: false,
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }]
                    },
                    titleProp: true,
                    ref: true
                  }
                }
              ],
              issuer: /\.(ts|tsx|js|jsx|md|mdx)$/
            },
            {
              test: /\.(js|jsx|ts|tsx)$/,
              include: [SOURCE_ROOT, /node_modules\/(axios)/],
              loader: "babel-loader",
              options: {
                configFile: BABEL_CONFIG_FILE,
                cacheDirectory: true,
                cacheCompression: false,
                compact: isProduction
              }
            },
            {
              test: /\.css$/,
              exclude: /\.module\.css$/,
              use: [
                isProduction
                  ? {
                      loader: MiniCSSExtractPlugin.loader
                    }
                  : "style-loader",
                {
                  loader: "css-loader",
                  options: { sourceMap: !isProduction }
                },
                {
                  loader: "postcss-loader",
                  options: {
                    ident: "postcss",
                    plugins: [PostCSSFlexBugsFixes, PostCSSPresetEnv, postCSSNormalize()],
                    sourceMap: !isProduction
                  }
                }
              ]
            },
            {
              type: "asset/resource",
              exclude: /\.(js|jsx|mjs|ts|tsx|html|json)$/
            }
          ]
        }
      ]
    },
    plugins: [
      new HTMLWebpackPlugin({ template: HTML_TEMPLATE_FILE }),
      new InterpolateHtmlPlugin({ PUBLIC_URL }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "public",
            filter: (path) => !path.includes("index.html")
          }
        ]
      }),
      new webpack.DefinePlugin({
        "process.env": Object.keys(process.env)
          .filter((key) => key.includes("PUBLIC"))
          .reduce((acc, key) => {
            acc[key] = JSON.stringify(process.env[key])
            return acc
          }, {})
      }),
      isProduction &&
        new MiniCSSExtractPlugin({
          filename: "static/css/[name].[contenthash:8].css",
          chunkFilename: "static/css/[name].[contenthash:8].chunk.css"
        }),
      new ForkTsCheckerWebpackPlugin({ async: !isProduction }),
      new ESLintWebpackPlugin({
        extensions: ["js", "mjs", "jsx", "ts", "tsx"],
        eslintPath: require.resolve("eslint"),
        context: SOURCE_ROOT,
        failOnError: true
      })
    ].filter(Boolean)
  }
}
