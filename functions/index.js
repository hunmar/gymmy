const functions = require("firebase-functions");
const {Composer, Markup, Scenes, Telegraf} = require("telegraf");

const firestoreSession = require("telegraf-session-firestore");
const {Firestore} = require("@google-cloud/firestore");
// console.log(process.env);
const {
  FUNCTION_TARGET = "echoBot",
  GCLOUD_PROJECT,
  REGION = "us-central1",
  NODE_ENV,
} = process.env;
const BOT_TOKEN = functions.config().telegram.token;

const db = new Firestore({
  projectId: "gymmy-903a8",
  keyFilePath: "firestore-keyfile.json",
});

const stepHandler = new Composer();

stepHandler.action("sure", async (ctx) => {
  console.log("sure");
  await ctx.reply(
      "Вот и славно!",
      Markup.inlineKeyboard([Markup.button.callback("Да!", "next")]),
  );
  return ctx.wizard.next();
});

stepHandler.action("next", (ctx) => {
  console.log("next");
  return ctx.wizard.next();
});

stepHandler.action("wat", async (ctx) => {
  await ctx.reply(
      "Затем!",
      Markup.inlineKeyboard([Markup.button.callback("Уговорил!", "next")]),
  );
  return ctx.wizard.next();
});

const superWizard = new Scenes.WizardScene(
    "super-wizard",
    async (ctx) => {
      await ctx.reply(
          "Привет! Хочешь подкачаться?",
          Markup.inlineKeyboard([
            Markup.button.callback("Зачем?", "wat"),
            Markup.button.callback("Да!", "sure"),
          ]),
      );
      console.log("1");
      return ctx.wizard.next();
    },
    stepHandler,
    async (ctx) => {
      await ctx.reply(
          "Вот тебе к нему тогда",
          Markup.inlineKeyboard([
            Markup.button.url(
                "Саша-мастер-над-твоей-бицухой",
                "https://t.me/rezalut7",
            ),
          ]),
      );
      return await ctx.scene.leave();
    },
);

const bot = new Telegraf(BOT_TOKEN);

const stage = new Scenes.Stage([superWizard], {
  default: "super-wizard",
});

bot.use(firestoreSession(db.collection("sessions")));
bot.use(stage.middleware());
bot.command("start", (ctx) => ctx.scene.enter("super-wizard"));

// bot.startPolling();
// bot.launch({
//   dropPendingUpdates: true,
// });

// bot.telegram.setWebhook(
//     `https://cloudfunctions.net/${FUNCTION_NAME}`,
// );

console.log("STARTED");

let webHookUrl = `https://2eaeecd92c28.ngrok.io/${GCLOUD_PROJECT}/${REGION}/${FUNCTION_TARGET}`;

if (NODE_ENV === "production") {
  webHookUrl = `https://${REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/${FUNCTION_TARGET}`;
}

bot.telegram.setWebhook(
    webHookUrl,
);

console.log(
    webHookUrl,
);

// error handling
bot.catch((err, ctx) => {
  functions.logger.error("[Bot] Error", err);
  return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err);
});
// bot.start((ctx) => ctx.wizard.start())


// initialize the commands
// bot.command("/start", (ctx) => ctx.reply("Привет! Хочешь подкачаться?"));
// copy every message and send to the user
// bot.on("message", (ctx) => ctx.telegram.sendCopy(ctx.chat.id, ctx.message));

// handle all telegram updates with HTTPs trigger
exports.echoBot = functions.https.onRequest(async (request, response) => {
  functions.logger.log("Incoming message", request.body);
  try {
    await bot.handleUpdate(request.body);
  } finally {
    response.status(200).end();
  }
});
