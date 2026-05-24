/**
 * Default English i18n bag that eXeLearning's crossword runtime expects
 * under the `msgs` key in its decrypted DataGame JSON.
 *
 * Source: `public/files/perm/idevices/base/crossword/edition/crossword.js`
 * — `refreshTranslations` (line ~36) + `setMessagesInfo` (line ~137).
 * The runtime reads these strings to render every UI label; if `msgs`
 * is missing or partial the editor refuses to load the activity.
 *
 * Authors can localize after import — these defaults are just enough to
 * make the iDevice openable in eXe.
 */
export const CROSSWORD_DEFAULT_MSGS: Record<string, string> = {
  msgReply: "Reply",
  msgEnterCode: "Enter the access code",
  msgErrorCode: "The access code is not correct",
  msgIndicateWord: "Provide a word or phrase",
  msgClue: "Cool! The clue is:",
  msgCodeAccess: "Access code",
  msgRequiredAccessKey: "Access code required",
  msgInformationLooking: "Cool! The information you were looking for",
  msgPlayStart: "Click here to play",
  msgErrors: "Errors",
  msgHits: "Hits",
  msgScore: "Score",
  msgWeight: "Weight",
  msgMinimize: "Minimize",
  msgMaximize: "Maximize",
  msgTime: "Time Limit (mm:ss)",
  msgFullScreen: "Full Screen",
  msgExitFullScreen: "Exit Full Screen",
  msgNumQuestions: "Number of questions",
  msgNoImage: "No picture question",
  msgCool: "Cool!",
  mgsAllQuestions: "Questions completed!",
  msgSuccesses: "Right! | Excellent! | Great! | Very good! | Perfect!",
  msgFailures: "It was not that! | Incorrect! | Not correct! | Sorry! | Error!",
  msgTryAgain: "You need at least %s% of correct answers to get the information. Please try again.",
  msgWrote: "Write the correct word and click on Reply. If you hesitate, click on Move on.",
  msgEndGameScore: "Please start the game before saving your score.",
  msgScoreScorm: "The score can't be saved because this page is not part of a SCORM package.",
  msgOnlySaveScore: "You can only save the score once!",
  msgOnlySave: "You can only save once",
  msgInformation: "Information",
  msgYouScore: "Your score",
  msgAuthor: "Authorship",
  msgOnlySaveAuto: "Your score will be saved after each question. You can only play once.",
  msgSaveAuto: "Your score will be automatically saved after each question.",
  msgSeveralScore: "You can save the score as many times as you want",
  msgYouLastScore: "The last score saved is",
  msgActityComply: "You have already done this activity.",
  msgPlaySeveralTimes: "You can do this activity as many times as you want",
  msgClose: "Close",
  msgLoading: "Loading. Please wait...",
  msgPoints: "points",
  msgAudio: "Audio",
  msgCorrect: "Correct",
  msgIncorrect: "Incorrect",
  msgUncompletedActivity: "Incomplete activity",
  msgSuccessfulActivity: "Activity: Passed. Score: %s",
  msgUnsuccessfulActivity: "Activity: Not passed. Score: %s",
  msgTypeGame: "Crossword",
  msgCheck: "Check",
  msgShowSolution: "Show solutions",
  msgReboot: "Play Again",
  msgGameOver: "The game is over. You scored %s. Hits: %s out of %s.",
  msgSelectWord: "Click on a word’s square to see the definition",
  msgHorizontals: "Horizontals",
  msgVerticals: "Verticals",
  msgShowDefinitions: "Show/hide definitions",
  msgShowBack: "Show/hide background image",
  msgSolutionWord: "Word",
  // Added by setMessagesInfo():
  msgEProvideDefinition: "You must provide a definition, an image, and/or an audio for the word",
  msgESelectFile: "The selected file does not contain a valid game",
  msgEProvideWord: "Provide a word",
  msgEOneQuestion: "The crossword must have at least two words",
  msgProvideFB: "Message to display when passing the game",
  msgNoSuportBrowser: "Your browser is not compatible with this tool.",
  msgMaximeSize: "The word cannot contain more than fourteen characters or white spaces"
};
