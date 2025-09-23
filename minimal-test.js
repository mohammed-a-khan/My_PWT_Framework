console.log('1. Starting minimal test...');

// Try to load just the configuration manager
try {
    console.log('2. Loading ts-node/register...');
    require('ts-node/register');
    
    console.log('3. Loading CSConfigurationManager...');
    const { CSConfigurationManager } = require('./src/core/CSConfigurationManager');
    
    console.log('4. Getting instance...');
    const config = CSConfigurationManager.getInstance();
    
    console.log('5. Config instance obtained');
    
    console.log('6. Initializing config...');
    config.initialize({ project: 'orangehrm' }).then(() => {
        console.log('7. Config initialized successfully');
        process.exit(0);
    }).catch(error => {
        console.error('Error during initialization:', error);
        process.exit(1);
    });
    
    console.log('8. Waiting for initialization...');
} catch (error) {
    console.error('Error loading modules:', error);
    process.exit(1);
}