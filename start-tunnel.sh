#!/bin/bash

if [ -z "$EVILTON_PEM" ]; then
  echo "Set the EVILTON_PEM environment variable to the path of your key file."
  exit 1
fi

STACK_NAME=$(cdk ls)

RDS_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" --output text)
BASTION_HOST_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='BastionHostPublicIp'].OutputValue" --output text)

echo "RDS_ENDPOINT: $RDS_ENDPOINT"
echo "BASTION_HOST_IP: $BASTION_HOST_IP"

echo "Establishing tunnel to RDS..."
ssh -i "$EVILTON_PEM" -N -L 5433:"$RDS_ENDPOINT":5432 -p 22 ec2-user@"$BASTION_HOST_IP"