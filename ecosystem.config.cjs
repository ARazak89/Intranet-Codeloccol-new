module.exports = {
  apps: [
    {
      name: 'backend',
      script: './backend/server.js',
      watch: false, // Désactiver le watch en production pour éviter les redémarrages inutiles
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'run build && npm start', // Exécuter d'abord build, puis start
      cwd: './frontend',
      watch: false, // Désactiver le watch en production
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
