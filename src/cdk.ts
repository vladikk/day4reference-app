import cdk = require('aws-cdk-lib');
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as targets from'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';

export class TsReferenceStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // Create a new VPC
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // SQS Queue for incoming messages (subscribed to SNS topics)
    const incomingMessagesQueue = new sqs.Queue(this, 'IncomingMessages', {
      queueName: `support-cases-incoming-messages-${this.stackName}`,
      visibilityTimeout: cdk.Duration.seconds(120),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
    });

    // SNS Topic for publishing outgoing messages
    const outgoingMessagesTopic = new sns.Topic(this, 'OutgoingMessages', {
      topicName: `support-cases-outgoing-messages-${this.stackName}`
    });

    // Create an RDS PostgreSQL instance
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      description: 'Security group for RDS database instance',
    });

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16,
    });

    const parameterGroup = new rds.ParameterGroup(
      this,
      "parameter-group",
      {
        engine,
        parameters: {
          "rds.force_ssl": "0",
        },
      }
    );

    const operationalDb = new rds.DatabaseInstance(this, 'OperationalDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      parameterGroup: parameterGroup,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      allocatedStorage: 20,
      maxAllocatedStorage: 25,
      storageType: rds.StorageType.GP2,
      databaseName: 'supportCasesDB',
      credentials: rds.Credentials.fromGeneratedSecret('appuser'), // generate a random password for 'appuser'
      backupRetention: cdk.Duration.days(1),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      securityGroups: [dbSecurityGroup],
      deletionProtection: false // not recommended in production environments
    });

    const dbSecret = operationalDb.secret;

    const rdsProxy = operationalDb.addProxy(`rdsProxy-${this.stackName}`, {
      secrets: [dbSecret!],
      debugLogging: true,
      vpc,
      securityGroups: [dbSecurityGroup],
      requireTLS: false
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    const helloWorldLambda = new lambda.Function(this, 'HelloWorld', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('dist-lambda'),
      handler: 'bundle.testHandler',
      timeout: cdk.Duration.seconds(300),
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      allowPublicSubnet: false,
      environment: {
        INCOMING_MESSAGES_QUEUE_ARN: incomingMessagesQueue.queueArn,
        OUTGOING_MESSAGES_TOPIC_ARN: outgoingMessagesTopic.topicArn,
        DB_HOST: operationalDb.dbInstanceEndpointAddress,
        DB_PORT: operationalDb.dbInstanceEndpointPort,
        DB_USER: 'appuser',
        DB_SECRET_ARN: operationalDb.secret?.secretArn || '',
        RDS_PROXY_ENDPOINT: rdsProxy.endpoint
      },
    });

    const outboxLambda = new lambda.Function(this, 'OutboxPublishingLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('dist-lambda'),
      handler: 'bundle.publishOutboxEventsHandler',
      timeout: cdk.Duration.seconds(300),
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      allowPublicSubnet: false,
      environment: {
        INCOMING_MESSAGES_QUEUE_ARN: incomingMessagesQueue.queueArn,
        OUTGOING_MESSAGES_TOPIC_ARN: outgoingMessagesTopic.topicArn,
        DB_HOST: operationalDb.dbInstanceEndpointAddress,
        DB_PORT: operationalDb.dbInstanceEndpointPort,
        DB_NAME: 'supportCasesDB',
        DB_USER: 'appuser',
        DB_SECRET_ARN: operationalDb.secret?.secretArn || '',
        RDS_PROXY_ENDPOINT: rdsProxy.endpoint
      },
      securityGroups: [lambdaSecurityGroup]
    });

    const everyMinute = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(1 minute)')
    });

    everyMinute.addTarget(new targets.LambdaFunction(outboxLambda));

    const supportCasesApiLambda = new lambda.Function(this, 'SupportCasesApiLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('dist-lambda'),
      handler: 'bundle.supportCaseApiHandler',
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      allowPublicSubnet: false,
      environment: {
        INCOMING_MESSAGES_QUEUE_ARN: incomingMessagesQueue.queueArn,
        OUTGOING_MESSAGES_TOPIC_ARN: outgoingMessagesTopic.topicArn,
        DB_HOST: operationalDb.dbInstanceEndpointAddress,
        DB_PORT: operationalDb.dbInstanceEndpointPort,
        DB_NAME: 'supportCasesDB',
        DB_USER: 'appuser',
        DB_SECRET_ARN: operationalDb.secret?.secretArn || '',
        RDS_PROXY_ENDPOINT: rdsProxy.endpoint
      },
      securityGroups: [lambdaSecurityGroup],
    });

    const inboxLambda = new lambda.Function(this, 'InboxProcessingLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('dist-lambda'),
      handler: 'bundle.processIncomingMessages',
      timeout: cdk.Duration.seconds(300),
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      allowPublicSubnet: false,
      environment: {
        INCOMING_MESSAGES_QUEUE_ARN: incomingMessagesQueue.queueArn,
        OUTGOING_MESSAGES_TOPIC_ARN: outgoingMessagesTopic.topicArn,
        DB_HOST: operationalDb.dbInstanceEndpointAddress,
        DB_PORT: operationalDb.dbInstanceEndpointPort,
        DB_NAME: 'supportCasesDB',
        DB_USER: 'appuser',
        DB_SECRET_ARN: operationalDb.secret?.secretArn || '',
        RDS_PROXY_ENDPOINT: rdsProxy.endpoint
      },
      securityGroups: [lambdaSecurityGroup]
    });

    supportCasesApiLambda.connections.addSecurityGroup(lambdaSecurityGroup);
    outboxLambda.connections.addSecurityGroup(lambdaSecurityGroup);
    inboxLambda.connections.addSecurityGroup(lambdaSecurityGroup);

    const snsEndpoint = vpc.addInterfaceEndpoint('SnsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SNS,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
    });
    
    const sqsEndpoint = vpc.addInterfaceEndpoint('SqsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SQS,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
    });

    snsEndpoint.connections.allowDefaultPortFrom(lambdaSecurityGroup);
    sqsEndpoint.connections.allowDefaultPortFrom(lambdaSecurityGroup);

    const httpApi = new apigateway.RestApi(this, 'SupportCasesApi', {
      restApiName: 'Support Cases API',
      deployOptions: {
        stageName: 'prod',
      }
    });
    
    const rootResource = httpApi.root.addResource('wolfdesk');
    const supportCasesResource = rootResource.addResource('cases');
    
    supportCasesResource.addMethod('POST', new apigateway.LambdaIntegration(supportCasesApiLambda));

    dbSecret?.grantRead(supportCasesApiLambda);
    dbSecret?.grantRead(outboxLambda);
    dbSecret?.grantRead(inboxLambda);

    // Bastion Host
    const keyPair = ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'evilton-dev');

    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    ec2SecurityGroup.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'), // FOR USE IN THE WORKSHOP ONLY
      ec2.Port.tcp(22),
      'Allow SSH access from your local computer'
    );

    operationalDb.connections.allowFrom(ec2SecurityGroup, ec2.Port.tcp(5432));
    operationalDb.connections.allowDefaultPortFrom(lambdaSecurityGroup);

    const bastionHost = new ec2.Instance(this, 'VpcBastionHost', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: ec2SecurityGroup,
      keyPair: keyPair,
    });

    new cdk.CfnOutput(this, 'BastionHostPublicIp', {
      value: bastionHost.instancePublicIp,
    });

    new cdk.CfnOutput(this, 'IncomingMessagesQueueArn', {
      value: incomingMessagesQueue.queueArn,
    });

    new cdk.CfnOutput(this, 'OutgoingMessagesTopicArn', {
      value: outgoingMessagesTopic.topicArn,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: operationalDb.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: operationalDb.dbInstanceEndpointPort,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: operationalDb.secret?.secretArn || '',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url,
      description: 'URL of the Support Cases API',
    });
  }
}

const app = new cdk.App();
new TsReferenceStack(app, 'TSCReferenceStack');
app.synth();
