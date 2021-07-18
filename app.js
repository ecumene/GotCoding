const { App, AwsLambdaReceiver } = require("@slack/bolt");
const dotenv = require("dotenv");

dotenv.config();

const { doc } = require("./google");

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

app.command("/start", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'new_session',
      title: {
        type: 'plain_text',
        text: 'Record a Session'
      },
      close: {
        type: "plain_text",
        text: "Cancel"
      },
      submit: {
        type: "plain_text",
        text: "Log Session"
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "👩‍💻 You are starting a new coding session",
          },
        },
        {
          type: "input",
          block_id: "section1",
          element: {
            type: "static_select",
            action_id: "sessions_left",
            placeholder: {
              type: "plain_text",
              text: "Select...",
              emoji: true,
            },
            options: [
              "Last Session",
              "1 week",
              "2 weeks",
              "3 weeks",
              "4 weeks",
              "5 weeks",
              "6+ weeks",
            ].map((value) => ({
              text: {
                type: "plain_text",
                text: value,
                emoji: true,
              },
              value,
            })),
          },
          label: {
            type: "plain_text",
            text: "How many sessions are left on this module?",
          },
        },
        {
          type: "input",
          block_id: "section2",
          element: {
            type: "users_select",
            action_id: "coding_student",
            placeholder: {
              type: "plain_text",
              text: "Select ...",
              emoji: true,
            },
          },
          label: {
            type: "plain_text",
            text: "Who are you coding with today?",
          },
        },
      ],
    }
  });
});

const ackStub = ({ ack }) => { ack() }

app.action("coding_student", ackStub);
app.action("sessions_left", ackStub);

app.view("new_session", async ({ ack, client, body, view }) => {
  await ack();
  await doc.loadInfo();

  const { section1, section2 } = view.state.values;
  const { sessions_left: { selected_option: sessionsLeft } } = section1;
  const { coding_student: { selected_user: codingStudent } } = section2;

  const now = new Date();
  const title = now.toLocaleDateString("en-US", {
    month: "long",
  });
  let sheet;
  try {
    sheet = await doc.addSheet({
      title,
      headerValues: ["Instructor", "Student", "Date Recorded", "Module Sessions Left"],
    });
  } catch {
    sheet = await doc.sheetsByTitle[title];
  }
  const user = await client.users.info({
    user: body.user.id,
    include_locale: true,
  });
  const selectedUser = await client.users.info({
    user: codingStudent,
    include_locale: true,
  });
  if (!user.ok || !selectedUser.ok) {
    throw Error("Couldn't grab a user.");
  }
  await sheet.addRow({
    Instructor: user.user.real_name,
    Student: selectedUser.user.real_name,
    "Date Recorded": now.toLocaleDateString(),
    "Module Sessions Left": sessionsLeft.value,
  });
  await client.chat.postMessage({
    channel: body.user.id,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🎉 Session Completed!*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Date recorded* ${now.toLocaleDateString("en-US")} in *${doc.title
            }*`,
        },
      },
    ],
  });
});

module.exports.handler = async (event, context, callback) => {
  const handler = await app.start();
  return handler(event, context, callback);
};
