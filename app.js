const { App, AwsLambdaReceiver } = require("@slack/bolt");
const dotenv = require("dotenv");

dotenv.config();

const { doc } = require('./google');

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
  // The `processBeforeResponse` option is required for all FaaS environments.
  // It allows Bolt methods (e.g. `app.message`) to handle a Slack request
  // before the Bolt framework responds to the request (e.g. `ack()`). This is
  // important because FaaS immediately terminate handlers after the response.
  processBeforeResponse: true,
});

app.command('/start', async ({ ack, say }) => {
  await ack();
  await say({
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "👩‍💻 *You are starting a new coding session*"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Who are you coding with today?"
        },
        "accessory": {
          "type": "users_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select a user",
            "emoji": true
          },
          "action_id": "coding_student"
        }
      },
    ]
  });
});

app.action('coding_student', async ({ respond, ack, client, body, action }) => {
  // Acknowledge the action
  await ack();
  await doc.loadInfo();
  const now = new Date();
  const title = now.toLocaleDateString('en-US', {
    month: 'long'
  });
  let sheet;
  try {
    sheet = await doc.addSheet({ title, headerValues: ['Instructor', 'Student', 'Date Recorded'] })
  } catch {
    sheet = await doc.sheetsByTitle[title]
  }
  const user = await client.users.info({
    user: body.user.id,
    include_locale: true
  })
  const selected_user = await client.users.info({
    user: action.selected_user,
    include_locale: true
  })
  if (!user.ok || !selected_user.ok) {
    throw Error("User isn't okay.");
  }
  await sheet.addRow({ 'Instructor': user.user.real_name, 'Student': selected_user.user.real_name, 'Date Recorded': now.toLocaleDateString() })
  await respond({
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*🎉 Session Completed!*",
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Date recorded* ${now.toLocaleDateString('en-US')} in *${doc.title}*`
        }
      },
    ]
  });
});


module.exports.handler = async (event, context, callback) => {
  const handler = await app.start();
  return handler(event, context, callback);
};
