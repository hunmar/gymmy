const functions = require("firebase-functions");
const {Composer, Markup, Scenes, Telegraf} = require("telegraf");

const firestoreSession = require("telegraf-session-firestore");
const {Firestore} = require("@google-cloud/firestore");
// console.log(process.env);
const {
  FUNCTION_TARGET = "mainFunc",
  GCLOUD_PROJECT,
  REGION = "europe-west1",
  NODE_ENV,
} = process.env;
const BOT_TOKEN =
  NODE_ENV !== "production" ?
    functions.config().telegram.token.development :
    functions.config().telegram.token.production;

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
    "beginning",
    (ctx) => {
      ctx.wizard.state.contactData = {};
      console.log("KWK", ctx.wizard.state);

      ctx.reply(
          "Привет! Я Сашин бот. Я тебя ещё не знаю. Представься, пожалуйтса",
      );
      console.log("1");
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (ctx.message.text.length < 2) {
        ctx.reply("Please enter name for real");
        return;
      }
      ctx.wizard.state.contactData.name = ctx.message.text;
      await ctx.reply(`О, привет, ${ctx.wizard.state.contactData.name}`);
      ctx.reply("А теперь дай я у тебя стрельну телефончик");
      return ctx.wizard.next();
    },
    async (ctx) => {
      ctx.wizard.state.contactData.phone = ctx.message.text;

      console.log("KEEEKEKEKE", ctx.wizard.state);

      await db
          .collection("users")
          .doc(String(ctx.update.message.from.id))
          .set({
            name: ctx.wizard.state.contactData.name,
            phone: ctx.wizard.state.contactData.phone,
          })
          .then(() => {
            console.log("Document successfully written!");
          })
          .catch((error) => {
            console.error("Error writing document: ", error);
          });
      ctx.reply("Спасибо, записал и взял на тебя кредит!");
      ctx.reply(
          "Что хочешь делать дальше?",
          Markup.inlineKeyboard([
            Markup.button.url("Качаться!", "https://t.me/rezalut7"),
          ]),
      );
      // await mySendContactDataMomentBeforeErase(ctx.wizard.state.contactData);
      // return ctx.scene.leave();
      return await ctx.scene.leave();
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

const stage = new Scenes.Stage([superWizard]);

bot.use(firestoreSession(db.collection("sessions")));
bot.use(stage.middleware());
bot.command("start", (ctx) => {
  console.log("KEEEEEEEEEEEEEEEEEK", ctx.session);
  ctx.scene.enter("beginning");
});

// bot.startPolling();
// bot.launch({
//   dropPendingUpdates: true,
// });

// bot.telegram.setWebhook(
//     `https://cloudfunctions.net/${FUNCTION_NAME}`,
// );

let webHookUrl;

if (NODE_ENV !== "production") {
  const localtunnel = require("localtunnel");
  (async () => {
    const tunnel = await localtunnel({port: 5001});
    const tunnelUrl = tunnel.url;

    console.log("TEEEST", tunnel.url);
    console.log("STARTED");

    webHookUrl = `${tunnelUrl}/${GCLOUD_PROJECT}/${REGION}/${FUNCTION_TARGET}`;

    console.log(webHookUrl);

    bot.telegram.setWebhook(webHookUrl);

    console.log(webHookUrl); 
  })();
} else {
  console.log("STARTED");

  webHookUrl = `https://${REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/${FUNCTION_TARGET}`;

  console.log(webHookUrl);

  bot.telegram.setWebhook(webHookUrl);

  console.log(webHookUrl);
}

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
exports[FUNCTION_TARGET] = functions
    .region(REGION)
    .https.onRequest(async (request, response) => {
      functions.logger.log("Incoming message", request.body);
      try {
        await bot.handleUpdate(request.body);
      } finally {
        response.status(200).end();
      }
    });
