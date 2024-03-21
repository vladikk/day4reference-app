const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secretsManagerClient = new SecretsManagerClient();

exports.handler = async () => {
    try {
        const dbPassword = await getDBPassword();
        console.log('Hello, world!');
        // console.log(dbPassword);
    } catch (error) {
        console.error('Error in Lambda handler:', error);
    }
};

async function getDBPassword() {
    const secretArn = process.env.DB_SECRET_ARN;

    try {
        const command = new GetSecretValueCommand({
            SecretId: secretArn,
        });

        const response = await secretsManagerClient.send(command);
        const secretString = response.SecretString;

        if (secretString) {
            const secret = JSON.parse(secretString);
            return secret.password;
        } else {
            throw new Error('Secret value not found');
        }
    } catch (error) {
        console.error('Error retrieving database password:', error);
        throw error;
    }
}