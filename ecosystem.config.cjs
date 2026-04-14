module.exports = {
  apps: [
    {
      name: "athena-app",
      script: ".next/standalone/server.js",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
    {
      name: "athena-worker",
      script: "dist/worker/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
