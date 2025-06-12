import AWS from 'aws-sdk/dist/aws-sdk-react-native';

AWS.config.update({ region: 'us-east-1' });

export const analyzeSkinCondition = async (base64Image) => {
  const rekognition = new AWS.Rekognition();
  const params = {
    Image: { Bytes: Buffer.from(base64Image, 'base64') },
    MaxLabels: 5,
    MinConfidence: 70,
  };

  const response = await rekognition.detectLabels(params).promise();
  return response.Labels.map((label) => label.Name);
};

