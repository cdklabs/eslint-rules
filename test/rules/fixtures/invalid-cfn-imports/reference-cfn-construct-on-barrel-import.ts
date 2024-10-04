import * as glue from '../lib';
import * as firehose from '@aws-cdk/aws-kinesisfirehose-alpha';

let x: firehose.CfnDeliveryStream.CloudWatchLoggingOptionsProperty;
let y: glue.CfnTable;